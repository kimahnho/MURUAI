import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ShapeElement } from "../../../model/canvasTypes";
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
    element: ShapeElement,
    rect: Rect,
  ) => {
    if (readOnly || element.locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

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
