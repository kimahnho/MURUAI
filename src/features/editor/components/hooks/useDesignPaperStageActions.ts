import { useEffect, type MutableRefObject } from "react";
import type { DesignPaperStageActions } from "../../types/stageActions";

type UseDesignPaperStageActionsParams = {
  stageActionsRef?: MutableRefObject<DesignPaperStageActions | null>;
  clearContextMenu: () => void;
  setEditingImageId: (id: string | null) => void;
  setEditingShapeTextId: (id: string | null) => void;
};

export const useDesignPaperStageActions = ({
  stageActionsRef,
  clearContextMenu,
  setEditingImageId,
  setEditingShapeTextId,
}: UseDesignPaperStageActionsParams) => {
  useEffect(() => {
    if (!stageActionsRef) return;
    stageActionsRef.current = {
      clearContextMenu,
      setEditingImageId,
      setEditingShapeTextId,
    };
    return () => {
      stageActionsRef.current = null;
    };
  }, [stageActionsRef, clearContextMenu, setEditingImageId, setEditingShapeTextId]);
};
