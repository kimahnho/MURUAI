import type { Dispatch, SetStateAction } from "react";
import { useImageFillStore } from "../store/imageFillStore";
import type { Page } from "../model/pageTypes";
import type { ShapeElement } from "../model/canvasTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { bumpPageRevision } from "../utils/pageRevision";
import {
  findLabelElementId,
  getNextAacCardId,
  getNextEmotionCardId,
  isAacCardElement,
  isAacLabelElement,
  isEmotionInferenceCard,
  isEmotionLabelElement,
} from "../utils/imageFillUtils";
import { isEmotionSlotShape } from "../utils/designPaperUtils";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updatePageById } from "../utils/pageMutation";

/**
 * "채우기(cover)" 방식으로 imageBox 계산
 * 이미지 비율을 유지하면서 요소를 완전히 채움 (잘림 발생 가능)
 */
const calculateCoverImageBox = (
  elementW: number,
  elementH: number,
  imageW: number | undefined,
  imageH: number | undefined
): { x: number; y: number; w: number; h: number } => {
  // 이미지 크기가 없으면 요소 크기 그대로 사용
  if (!imageW || !imageH) {
    return { x: 0, y: 0, w: elementW, h: elementH };
  }

  const elementRatio = elementW / elementH;
  const imageRatio = imageW / imageH;

  let boxW: number;
  let boxH: number;

  if (imageRatio > elementRatio) {
    // 이미지가 더 넓음 - 높이를 맞추고 좌우 잘림
    boxH = elementH;
    boxW = elementH * imageRatio;
  } else {
    // 이미지가 더 높음 - 너비를 맞추고 상하 잘림
    boxW = elementW;
    boxH = elementW / imageRatio;
  }

  // 중앙 정렬
  const x = (elementW - boxW) / 2;
  const y = (elementH - boxH) / 2;

  return { x, y, w: boxW, h: boxH };
};

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
          return (
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
        const newElementId = `element-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
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
        };

        setPages((prevPages) =>
          updatePageById(prevPages, activePageId, (page) =>
            bumpPageRevision({
              ...page,
              elements: [...page.elements, newImageElement],
            }),
          ),
        );

        setSelectedIds([newElementId]);
        if (shouldForceInsert) {
          setEditingTextId(null);
        }
        return;
      }

      setPages((prevPages) =>
        updatePageById(prevPages, activePageId, (page) => {
          let hasChanges = false;
          const labelUpdates = new Map<string, string>();
          if (labelText) {
            page.elements.forEach((element) => {
              if (
                (element.type === "rect" ||
                  element.type === "roundRect" ||
                  element.type === "ellipse") &&
                activeSelectedIds.includes(element.id)
              ) {
                if (element.labelId) {
                  labelUpdates.set(element.labelId, labelText);
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
            if (!activeSelectedIds.includes(element.id)) return element;
            if (
              element.type !== "rect" &&
              element.type !== "roundRect" &&
              element.type !== "ellipse"
            ) {
              return element;
            }
            if (element.locked) return element;
            hasChanges = true;
            // imageBox가 없는 레거시 요소도 동일한 채우기 규칙을 적용해
            // 템플릿/신규 요소 간 보이는 결과를 맞춘다.
            const baseImageBox = element.imageBox ??
              calculateCoverImageBox(element.w, element.h, state.width, state.height);
            const borderWidth =
              element.border?.enabled ? element.border.width : 0;
            const nextImageBox =
              borderWidth > 0 && isAacCardElement(page.elements, element)
                ? {
                    ...baseImageBox,
                    x: Math.round(
                      (Math.max(0, element.w - borderWidth * 2) -
                        baseImageBox.w) /
                        2
                    ),
                  }
                : baseImageBox;
            const shouldClearPlaceholder =
              isEmotionSlotShape(element) &&
              typeof element.text === "string" &&
              element.text.trim() === "감정을 선택해주세요";
            return {
              ...element,
              fill: normalizedUrl,
              imageBox: nextImageBox,
              text: shouldClearPlaceholder ? "" : element.text,
            };
          });
          if (labelUpdates.size === 0) {
            return hasChanges ? { ...page, elements: nextElements } : page;
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
