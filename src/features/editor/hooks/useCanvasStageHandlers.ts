import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CanvasElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import { bumpPageRevision } from "../utils/pageRevision";

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
        prevPages.map((page) =>
          page.id === selectedPageId
            ? bumpPageRevision({ ...page, elements: nextElements })
            : page
        )
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
