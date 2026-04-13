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

  // groupId가 있는 요소는 개별 테두리를 숨기고 GroupSelectionOverlay가 대신 표시
  const shouldShowIndividualBorder = (elementId: string) => {
    if (!renderSelectedIds.includes(elementId)) return false;
    const el = elements.find((e) => e.id === elementId);
    // groupId가 있으면 항상 개별 테두리 숨김 — GroupSelectionOverlay가 바운딩 박스를 표시
    if (el?.groupId) return false;
    return true;
  };

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
