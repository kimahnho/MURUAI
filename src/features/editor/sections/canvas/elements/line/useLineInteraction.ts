import { type RefObject, type PointerEvent as ReactPointerEvent } from "react";
import type { Point } from "../../../../model/canvasTypes";
import { getScale } from "../../../../utils/domUtils";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

type LineRef = {
  start: Point;
  end: Point;
};

type UseLineInteractionParams = {
  wrapperRef: RefObject<HTMLDivElement | null>;
  lineRef: RefObject<LineRef>;
  locked: boolean;
  isSelected: boolean;
  selectionCount: number;
  onLineChange?: (value: { start: Point; end: Point }) => void;
  onDragStateChange?: (
    isDragging: boolean,
    value?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" }
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
  getPointerPosition: (event: PointerEvent, scale: number) => Point;
};

export const useLineInteraction = ({
  wrapperRef,
  lineRef,
  locked,
  isSelected,
  selectionCount,
  onLineChange,
  onDragStateChange,
  onSelectChange,
  getPointerPosition,
}: UseLineInteractionParams) => {
  const { startPointerDragSession } = usePointerDragSession();

  const ensureSelection = (
    event: ReactPointerEvent,
    options?: { deferSingleWhenMultiSelected?: boolean },
  ) => {
    const shouldSelectOnClickOnly =
      Boolean(options?.deferSingleWhenMultiSelected) &&
      isSelected &&
      selectionCount > 1 &&
      !event.shiftKey;
    if (!shouldSelectOnClickOnly && (!isSelected || event.shiftKey)) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
    return shouldSelectOnClickOnly;
  };

  const startDrag = (event: ReactPointerEvent<SVGLineElement>) => {
    if (locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const shouldSelectOnClickOnly = ensureSelection(event, {
      deferSingleWhenMultiSelected: true,
    });

    const scale = getScale(wrapperRef.current);
    const dragStart = lineRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    startPointerDragSession({
      startContext: null,
      createMoveContext: (moveEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;
        return {
          distance: Math.hypot(dx, dy),
          context: { moveEvent, dx, dy },
        };
      },
      onMove: ({ moveEvent, dx, dy }) => {
        moveEvent.preventDefault();
        const next = {
          start: { x: dragStart.start.x + dx, y: dragStart.start.y + dy },
          end: { x: dragStart.end.x + dx, y: dragStart.end.y + dy },
        };
        lineRef.current = next;
        onLineChange?.(next);
      },
      onStart: () => {
        onDragStateChange?.(true, lineRef.current, { type: "drag" });
      },
      onEnd: (moved) => {
        if (!moved && shouldSelectOnClickOnly) {
          onSelectChange?.(true);
          return;
        }
        if (moved) {
          onDragStateChange?.(false, lineRef.current, { type: "drag" });
        }
      },
    });
  };

  const startResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: "start" | "end"
  ) => {
    if (locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    ensureSelection(event);

    const scale = getScale(wrapperRef.current);
    const dragStart = lineRef.current;
    startPointerDragSession({
      startContext: null,
      createMoveContext: (moveEvent) => {
        const pointer = getPointerPosition(moveEvent, scale);
        const next =
          handle === "start"
            ? { start: pointer, end: dragStart.end }
            : { start: dragStart.start, end: pointer };
        return {
          distance:
            handle === "start"
              ? Math.hypot(
                  next.start.x - dragStart.start.x,
                  next.start.y - dragStart.start.y,
                )
              : Math.hypot(
                  next.end.x - dragStart.end.x,
                  next.end.y - dragStart.end.y,
                ),
          context: { moveEvent, next },
        };
      },
      onMove: ({ moveEvent, next }) => {
        moveEvent.preventDefault();
        lineRef.current = next;
        onLineChange?.(next);
      },
      onStart: () => {
        onDragStateChange?.(true, lineRef.current, { type: "resize" });
      },
      onEnd: (moved) => {
        if (moved) {
          onDragStateChange?.(false, lineRef.current, { type: "resize" });
        }
      },
    });
  };

  const handleWrapperPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    ensureSelection(event);
  };

  return { startDrag, startResize, handleWrapperPointerDown };
};
