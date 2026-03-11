/**
 * 요소 회전 입력을 처리해 회전 각도 계산과 패치 반영을 수행하는 훅.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AacCardElement, EmotionCardElement, ShapeElement } from "../../../model/canvasTypes";
import type { Rect } from "../../../utils/designPaperUtils";
import { usePointerDragSession } from "./usePointerDragSession";

type ElementPatch = Partial<ShapeElement> & {
  transform?: Record<string, unknown>;
};

interface UseDesignPaperRotationParams {
  readOnly: boolean;
  getPointerPosition: (event: PointerEvent | ReactPointerEvent<HTMLElement>) => {
    x: number;
    y: number;
  };
  updateElement: (id: string, patch: ElementPatch) => void;
  onInteractionChange?: (
    isActive: boolean,
    context?: { type: "drag" | "resize" },
  ) => void;
}

export const useDesignPaperRotation = ({
  readOnly,
  getPointerPosition,
  updateElement,
  onInteractionChange,
}: UseDesignPaperRotationParams) => {
  // 회전 중 상태를 분리해 상위 레이어에서 드래그/선택 충돌을 잠시 비활성화할 수 있게 한다.
  const [isRotating, setIsRotating] = useState(false);
  const [rotationBadge, setRotationBadge] = useState<{
    elementId: string;
    rotationDeg: number;
  } | null>(null);
  const rotationStateRef = useRef<{
    elementId: string;
    startRotation: number;
    startPointerAngle: number;
  } | null>(null);
  const { startPointerDragSession } = usePointerDragSession();

  const startShapeRotation = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: ShapeElement | AacCardElement | EmotionCardElement,
    rect: Rect,
  ) => {
    if (readOnly || element.locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    // 회전 기준점은 현재 선택 박스 중심으로 고정해, 핸들 위치와 무관하게 일관된 회전 궤적을 보장한다.
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const pointer = getPointerPosition(event);
    const startPointerAngle = Math.atan2(
      pointer.y - center.y,
      pointer.x - center.x,
    );
    const startRotation = element.transform?.rotation ?? 0;
    rotationStateRef.current = {
      elementId: element.id,
      startRotation,
      startPointerAngle,
    };
    setIsRotating(true);
    setRotationBadge({
      elementId: element.id,
      rotationDeg: startRotation,
    });
    onInteractionChange?.(true, { type: "drag" });

    startPointerDragSession({
      thresholdPx: 0,
      startContext: undefined,
      createMoveContext: (moveEvent) => ({
        distance: 0,
        context: moveEvent,
      }),
      onMove: (moveEvent) => {
        if (!rotationStateRef.current) return;
        const currentPointer = getPointerPosition(moveEvent);
        const currentAngle = Math.atan2(
          currentPointer.y - center.y,
          currentPointer.x - center.x,
        );
        const deltaRad = currentAngle - rotationStateRef.current.startPointerAngle;
        const deltaDeg = (deltaRad * 180) / Math.PI;
        const nextRotation =
          (rotationStateRef.current.startRotation + deltaDeg + 360) % 360;
        // 누적 회전값을 정수로 반올림해 히스토리 noise를 줄이고 배지 표시와 저장값을 동일하게 맞춘다.
        updateElement(element.id, {
          transform: {
            ...(element.transform ?? {}),
            rotation: Math.round(nextRotation),
          },
        });
        setRotationBadge({
          elementId: element.id,
          rotationDeg: nextRotation,
        });
      },
      onEnd: () => {
        // 세션 종료 시 회전 임시 상태를 즉시 정리해 다음 클릭/드래그가 이전 컨텍스트를 참조하지 않게 한다.
        rotationStateRef.current = null;
        setIsRotating(false);
        setRotationBadge(null);
        onInteractionChange?.(false, { type: "drag" });
      },
    });
  };

  return {
    isRotating,
    rotationBadge,
    startShapeRotation,
  };
};
