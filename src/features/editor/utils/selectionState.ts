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

  // 선택된 요소 중 그룹에 속한 ID 집합 — 그룹 요소는 개별 테두리를 숨기고 GroupSelectionOverlay가 대신 표시
  const groupedRenderIds = new Set<string>();
  if (renderSelectedIds.length > 1) {
    for (const id of renderSelectedIds) {
      const el = elements.find((e) => e.id === id);
      if (el?.groupId) {
        // 같은 그룹의 다른 요소도 선택되어 있으면 그룹 렌더링 대상
        const hasSameGroupPeer = renderSelectedIds.some(
          (otherId) => otherId !== id && elements.find((e) => e.id === otherId)?.groupId === el.groupId,
        );
        if (hasSameGroupPeer) groupedRenderIds.add(id);
      }
    }
  }

  const shouldShowIndividualBorder = (elementId: string) =>
    renderSelectedIds.includes(elementId) && !groupedRenderIds.has(elementId);

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
