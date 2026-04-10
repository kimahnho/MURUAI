/**
 * 자유형 요소의 드래그(이동) 인터랙션 훅.
 * RoundBox의 startAction 패턴을 따라 pointerDown 시 먼저 선택 처리 후 드래그를 시작한다.
 */
import { useRef } from "react";
import type { FreeformElement, Rect } from "@/features/editor/model/canvasTypes";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

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
  const lastRectRef = useRef<Rect | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();

    const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey;

    // RoundBox 패턴: 다중 선택 시 클릭만으로 단일 선택 전환 (드래그 없으면)
    const shouldSelectOnClickOnly = isSelected && selectionCount > 1 && !isAdditive;

    // 먼저 선택 처리 — RoundBox와 동일
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
          // 다중 선택 상태에서 움직임 없는 클릭 → 단일 선택으로 전환
          onSelectChange?.(element.id, true);
        }
        dragStartRef.current = null;
        lastRectRef.current = null;
      },
    });
  };

  return { handlePointerDown };
};
