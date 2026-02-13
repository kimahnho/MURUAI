import { useCallback, type DragEvent as ReactDragEvent } from "react";
import { useDragAndDrop } from "../../../shared/hooks/useDragAndDrop";
import type { Page } from "../../../model/pageTypes";

type UseBottomBarDragParams = {
  pages: Page[];
  onReorderPages: (pages: Page[]) => void;
};

export const useBottomBarDrag = ({
  pages,
  onReorderPages,
}: UseBottomBarDragParams) => {
  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop({
    pages,
    onReorderPages,
  });

  const createDragHandlers = useCallback(
    (pageId: string) => ({
      onDragStart: (event: ReactDragEvent<HTMLDivElement>) => {
        handleDragStart(event, pageId);
      },
      onDragOver: handleDragOver,
      onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
        handleDrop(event, pageId);
      },
    }),
    [handleDragOver, handleDragStart, handleDrop]
  );

  return {
    createDragHandlers,
  };
};
