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
import { reflowWorksheetComponents, Y_FREE_TYPES } from "../../../utils/buildWorksheetPage";

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

/**
 * 컴포넌트 배열을 Y좌표 순으로 정렬하되,
 * Y_FREE 컴포넌트는 원래 배열 인덱스를 유지한다 (순서 뒤바뀜 방지).
 */
const sortCompsPreservingYFree = (
  comps: { id: string; type?: string }[],
  elements: CanvasElement[],
  getElementIds: (id: string) => string[],
): string[] => {
  // Y_FREE 컴포넌트의 원래 인덱스를 기록
  const yFreeSlots = new Map<number, string>(); // index → compId
  const sortable: { id: string; minY: number }[] = [];

  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    if (c.type && Y_FREE_TYPES.has(c.type)) {
      yFreeSlots.set(i, c.id);
    } else {
      sortable.push({ id: c.id, minY: getCompMinY(elements, getElementIds(c.id)) });
    }
  }

  // 일반 컴포넌트만 Y순 정렬
  sortable.sort((a, b) => a.minY - b.minY);

  // 결과 배열에 Y_FREE는 원래 인덱스에, 나머지는 빈 슬롯에 순서대로 삽입
  const result: string[] = new Array(comps.length);
  for (const [idx, id] of yFreeSlots) {
    result[idx] = id;
  }
  let sortIdx = 0;
  for (let i = 0; i < result.length; i++) {
    if (result[i] === undefined) {
      result[i] = sortable[sortIdx++].id;
    }
  }
  return result;
};

export const useCanvasStageHandlers = ({
  selectedPageId,
  setPages,
  beginTransaction,
  commitTransaction,
}: CanvasStageHandlersParams) => {
  // 드래그/리사이즈 중 reflow 관련
  const lastOrderRef = useRef<string[] | null>(null);
  const isDraggingRef = useRef(false);
  const reflowThrottleRef = useRef<number | null>(null);
  const draggingCompIdRef = useRef<string | null>(null);
  const latestElementsRef = useRef<CanvasElement[] | null>(null);

  const handleElementsChange = useCallback(
    (nextElements: CanvasElement[]) => {
      setPages((prevPages) => {
        const targetPage = prevPages.find((page) => page.id === selectedPageId);
        if (!targetPage) return prevPages;
        if (targetPage.elements === nextElements) return prevPages;

        // 드래그/리사이즈 중이면 실시간 reflow 스케줄
        if (isDraggingRef.current) {
          // 최신 요소 상태를 ref에 캐싱 — 쓰로틀 콜백에서 사용
          latestElementsRef.current = nextElements;

          const { insertedComponents } = useWorksheetElementStore.getState();
          if (insertedComponents.length >= 2 && reflowThrottleRef.current === null) {
            reflowThrottleRef.current = requestAnimationFrame(() => {
              reflowThrottleRef.current = null;

              const currentElements = latestElementsRef.current;
              if (!currentElements) return;

              const comps = useWorksheetElementStore.getState().insertedComponents;
              if (comps.length < 2) return;

              // 조작 중인 컴포넌트 감지
              if (!draggingCompIdRef.current) {
                for (const comp of comps) {
                  const idSet = new Set(comp.elementIds);
                  for (const el of currentElements) {
                    if (idSet.has(el.id) && el.worksheetMeta) {
                      draggingCompIdRef.current = comp.id;
                      useWorksheetElementStore.getState().setDraggingWorksheet(true);
                      break;
                    }
                  }
                  if (draggingCompIdRef.current) break;
                }
              }

              // 최신 요소 상태 기준으로 Y순서 계산 + reflow (Y_FREE는 순서 고정)
              const newOrder = sortCompsPreservingYFree(
                comps, currentElements, (id) => comps.find((c) => c.id === id)!.elementIds,
              );
              lastOrderRef.current = newOrder;

              const reordered = newOrder.map((id) => comps.find((c) => c.id === id)!);
              useWorksheetElementStore.setState({ insertedComponents: reordered });

              // 최신 요소 상태로 reflow — 리사이즈 크기 변화가 즉시 반영됨
              const { elements: reflowedElements, updatedElementIds } =
                reflowWorksheetComponents(
                  currentElements,
                  reordered.map((c) => ({ id: c.id, type: c.type, elementIds: c.elementIds })),
                );

              for (const [compId, newIds] of updatedElementIds) {
                useWorksheetElementStore.getState().updateElementIds(compId, newIds);
              }

              setPages((pages) =>
                updatePageById(pages, selectedPageId, (p) => ({
                  ...p,
                  elements: reflowedElements,
                })),
              );
            });
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

        // rAF 정리
        if (reflowThrottleRef.current !== null) {
          cancelAnimationFrame(reflowThrottleRef.current);
          reflowThrottleRef.current = null;
        }

        commitTransaction("Element interaction");

        // 최종 reflow — 드롭 후 정확한 위치 보정
        const { insertedComponents } = useWorksheetElementStore.getState();
        if (insertedComponents.length === 0) return;

        setPages((prevPages) => {
          const page = prevPages.find((p) => p.id === selectedPageId);
          if (!page) return prevPages;

          const newOrder = sortCompsPreservingYFree(
            insertedComponents, page.elements, (id) => insertedComponents.find((c) => c.id === id)!.elementIds,
          );
          const oldOrder = insertedComponents.map((c) => c.id);

          const orderChanged = newOrder.some((id, i) => id !== oldOrder[i]);
          if (!orderChanged) {
            // 순서는 안 바뀌었지만 간격 정리 + 중앙정렬을 위해 reflow
            const { elements: reflowedElements, updatedElementIds } =
              reflowWorksheetComponents(
                page.elements,
                insertedComponents.map((c) => ({ id: c.id, type: c.type, elementIds: c.elementIds })),
                undefined,
                true,
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
              reordered.map((c) => ({ id: c.id, type: c.type, elementIds: c.elementIds })),
              undefined,
              true,
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
