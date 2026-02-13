import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import type { Page } from "../../../model/pageTypes";
import { updatePageById } from "../../../utils/pageMutation";

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
      setPages((prevPages) =>
        updatePageById(prevPages, selectedPageId, (page) => ({
          ...page,
          elements: nextElements,
        })),
      );
    },
    [selectedPageId, setPages]
  );

  const handleInteractionChange = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        beginTransaction();
      } else {
        commitTransaction("Element interaction");
      }
    },
    [beginTransaction, commitTransaction]
  );

  return { handleElementsChange, handleInteractionChange };
};
