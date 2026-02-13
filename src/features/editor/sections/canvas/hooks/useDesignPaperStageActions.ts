/**
 * 스테이지 레벨 동작(빈 영역 클릭/선택 해제 등)을 처리하는 액션 훅.
 */
import { useEffect, type MutableRefObject } from "react";
import type { DesignPaperStageActions } from "../../../model/stageActions";

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
