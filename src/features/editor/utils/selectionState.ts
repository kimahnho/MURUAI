/**
 * 선택 상태 계산에 필요한 공통 판별 로직을 제공하는 모듈.
 */
import type { CanvasElement } from "../model/canvasTypes";

type SelectionRenderState = {
  renderSelectedIds: string[];
  selectedGroupId: string | null;
  isGroupedSelection: boolean;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  isRenderGroupedSelection: boolean;
  shouldShowIndividualBorder: (elementId: string) => boolean;
};

export const getSelectionRenderState = ({
  elements,
  selectedIds,
  previewSelectedIds,
}: {
  elements: CanvasElement[];
  selectedIds: string[];
  previewSelectedIds?: string[] | null;
}): SelectionRenderState => {
  // 드래그 박스 선택 중에는 previewSelectedIds를 우선 적용해 선택 확정 전에도 UI 피드백을 제공한다.
  const renderSelectedIds =
    previewSelectedIds && previewSelectedIds.length > 0
      ? previewSelectedIds
      : selectedIds;

  const selectedGroupId =
    selectedIds.length > 1
      ? elements.find((element) => element.id === selectedIds[0])?.groupId ??
        null
      : null;

  const isGroupedSelection =
    selectedGroupId != null &&
    selectedIds.length > 1 &&
    selectedIds.every(
      (id) =>
        elements.find((element) => element.id === id)?.groupId ===
        selectedGroupId
    );

  const canGroupSelection = selectedIds.length > 1;

  const canUngroupSelection = elements.some(
    (element) => selectedIds.includes(element.id) && element.groupId
  );

  const renderGroupId =
    renderSelectedIds.length > 1
      ? elements.find((element) => element.id === renderSelectedIds[0])
          ?.groupId ?? null
      : null;

  const isRenderGroupedSelection =
    renderGroupId != null &&
    renderSelectedIds.length > 1 &&
    renderSelectedIds.every(
      (id) =>
        elements.find((element) => element.id === id)?.groupId === renderGroupId
    );

  const shouldShowIndividualBorder = (elementId: string) =>
    // 그룹 렌더링 중에는 개별 테두리를 숨겨 "하나의 그룹 선택" 시각 피드백을 유지한다.
    renderSelectedIds.includes(elementId) &&
    (!isRenderGroupedSelection || renderSelectedIds.length === 1);

  return {
    renderSelectedIds,
    selectedGroupId,
    isGroupedSelection,
    canGroupSelection,
    canUngroupSelection,
    isRenderGroupedSelection,
    shouldShowIndividualBorder,
  };
};
