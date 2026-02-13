/**
 * 다중 선택 오버레이 드래그를 처리해 그룹 이동과 클릭 구분을 제어하는 훅.
 */
import { useCallback, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import { getRectFromElement, type Rect } from "../../../utils/designPaperUtils";
import { usePointerDragSession } from "./usePointerDragSession";
import type { GroupDragState } from "./useDesignPaperGroupDrag";

type SmartGuides = {
  compute: (params: {
    activeRect: Rect;
    otherRects: Rect[];
    activeX?: number[];
    activeY?: number[];
  }) => { snapOffset: { x: number; y: number } };
  clear: () => void;
};

type UseGroupOverlayDragParams = {
  readOnly: boolean;
  elements: CanvasElement[];
  selectedIdsRef: MutableRefObject<string[]>;
  getPointerPosition: (event: PointerEvent | ReactPointerEvent<HTMLElement>) => { x: number; y: number };
  buildGroupDragState: (activeId: string) => GroupDragState | null;
  groupDragRef: MutableRefObject<GroupDragState | null>;
  applyGroupDelta: (delta: { x: number; y: number }) => void;
  onInteractionChange?: (
    isActive: boolean,
    context?: { type: "drag" | "resize" },
  ) => void;
  handleSelectChange: (
    id: string,
    isSelected: boolean,
    options?: { additive?: boolean },
  ) => void;
  smartGuides: SmartGuides;
  getTargetRects: (activeId: string, excludeIds?: Set<string>) => Rect[];
};

export const useGroupOverlayDrag = ({
  readOnly,
  elements,
  selectedIdsRef,
  getPointerPosition,
  buildGroupDragState,
  groupDragRef,
  applyGroupDelta,
  onInteractionChange,
  handleSelectChange,
  smartGuides,
  getTargetRects,
}: UseGroupOverlayDragParams) => {
  const { startPointerDragSession } = usePointerDragSession();

  const handleGroupOverlayDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, groupRect: Rect) => {
      if (readOnly) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const pointer = getPointerPosition(event);
      // 오버레이 안에서도 실제 요소를 눌렀는지 판별해 클릭 시 선택 토글 대상으로 사용한다.
      const hitSelectedElement = [...elements].reverse().find((element) => {
        if (!selectedIdsRef.current.includes(element.id)) return false;
        if (
          element.visible === false ||
          element.selectable === false ||
          element.locked
        ) {
          return false;
        }
        const rect = getRectFromElement(element);
        if (!rect) return false;
        return (
          pointer.x >= rect.x &&
          pointer.x <= rect.x + rect.width &&
          pointer.y >= rect.y &&
          pointer.y <= rect.y + rect.height
        );
      });
      const clickedSelectedElementId = hitSelectedElement?.id ?? null;
      const additiveOnClick = event.shiftKey;
      const activeId = selectedIdsRef.current[0];
      if (!activeId) return;
      const snapshot = buildGroupDragState(activeId);
      // 다중 선택이 아닌 경우에는 그룹 드래그를 시작하지 않고 기존 선택 규칙만 적용한다.
      if (!snapshot || snapshot.items.size <= 1) {
        if (clickedSelectedElementId) {
          handleSelectChange(clickedSelectedElementId, true, {
            additive: additiveOnClick,
          });
        }
        return;
      }
      const startPointer = getPointerPosition(event);
      const selectedItemIds = new Set(snapshot.items.keys());
      const dragThresholdPx = 3;
      let dragStarted = false;

      const startDrag = () => {
        if (dragStarted) return;
        dragStarted = true;
        groupDragRef.current = snapshot;
        onInteractionChange?.(true, { type: "drag" });
      };

      startPointerDragSession({
        thresholdPx: dragThresholdPx,
        startContext: undefined,
        createMoveContext: (moveEvent) => {
          const currentPointer = getPointerPosition(moveEvent);
          const delta = {
            x: currentPointer.x - startPointer.x,
            y: currentPointer.y - startPointer.y,
          };
          return {
            distance: Math.hypot(delta.x, delta.y),
            context: delta,
          };
        },
        onStart: () => {
          startDrag();
        },
        onMove: (delta) => {
          // 선택 박스 기준 이동량에 스냅 오프셋을 더해 그룹 전체를 동일하게 보정한다.
          const movingRect = {
            x: groupRect.x + delta.x,
            y: groupRect.y + delta.y,
            width: groupRect.width,
            height: groupRect.height,
          };
          const { snapOffset } = smartGuides.compute({
            activeRect: movingRect,
            otherRects: getTargetRects(activeId, selectedItemIds),
          });
          applyGroupDelta({
            x: delta.x + snapOffset.x,
            y: delta.y + snapOffset.y,
          });
        },
        onEnd: (moved) => {
          // threshold 미만이면 클릭으로 해석해 개별 요소 선택 전환/토글을 수행한다.
          if (!moved && clickedSelectedElementId) {
            handleSelectChange(clickedSelectedElementId, true, {
              additive: additiveOnClick,
            });
            return;
          }
          if (dragStarted) {
            groupDragRef.current = null;
            onInteractionChange?.(false, { type: "drag" });
            smartGuides.clear();
          }
        },
      });
    },
    [
      applyGroupDelta,
      buildGroupDragState,
      elements,
      getPointerPosition,
      getTargetRects,
      groupDragRef,
      handleSelectChange,
      onInteractionChange,
      readOnly,
      selectedIdsRef,
      smartGuides,
      startPointerDragSession,
    ],
  );

  return { handleGroupOverlayDragPointerDown };
};
