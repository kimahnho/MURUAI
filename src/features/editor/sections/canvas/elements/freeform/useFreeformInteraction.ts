/**
 * 자유형 요소의 드래그(이동) + 리사이즈 인터랙션 훅.
 * points가 정규화(0~1)되어 있으므로 리사이즈 시 w,h만 변경하면 SVG viewBox로 자동 스케일.
 */
import { useRef } from "react";
import type { FreeformElement, Rect, ResizeHandle } from "@/features/editor/model/canvasTypes";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

const MIN_SIZE = 20;

interface UseFreeformInteractionProps {
  element: FreeformElement;
  isSelected: boolean;
  selectionCount: number;
  locked: boolean;
  onRectChange?: (id: string, rect: Rect) => void;
  onDragStateChange?: (id: string, isDragging: boolean, finalRect?: Rect, context?: { type: "drag" | "resize" }) => void;
  onSelectChange?: (id: string, selected: boolean, options?: { additive?: boolean }) => void;
}

export const useFreeformInteraction = ({
  element,
  isSelected,
  selectionCount,
  locked,
  onRectChange,
  onDragStateChange,
  onSelectChange,
}: UseFreeformInteractionProps) => {
  const { startPointerDragSession } = usePointerDragSession();
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ rect: Rect; handle: ResizeHandle } | null>(null);
  const lastRectRef = useRef<Rect | null>(null);

  // 드래그(이동) 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    // 리사이즈 핸들 클릭은 무시 — handleResizePointerDown이 처리
    const target = e.target as HTMLElement;
    if (target.closest("[data-capture-handle]")) return;
    e.stopPropagation();

    const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey;
    const shouldSelectOnClickOnly = isSelected && selectionCount > 1 && !isAdditive;

    if (!shouldSelectOnClickOnly && (!isSelected || isAdditive)) {
      onSelectChange?.(element.id, true, { additive: isAdditive });
    }

    const startX = e.clientX;
    const startY = e.clientY;

    startPointerDragSession({
      thresholdPx: 3,
      startContext: undefined as undefined,
      createMoveContext: (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        return { distance: Math.hypot(dx, dy), context: { dx, dy } };
      },
      onStart: () => {
        dragStartRef.current = { x: element.x, y: element.y };
        lastRectRef.current = null;
        onDragStateChange?.(element.id, true, undefined, { type: "drag" });
      },
      onMove: ({ dx, dy }: { dx: number; dy: number }) => {
        if (!dragStartRef.current) return;
        const nextRect: Rect = {
          x: dragStartRef.current.x + dx,
          y: dragStartRef.current.y + dy,
          width: element.w,
          height: element.h,
        };
        lastRectRef.current = nextRect;
        onRectChange?.(element.id, nextRect);
      },
      onEnd: (hasMoved: boolean) => {
        if (hasMoved) {
          onDragStateChange?.(element.id, false, lastRectRef.current ?? undefined, { type: "drag" });
        } else if (shouldSelectOnClickOnly) {
          onSelectChange?.(element.id, true);
        }
        dragStartRef.current = null;
        lastRectRef.current = null;
      },
    });
  };

  // 리사이즈 핸들러
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    _type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startRect: Rect = { x: element.x, y: element.y, width: element.w, height: element.h };

    startPointerDragSession({
      thresholdPx: 0,
      startContext: undefined as undefined,
      createMoveContext: (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        return { distance: Math.hypot(dx, dy), context: { dx, dy } };
      },
      onStart: () => {
        resizeStartRef.current = { rect: startRect, handle };
        lastRectRef.current = null;
        onDragStateChange?.(element.id, true, undefined, { type: "resize" });
      },
      onMove: ({ dx, dy }: { dx: number; dy: number }) => {
        if (!resizeStartRef.current) return;
        const { rect: sr, handle: h } = resizeStartRef.current;
        const nextRect = computeResizedRect(sr, h, dx, dy);
        lastRectRef.current = nextRect;
        onRectChange?.(element.id, nextRect);
      },
      onEnd: (hasMoved: boolean) => {
        if (hasMoved) {
          onDragStateChange?.(element.id, false, lastRectRef.current ?? undefined, { type: "resize" });
        } else {
          onDragStateChange?.(element.id, false, undefined, { type: "resize" });
        }
        resizeStartRef.current = null;
        lastRectRef.current = null;
      },
    });
  };

  return { handlePointerDown, handleResizePointerDown };
};

/** handle 방향에 따라 리사이즈된 rect를 계산 */
function computeResizedRect(start: Rect, handle: ResizeHandle, dx: number, dy: number): Rect {
  let { x, y, width, height } = start;

  if (handle.includes("e")) {
    width = Math.max(MIN_SIZE, start.width + dx);
  }
  if (handle.includes("w")) {
    const newW = Math.max(MIN_SIZE, start.width - dx);
    x = start.x + (start.width - newW);
    width = newW;
  }
  if (handle.includes("s")) {
    height = Math.max(MIN_SIZE, start.height + dy);
  }
  if (handle.includes("n")) {
    const newH = Math.max(MIN_SIZE, start.height - dy);
    y = start.y + (start.height - newH);
    height = newH;
  }

  return { x, y, width, height };
}
