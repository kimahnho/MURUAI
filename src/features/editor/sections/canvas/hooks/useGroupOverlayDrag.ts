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
