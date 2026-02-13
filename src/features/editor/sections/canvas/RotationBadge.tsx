import type { CanvasElement, ShapeElement } from "../../model/canvasTypes";
import { getRectFromElement, type Rect } from "../../utils/designPaperUtils";

interface RotationBadgeProps {
  elements: CanvasElement[];
  rotationBadge: { elementId: string; rotationDeg: number };
  getRotatedLocalAnchor: (
    rect: Rect,
    rotationDeg: number,
    ax: number,
    ay: number,
  ) => { x: number; y: number };
}

const RotationBadge = ({
  elements,
  rotationBadge,
  getRotatedLocalAnchor,
}: RotationBadgeProps) => {
  const element = elements.find((el) => el.id === rotationBadge.elementId);
  if (
    !element ||
    (element.type !== "rect" &&
      element.type !== "roundRect" &&
      element.type !== "ellipse")
  ) {
    return null;
  }
  const rect = getRectFromElement(element);
  if (!rect) return null;
  const rotationDeg = (element as ShapeElement).transform?.rotation ?? 0;
  const badgeOffset = 42;
  const badgePos = getRotatedLocalAnchor(
    rect,
    rotationDeg,
    0,
    rect.height / 2 + badgeOffset,
  );
  const angleValue = Math.round(rotationBadge.rotationDeg) % 360;
  const normalized = angleValue < 0 ? angleValue + 360 : angleValue;

  return (
    <div
      className="absolute rounded bg-black-90 px-2 py-1 text-12-medium text-white-100 shadow-lg z-9999"
      style={{
        left: badgePos.x,
        top: badgePos.y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    >
      {normalized}°
    </div>
  );
};

export default RotationBadge;
