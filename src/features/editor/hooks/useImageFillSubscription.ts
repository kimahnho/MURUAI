/**
 * 이미지 채우기 요청을 구독해 대상 요소의 배경/이미지 상태를 갱신하는 훅.
 */
import type { Dispatch, SetStateAction } from "react";
import { useImageFillStore } from "../store/imageFillStore";
import type { Page } from "../model/pageTypes";
import type { ShapeElement } from "../model/canvasTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { bumpPageRevision } from "../utils/pageRevision";
import {
  calculateCoverImageBox,
  findLabelElementId,
  getNextAacCardId,
  getNextAacCardV2Id,
  getNextEmotionCardId,
  isAacCardElement,
  isAacCardV2Element,
  isAacLabelElement,
  isEmotionCardV2Element,
  isEmotionInferenceCard,
  isEmotionLabelElement,
} from "../utils/imageFillUtils";
import { isEmotionSlotShape } from "../utils/designPaperUtils";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updatePageById } from "../utils/pageMutation";

type ImageFillSubscriptionParams = {
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  selectedIdsRef: ReadonlyRef<string[]>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
};

export const useImageFillSubscription = ({
  pagesRef,
  selectedPageIdRef,
  selectedIdsRef,
  setPages,
  setSelectedIds,
  setEditingTextId,
}: ImageFillSubscriptionParams) => {
  useStoreSubscription({
    subscribe: useImageFillStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.imageUrl),
    onChange: (state) => {
      if (!state.imageUrl) return;
      const shouldForceInsert = state.forceInsert === true;
      const activePageId = selectedPageIdRef.current;
      const activePage = pagesRef.current.find(
        (page) => page.id === activePageId
      );
      const baseSelectedIds = selectedIdsRef.current;
      const hasFillableSelection =
        shouldForceInsert &&
        activePage &&
        baseSelectedIds.some((id) => {
          const element = activePage.elements.find((item) => item.id === id);
          if (!element) return false;
          // imageSlot은 어휘 카드의 이미지 삽입 박스로 직접 채울 수 있다.
          if (
            (element.type === "rect" ||
              element.type === "roundRect" ||
              element.type === "ellipse" ||
              element.type === "mosaic" ||
              element.type === "circleMosaic") &&
            (element as { subType?: string }).subType === "imageSlot"
          ) {
            return true;
          }
          return (
            isAacCardV2Element(element) ||
            isEmotionCardV2Element(element) ||
            isEmotionInferenceCard(element) ||
            isEmotionSlotShape(element) ||
            isAacCardElement(activePage.elements, element)
          );
        });
      const activeSelectedIds =
        shouldForceInsert && !hasFillableSelection ? [] : baseSelectedIds;
      const normalizedUrl =
        state.imageUrl.startsWith("url(") || state.imageUrl.startsWith("data:")
          ? state.imageUrl
          : `url(${state.imageUrl})`;
      const labelText = state.label?.trim();

      if (activeSelectedIds.length === 0) {
        // 강제 삽입 요청인데 선택된 카드가 없으면 새 이미지를 생성해
        // 입력 의도를 버리지 않고 바로 편집 가능한 상태로 전환한다.
        const newElementId = crypto.randomUUID();
        const defaultWidth = state.width ?? 200;
        const defaultHeight =
          state.height ?? Math.round(defaultWidth * (240 / 200));
        const newImageElement: ShapeElement = {
          id: newElementId,
          type: "rect",
          x: 100,
          y: 100,
          w: defaultWidth,
          h: defaultHeight,
          fill: normalizedUrl,
          imageBox: {
            x: 0,
            y: 0,
            w: defaultWidth,
            h: defaultHeight,
          },
          isStandaloneImage: true,
        };

        setPages((prevPages) =>
          updatePageById(prevPages, activePageId, (page) =>
            bumpPageRevision({
              ...page,
              elements: [...page.elements, newImageElement],
            }),
          ),
        );

        // 그림 탭(감정/AAC/이미지 상징)에서 삽입 시 자동 선택하지 않음
        const skipAutoSelect =
          state.source === "emotion" ||
          state.source === "aac" ||
          state.source === "library";
        if (!skipAutoSelect) {
          setSelectedIds([newElementId]);
        }
        if (shouldForceInsert) {
          setEditingTextId(null);
        }
        return;
      }

      setPages((prevPages) =>
        updatePageById(prevPages, activePageId, (page) => {
          let hasChanges = false;
          const selectedIdSet = new Set(activeSelectedIds);
          const labelUpdates = new Map<string, string>();
          if (labelText) {
            page.elements.forEach((element) => {
              if (
                (element.type === "rect" ||
                  element.type === "roundRect" ||
                  element.type === "ellipse" ||
                  element.type === "mosaic" ||
              element.type === "circleMosaic") &&
                selectedIdSet.has(element.id)
              ) {
                if (element.labelId) {
                  // 사용자가 직접 입력한 라벨은 보존 — 디폴트 텍스트일 때만 덮어쓴다
                  const linkedLabel = page.elements.find(
                    (el) => el.id === element.labelId
                  );
                  const currentText = linkedLabel && "text" in linkedLabel ? (linkedLabel as { text: string }).text : "";
                  const DEFAULT_LABELS = ["목표 어휘", "단어", "(감정)"];
                  const isDefaultLabel = !currentText || currentText.trim() === "" || DEFAULT_LABELS.includes(currentText.trim());
                  if (isDefaultLabel) {
                    labelUpdates.set(element.labelId, labelText);
                  }
                } else {
                  const aacLabelId = findLabelElementId(
                    page.elements,
                    element,
                    isAacLabelElement
                  );
                  if (aacLabelId) {
                    labelUpdates.set(aacLabelId, labelText);
                  }
                  const emotionLabelId = findLabelElementId(
                    page.elements,
                    element,
                    isEmotionLabelElement
                  );
                  if (emotionLabelId) {
                    labelUpdates.set(emotionLabelId, labelText);
                  }
                }
              }
            });
          }
          const nextElements = page.elements.map((element) => {
            if (!selectedIdSet.has(element.id)) return element;
            // aacCard/emotionCard(v2) 복합 요소: 이미지 + 라벨을 한 요소 안에서 처리
            if (element.type === "aacCard" || element.type === "emotionCard") {
              if (element.locked) return element;
              hasChanges = true;
              const baseImageBox = element.imageBox ??
                calculateCoverImageBox(element.w, element.h, state.width, state.height);
              return {
                ...element,
                fill: normalizedUrl,
                imageBox: baseImageBox,
                ...(labelText ? { label: { ...element.label, text: labelText } } : {}),
              };
            }
            if (
              element.type !== "rect" &&
              element.type !== "roundRect" &&
              element.type !== "ellipse" &&
              element.type !== "mosaic" &&
              element.type !== "circleMosaic"
            ) {
              return element;
            }
            if (element.locked) {
              return element;
            }
            hasChanges = true;
            // 이미지 박스가 없는 레거시 요소도 동일한 채우기 규칙을 적용해
            // 템플릿/신규 요소 간 보이는 결과를 맞춘다.
            const baseImageBox = element.imageBox ??
              calculateCoverImageBox(element.w, element.h, state.width, state.height);
            const isAacCard = isAacCardElement(page.elements, element);
            // AAC 카드는 라벨 영역을 고려해 이미지를 위로 5px 올린다.
            const nextImageBox = isAacCard
              ? { ...baseImageBox, y: baseImageBox.y - 5 }
              : baseImageBox;
            const shouldClearPlaceholder =
              (isEmotionSlotShape(element) &&
                typeof element.text === "string" &&
                element.text.trim() === "감정을 선택해주세요") ||
              ((element as { subType?: string }).subType === "imageSlot" &&
                typeof element.text === "string" &&
                element.text.trim().length > 0);
            return {
              ...element,
              fill: normalizedUrl,
              imageBox: nextImageBox,
              text: shouldClearPlaceholder ? "" : element.text,
            };
          });
          if (labelUpdates.size === 0) {
            return hasChanges ? bumpPageRevision({ ...page, elements: nextElements }) : page;
          }
          const nextElementsWithLabels = nextElements.map((element) => {
            const nextLabel = labelUpdates.get(element.id);
            if (!nextLabel) return element;
            if (element.type !== "text") return element;
            hasChanges = true;
            return {
              ...element,
              text: nextLabel,
              richText: nextLabel,
            };
          });
          return hasChanges
            ? bumpPageRevision({
                ...page,
                elements: nextElementsWithLabels,
              })
            : page;
        }),
      );

      if (activeSelectedIds.length === 1) {
        const activePage = pagesRef.current.find(
          (page) => page.id === activePageId
        );
        const selectedId = activeSelectedIds[0];
        const selectedElement = activePage?.elements.find(
          (element) => element.id === selectedId
        );
        if (activePage && selectedElement) {
          const activeTemplateId = activePage.templateId ?? null;
          const isEmotionTemplate =
            activeTemplateId === "emotionInference" ||
            activeTemplateId === "emotionWorksheet";
          const isAacTemplate = activeTemplateId === "aacBoard";
          const isAacV2Template = activeTemplateId === "aacBoardV2";

          if (isEmotionTemplate && isEmotionInferenceCard(selectedElement)) {
            const nextEmotionId = getNextEmotionCardId(
              activePage.elements,
              selectedId
            );
            if (nextEmotionId) {
              setSelectedIds([nextEmotionId]);
              setEditingTextId(null);
            }
          } else if (
            isAacV2Template &&
            isAacCardV2Element(selectedElement)
          ) {
            const nextAacId = getNextAacCardV2Id(
              activePage.elements,
              selectedId
            );
            if (nextAacId) {
              setSelectedIds([nextAacId]);
              setEditingTextId(null);
            }
          } else if (
            isAacTemplate &&
            isAacCardElement(activePage.elements, selectedElement)
          ) {
            const nextAacId = getNextAacCardId(
              activePage.elements,
              selectedId
            );
            if (nextAacId) {
              setSelectedIds([nextAacId]);
              setEditingTextId(null);
            }
          }
        }
      }
    },
    deps: [
      pagesRef,
      selectedPageIdRef,
      selectedIdsRef,
      setPages,
      setSelectedIds,
      setEditingTextId,
    ],
  });
};
