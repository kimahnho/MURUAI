/**
 * 이미지 채우기 요청을 구독해 대상 요소의 배경/이미지 상태를 갱신하는 훅.
 */
import type { Dispatch, SetStateAction } from "react";
import { useImageFillStore } from "../store/imageFillStore";
import type { Page } from "../model/pageTypes";
import type { ShapeElement } from "../model/canvasTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { bumpPageRevision } from "../utils/pageRevision";
import { useWorksheetElementStore } from "../store/worksheetElementStore";
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
      // 커버 페이지에서는 이미지 채우기 차단
      if (activePage?.coverData) return;
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
          // imageSlot의 labelId로 연결된 가이드 텍스트를 이미지 삽입 시 클리어
          // (라벨 텍스트가 있으면 그 값으로, 없으면 빈 문자열로 교체)
          page.elements.forEach((element) => {
            if (
              (element.type === "rect" || element.type === "roundRect" || element.type === "ellipse" || element.type === "mosaic" || element.type === "circleMosaic") &&
              selectedIdSet.has(element.id) &&
              (element as { subType?: string }).subType === "imageSlot" &&
              element.labelId
            ) {
              labelUpdates.set(element.labelId, labelText || "");
            }
          });

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
            const isImageSlot = (element as { subType?: string }).subType === "imageSlot";
            return {
              ...element,
              fill: normalizedUrl,
              imageBox: nextImageBox,
              text: shouldClearPlaceholder ? "" : element.text,
              // imageSlot: 이미지 삽입 시 점선 테두리 제거
              ...(isImageSlot && element.border ? { border: { ...element.border, enabled: false } } : {}),
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

      // 워크시트 단어 카드 config 역동기화 — 이미지+라벨을 config.items에 저장
      {
        try {
          const { insertedComponents } = useWorksheetElementStore.getState();
          const pageNow = pagesRef.current.find((p) => p.id === activePageId);
          if (pageNow) {
            for (const comp of insertedComponents) {
              if (comp.type !== "grid_NxM") continue;
              const config = comp.config as { items?: { text: string; text_highlight: string; imageUrl?: string; imageBox?: { x: number; y: number; w: number; h: number } }[] };
              if (!config.items) continue;
              const compElementIds = new Set(comp.elementIds);
              const compElements = pageNow.elements.filter((el) => compElementIds.has(el.id));
              let slotIndex = 0;
              let changed = false;
              for (const el of compElements) {
                if ("subType" in el && (el as { subType?: string }).subType === "imageSlot") {
                  if (activeSelectedIds.includes(el.id) && config.items[slotIndex]) {
                    // 이미지 URL + imageBox + 라벨 텍스트 모두 config에 저장
                    config.items[slotIndex] = {
                      ...config.items[slotIndex],
                      ...(labelText ? { text: labelText } : {}),
                      imageUrl: normalizedUrl,
                      imageBox: (el as import("../model/canvasTypes").ShapeElement).imageBox
                        ? undefined // 아직 삽입 전이므로 calculateCoverImageBox 결과를 사용
                        : undefined,
                    };
                    // setPages 완료 후 imageBox를 다시 읽어야 하므로 setTimeout으로 지연
                    const capturedSlotIndex = slotIndex;
                    const capturedCompId = comp.id;
                    setTimeout(() => {
                      const latestPage = pagesRef.current.find((p) => p.id === activePageId);
                      if (!latestPage) return;
                      const latestComps = useWorksheetElementStore.getState().insertedComponents;
                      const latestComp = latestComps.find((c) => c.id === capturedCompId);
                      if (!latestComp) return;
                      const latestConfig = latestComp.config as typeof config;
                      if (!latestConfig.items?.[capturedSlotIndex]) return;
                      const latestCompElements = latestPage.elements.filter((e) => new Set(latestComp.elementIds).has(e.id));
                      let si = 0;
                      for (const e of latestCompElements) {
                        if ("subType" in e && (e as { subType?: string }).subType === "imageSlot") {
                          if (si === capturedSlotIndex) {
                            const shape = e as import("../model/canvasTypes").ShapeElement;
                            latestConfig.items[capturedSlotIndex] = {
                              ...latestConfig.items[capturedSlotIndex],
                              imageUrl: shape.fill,
                              imageBox: shape.imageBox,
                            };
                            useWorksheetElementStore.getState().updateComponentConfigSilent(capturedCompId, { ...latestComp.config });
                            break;
                          }
                          si++;
                        }
                      }
                    }, 200);
                    changed = true;
                  }
                  slotIndex++;
                }
              }
              if (changed) {
                useWorksheetElementStore.getState().updateComponentConfigSilent(comp.id, { ...comp.config });
              }
            }
          }
        } catch { /* 테스트 단계 */ }
      }

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
          } else if (
            (selectedElement as { subType?: string }).subType === "imageSlot" &&
            selectedElement.worksheetMeta
          ) {
            // 워크시트 단어 카드: 다음 imageSlot으로 자동 이동
            const compId = selectedElement.worksheetMeta.componentId;
            const slots = activePage.elements.filter(
              (el) => el.worksheetMeta?.componentId === compId &&
                (el as { subType?: string }).subType === "imageSlot" &&
                el.id !== selectedId
            );
            // X→Y 순서 정렬 (열 우선)
            const tolerance = 8;
            slots.sort((a, b) => {
              const ay = (a as { y: number }).y, by = (b as { y: number }).y;
              const ax = (a as { x: number }).x, bx = (b as { x: number }).x;
              if (Math.abs(ay - by) > tolerance) return ay - by;
              return ax - bx;
            });
            // 현재 슬롯의 다음 슬롯 찾기
            const allSlots = activePage.elements.filter(
              (el) => el.worksheetMeta?.componentId === compId &&
                (el as { subType?: string }).subType === "imageSlot"
            ).sort((a, b) => {
              const ay = (a as { y: number }).y, by = (b as { y: number }).y;
              const ax = (a as { x: number }).x, bx = (b as { x: number }).x;
              if (Math.abs(ay - by) > tolerance) return ay - by;
              return ax - bx;
            });
            const currentIdx = allSlots.findIndex((el) => el.id === selectedId);
            if (currentIdx >= 0 && currentIdx < allSlots.length - 1) {
              setSelectedIds([allSlots[currentIdx + 1].id]);
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
