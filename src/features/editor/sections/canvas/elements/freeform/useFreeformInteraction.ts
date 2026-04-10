/**
 * 자유형 요소의 드래그(이동) 인터랙션 훅.
 * points가 정규화(0~1)되어 있으므로 드래그 시 x,y만 이동하면 된다.
 * 리사이즈는 부모(useDesignPaperInteraction)에서 w,h 변경으로 처리.
 */
import { useRef } from "react";
import type { FreeformElement } from "@/features/editor/model/canvasTypes";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

interface UseFreeformInteractionProps {
  element: FreeformElement;
  locked: boolean;
  onRectChange?: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
  onDragStateChange?: (id: string, isDragging: boolean, finalRect?: { x: number; y: number; width: number; height: number }, context?: { type: "drag" | "resize" }) => void;
  onSelectChange?: (id: string, selected: boolean, options?: { additive?: boolean }) => void;
}

export const useFreeformInteraction = ({
  element,
  locked,
  onRectChange,
  onDragStateChange,
  onSelectChange,
}: UseFreeformInteractionProps) => {
  const { startPointerDragSession } = usePointerDragSession();
  const dragStartRef = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const shiftKeyRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    shiftKeyRef.current = e.shiftKey || e.metaKey || e.ctrlKey;

    startPointerDragSession({
      thresholdPx: 3,
      startContext: undefined as undefined,
      createMoveContext: (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        return { distance: Math.hypot(dx, dy), context: { dx, dy } };
      },
      onStart: () => {
        dragStartRef.current = { x: element.x, y: element.y, pointerX: startX, pointerY: startY };
        onDragStateChange?.(element.id, true, undefined, { type: "drag" });
      },
      onMove: ({ dx, dy }: { dx: number; dy: number }) => {
        if (!dragStartRef.current) return;
        const nextRect = {
          x: dragStartRef.current.x + dx,
          y: dragStartRef.current.y + dy,
          width: element.w,
          height: element.h,
        };
        onRectChange?.(element.id, nextRect);
      },
      onEnd: (hasMoved: boolean) => {
        if (hasMoved && dragStartRef.current) {
          onDragStateChange?.(element.id, false, {
            x: element.x,
            y: element.y,
            width: element.w,
            height: element.h,
          }, { type: "drag" });
        } else {
          onSelectChange?.(element.id, true, { additive: shiftKeyRef.current });
        }
        dragStartRef.current = null;
      },
    });
  };

  return { handlePointerDown };
};
