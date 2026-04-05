/**
 * 캔버스 스테이지 포인터/휠/선택 입력 핸들러를 조합해 상위 컴포넌트에 제공하는 훅.
 */
import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import type { Page } from "../../../model/pageTypes";
import { updatePageById } from "../../../utils/pageMutation";
import { useWorksheetElementStore } from "../../../store/worksheetElementStore";
import { reflowWorksheetComponents } from "../../../utils/buildWorksheetPage";

type CanvasStageHandlersParams = {
  selectedPageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
  beginTransaction: () => void;
  commitTransaction: (label?: string) => void;
};

/** 컴포넌트의 최소 Y좌표 계산 */
const getCompMinY = (elements: CanvasElement[], elementIds: string[]): number => {
  const idSet = new Set(elementIds);
  let minY = Infinity;
  for (const el of elements) {
    if (idSet.has(el.id) && "y" in el) {
      const y = (el as { y: number }).y;
      if (y < minY) minY = y;
    }
  }
  return minY === Infinity ? 0 : minY;
};

export const useCanvasStageHandlers = ({
  selectedPageId,
  setPages,
  beginTransaction,
  commitTransaction,
}: CanvasStageHandlersParams) => {
  // 드래그 중 순서 변경 감지용
  const lastOrderRef = useRef<string[] | null>(null);
  const isDraggingRef = useRef(false);
  const reflowThrottleRef = useRef<number | null>(null);
  const draggingCompIdRef = useRef<string | null>(null);

  const handleElementsChange = useCallback(
    (nextElements: CanvasElement[]) => {
      setPages((prevPages) => {
        const targetPage = prevPages.find((page) => page.id === selectedPageId);
        if (!targetPage) return prevPages;
        if (targetPage.elements === nextElements) return prevPages;

        // 드래그 중이면 실시간 reflow 스케줄
        if (isDraggingRef.current) {
          const { insertedComponents } = useWorksheetElementStore.getState();
          if (insertedComponents.length >= 2 && reflowThrottleRef.current === null) {
            reflowThrottleRef.current = window.setTimeout(() => {
              reflowThrottleRef.current = null;

              setPages((pages) => {
                const page = pages.find((p) => p.id === selectedPageId);
                if (!page) return pages;

                const comps = useWorksheetElementStore.getState().insertedComponents;
                if (comps.length < 2) return pages;

                // 드래그 중인 컴포넌트 감지 (Y좌표가 이전과 달라진 요소)
                if (!draggingCompIdRef.current) {
                  for (const comp of comps) {
                    const idSet = new Set(comp.elementIds);
                    for (const el of nextElements) {
                      if (idSet.has(el.id) && el.worksheetMeta) {
                        const prevEl = page.elements.find((pe) => pe.id === el.id);
                        if (prevEl && "y" in prevEl && "y" in el && (el as {y:number}).y !== (prevEl as {y:number}).y) {
                          draggingCompIdRef.current = comp.id;
                          useWorksheetElementStore.getState().setDraggingWorksheet(true);
                          break;
                        }
                      }
                    }
                    if (draggingCompIdRef.current) break;
                  }
                }

                // 현재 Y순서 계산
                const compYs = comps.map((c) => ({
                  id: c.id,
                  minY: getCompMinY(page.elements, c.elementIds),
                }));
                compYs.sort((a, b) => a.minY - b.minY);
                const newOrder = compYs.map((c) => c.id);

                // 순서 변화 없어도 reflow 실행 (리사이즈로 높이가 바뀔 수 있음)
                lastOrderRef.current = newOrder;

                // 스토어 배열 재정렬
                const reordered = newOrder.map((id) => comps.find((c) => c.id === id)!);
                useWorksheetElementStore.setState({ insertedComponents: reordered });

                // reflow — 드래그 중인 컴포넌트는 제외 (사용자가 자유롭게 이동 중)
                const { elements: reflowedElements, updatedElementIds } =
                  reflowWorksheetComponents(
                    page.elements,
                    reordered.map((c) => ({ id: c.id, elementIds: c.elementIds })),
                    draggingCompIdRef.current ?? undefined,
                  );

                for (const [compId, newIds] of updatedElementIds) {
                  useWorksheetElementStore.getState().updateElementIds(compId, newIds);
                }

                return updatePageById(pages, selectedPageId, (p) => ({
                  ...p,
                  elements: reflowedElements,
                }));
              });
            }, 200); // 200ms — CSS transition과 동기화
          }
        }

        return updatePageById(prevPages, selectedPageId, (page) => ({
          ...page,
          elements: nextElements,
        }));
      });
    },
    [selectedPageId, setPages],
  );

  const handleInteractionChange = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        isDraggingRef.current = true;
        lastOrderRef.current = null;
        draggingCompIdRef.current = null;
        beginTransaction();
      } else {
        isDraggingRef.current = false;
        draggingCompIdRef.current = null;
        useWorksheetElementStore.getState().setDraggingWorksheet(false);

        // 쓰로틀 타이머 정리
        if (reflowThrottleRef.current !== null) {
          clearTimeout(reflowThrottleRef.current);
          reflowThrottleRef.current = null;
        }

        commitTransaction("Element interaction");

        // 최종 reflow — 드롭 후 정확한 위치 보정
        const { insertedComponents } = useWorksheetElementStore.getState();
        if (insertedComponents.length < 2) return;

        setPages((prevPages) => {
          const page = prevPages.find((p) => p.id === selectedPageId);
          if (!page) return prevPages;

          const compYs = insertedComponents.map((c) => ({
            id: c.id,
            minY: getCompMinY(page.elements, c.elementIds),
          }));
          compYs.sort((a, b) => a.minY - b.minY);
          const newOrder = compYs.map((c) => c.id);
          const oldOrder = insertedComponents.map((c) => c.id);

          const orderChanged = newOrder.some((id, i) => id !== oldOrder[i]);
          if (!orderChanged) {
            // 순서는 안 바뀌었지만 간격 정리를 위해 reflow
            const { elements: reflowedElements, updatedElementIds } =
              reflowWorksheetComponents(
                page.elements,
                insertedComponents.map((c) => ({ id: c.id, elementIds: c.elementIds })),
              );
            for (const [compId, newIds] of updatedElementIds) {
              useWorksheetElementStore.getState().updateElementIds(compId, newIds);
            }
            const finalComps = useWorksheetElementStore.getState().insertedComponents;
            return updatePageById(prevPages, selectedPageId, (p) => ({
              ...p,
              elements: reflowedElements,
              worksheetComponents: finalComps.map((c) => ({
                id: c.id, type: c.type, config: c.config, elementIds: c.elementIds,
              })),
            }));
          }

          const reordered = newOrder.map((id) => insertedComponents.find((c) => c.id === id)!);
          useWorksheetElementStore.setState({ insertedComponents: reordered });

          const { elements: reflowedElements, updatedElementIds } =
            reflowWorksheetComponents(
              page.elements,
              reordered.map((c) => ({ id: c.id, elementIds: c.elementIds })),
            );
          for (const [compId, newIds] of updatedElementIds) {
            useWorksheetElementStore.getState().updateElementIds(compId, newIds);
          }
          const finalComps = useWorksheetElementStore.getState().insertedComponents;
          return updatePageById(prevPages, selectedPageId, (p) => ({
            ...p,
            elements: reflowedElements,
            worksheetComponents: finalComps.map((c) => ({
              id: c.id, type: c.type, config: c.config, elementIds: c.elementIds,
            })),
          }));
        });
      }
    },
    [beginTransaction, commitTransaction, selectedPageId, setPages],
  );

  return { handleElementsChange, handleInteractionChange };
};
