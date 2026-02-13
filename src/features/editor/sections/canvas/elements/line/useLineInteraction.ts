import { type RefObject, type PointerEvent as ReactPointerEvent } from "react";
import type { Point } from "../../../../model/canvasTypes";
import { getScale } from "../../../../utils/domUtils";

type LineRef = {
  start: Point;
  end: Point;
};

type UseLineInteractionParams = {
  wrapperRef: RefObject<HTMLDivElement | null>;
  lineRef: RefObject<LineRef>;
  locked: boolean;
  isSelected: boolean;
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
  onLineChange,
  onDragStateChange,
  onSelectChange,
  getPointerPosition,
}: UseLineInteractionParams) => {
  const ensureSelection = (event: ReactPointerEvent) => {
    if (!isSelected || event.shiftKey) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
  };

  const startDrag = (event: ReactPointerEvent<SVGLineElement>) => {
    if (locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    ensureSelection(event);

    const scale = getScale(wrapperRef.current);
    const dragStart = lineRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    let hasMoved = false;

    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const next = {
        start: { x: dragStart.start.x + dx, y: dragStart.start.y + dy },
        end: { x: dragStart.end.x + dx, y: dragStart.end.y + dy },
      };
      if (!hasMoved) {
        hasMoved = true;
        onDragStateChange?.(true, next, { type: "drag" });
      }
      lineRef.current = next;
      onLineChange?.(next);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      if (hasMoved) {
        onDragStateChange?.(false, lineRef.current, { type: "drag" });
      }
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
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
    let hasMoved = false;

    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const pointer = getPointerPosition(moveEvent, scale);
      const next =
        handle === "start"
          ? { start: pointer, end: dragStart.end }
          : { start: dragStart.start, end: pointer };
      if (!hasMoved) {
        hasMoved = true;
        onDragStateChange?.(true, next, { type: "resize" });
      }
      lineRef.current = next;
      onLineChange?.(next);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      if (hasMoved) {
        onDragStateChange?.(false, lineRef.current, { type: "resize" });
      }
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
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
