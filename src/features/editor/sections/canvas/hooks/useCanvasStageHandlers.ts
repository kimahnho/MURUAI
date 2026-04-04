/**
 * 캔버스 스테이지 포인터/휠/선택 입력 핸들러를 조합해 상위 컴포넌트에 제공하는 훅.
 */
import {
  useCallback,
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

export const useCanvasStageHandlers = ({
  selectedPageId,
  setPages,
  beginTransaction,
  commitTransaction,
}: CanvasStageHandlersParams) => {
  const handleElementsChange = useCallback(
    (nextElements: CanvasElement[]) => {
      setPages((prevPages) => {
        const targetPage = prevPages.find((page) => page.id === selectedPageId);
        if (!targetPage) return prevPages;
        if (targetPage.elements === nextElements) return prevPages;
        return updatePageById(prevPages, selectedPageId, (page) => ({
          ...page,
          elements: nextElements,
        }));
      });
    },
    [selectedPageId, setPages]
  );

  const handleInteractionChange = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        beginTransaction();
      } else {
        commitTransaction("Element interaction");

        // 드래그 종료 시 워크시트 컴포넌트 오토레이아웃 재계산
        // 요소를 드래그해서 Y좌표가 바뀌면, 새 Y순서로 insertedComponents 배열 재정렬 + reflow
        const { insertedComponents } = useWorksheetElementStore.getState();
        if (insertedComponents.length < 2) return;

        setPages((prevPages) => {
          const page = prevPages.find((p) => p.id === selectedPageId);
          if (!page) return prevPages;

          // 각 컴포넌트의 현재 최소 Y좌표 계산
          const compYMap: { compId: string; minY: number }[] = [];
          for (const comp of insertedComponents) {
            const idSet = new Set(comp.elementIds);
            let minY = Infinity;
            for (const el of page.elements) {
              if (idSet.has(el.id) && "y" in el) {
                const y = (el as { y: number }).y;
                if (y < minY) minY = y;
              }
            }
            compYMap.push({ compId: comp.id, minY: minY === Infinity ? 0 : minY });
          }

          // Y순으로 정렬
          compYMap.sort((a, b) => a.minY - b.minY);
          const newOrder = compYMap.map((c) => c.compId);
          const oldOrder = insertedComponents.map((c) => c.id);

          // 순서가 바뀌었으면 스토어 재정렬 + reflow
          const orderChanged = newOrder.some((id, i) => id !== oldOrder[i]);
          if (!orderChanged) return prevPages;

          // 스토어 배열을 새 순서로 재정렬
          const reordered = newOrder.map((id) => insertedComponents.find((c) => c.id === id)!);
          useWorksheetElementStore.setState({ insertedComponents: reordered });

          // reflow
          const { elements: reflowedElements, updatedElementIds } = reflowWorksheetComponents(
            page.elements,
            reordered.map((c) => ({ id: c.id, elementIds: c.elementIds })),
          );

          // elementIds 동기화
          for (const [compId, newIds] of updatedElementIds) {
            useWorksheetElementStore.getState().updateElementIds(compId, newIds);
          }

          // 페이지에 worksheetComponents도 동기화
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
    [beginTransaction, commitTransaction, selectedPageId, setPages]
  );

  return { handleElementsChange, handleInteractionChange };
};
