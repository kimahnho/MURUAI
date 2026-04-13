/**
 * 하단 페이지 썸네일 드래그 정렬 상호작용을 처리하는 훅.
 * 다중 선택된 페이지를 함께 드래그할 수 있도록 selectedPageIds를 전달받는다.
 */
import { useCallback, useEffect, useRef, type DragEvent as ReactDragEvent } from "react";
import { useDragAndDrop } from "../../../shared/hooks/useDragAndDrop";
import type { Page } from "../../../model/pageTypes";

type UseBottomBarDragParams = {
  pages: Page[];
  selectedPageIds: string[];
  onReorderPages: (pages: Page[]) => void;
  onDragStateChange: (isDragging: boolean) => void;
};

export const useBottomBarDrag = ({
  pages,
  selectedPageIds,
  onReorderPages,
  onDragStateChange,
}: UseBottomBarDragParams) => {
  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop({
    pages,
    onReorderPages,
  });

  // 클로저 문제 없이 최신 selectedPageIds를 참조하기 위해 ref 사용
  const selectedPageIdsRef = useRef(selectedPageIds);
  useEffect(() => {
    selectedPageIdsRef.current = selectedPageIds;
  }, [selectedPageIds]);

  const createDragHandlers = useCallback(
    (pageId: string) => ({
      onDragStart: (event: ReactDragEvent<HTMLDivElement>) => {
        // 커버 페이지는 위치 0에 고정 — 드래그 불가
        const page = pages.find((p) => p.id === pageId);
        if (page?.coverData) {
          event.preventDefault();
          return;
        }
        // 드래그 시작 페이지가 다중 선택에 포함되어 있으면 선택 전체를 이동
        const ids = selectedPageIdsRef.current.includes(pageId)
          ? selectedPageIdsRef.current
          : [pageId];
        handleDragStart(event, ids);
        onDragStateChange(true);
      },
      onDragOver: handleDragOver,
      onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
        handleDrop(event, pageId);
        onDragStateChange(false);
      },
      // 드롭 없이 취소된 경우(Escape 등)에도 isDragging 해제
      onDragEnd: () => {
        onDragStateChange(false);
      },
    }),
    [handleDragOver, handleDragStart, handleDrop, onDragStateChange],
  );

  return {
    createDragHandlers,
    handleDrop,
    handleDragOver,
  };
};
