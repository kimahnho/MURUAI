/**
 * 스테이지 동작에 사용되는 액션 타입 계약을 정의하는 모듈.
 */
export type DesignPaperStageActions = {
  clearContextMenu: () => void;
  setEditingImageId: (id: string | null) => void;
  setEditingShapeTextId: (id: string | null) => void;
};
