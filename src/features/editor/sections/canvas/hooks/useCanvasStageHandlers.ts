/**
 * 캔버스 스테이지 포인터/휠/선택 입력 핸들러를 조합해 상위 컴포넌트에 제공하는 훅.
 * 모든 워크시트 컴포넌트는 자유 배치 — 드래그/드롭 시 reflow(자동 스택) 없음.
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
    [selectedPageId, setPages],
  );

  const handleInteractionChange = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        beginTransaction();
      } else {
        useWorksheetElementStore.getState().setDraggingWorksheet(false);
        commitTransaction("Element interaction");

        // worksheetComponents 메타데이터를 페이지에 동기화 (위치 변경 반영)
        const { insertedComponents } = useWorksheetElementStore.getState();
        if (insertedComponents.length === 0) return;

        setPages((prevPages) => {
          const page = prevPages.find((p) => p.id === selectedPageId);
          if (!page) return prevPages;

          return updatePageById(prevPages, selectedPageId, (p) => ({
            ...p,
            worksheetComponents: insertedComponents.map((c) => ({
              id: c.id,
              type: c.type,
              config: c.config,
              elementIds: c.elementIds,
            })),
          }));
        });
      }
    },
    [beginTransaction, commitTransaction, selectedPageId, setPages],
  );

  return { handleElementsChange, handleInteractionChange };
};
