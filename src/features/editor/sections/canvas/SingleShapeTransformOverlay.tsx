import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasElement, ShapeElement } from "../../model/canvasTypes";
import { getRectFromElement, type Rect } from "../../utils/designPaperUtils";
import ShapeTransformBar from "./ShapeTransformBar";

type ActivePreview = {
  id: string;
  rect: Rect;
} | null;

type SingleShapeTransformOverlayProps = {
  selectedIds: string[];
  elements: CanvasElement[];
  activePreview: ActivePreview;
  isRotating: boolean;
  editingImageId: string | null;
  editingShapeTextId: string | null;
  updateElement: (id: string, updates: Partial<ShapeElement>) => void;
  startShapeRotation: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: ShapeElement,
    rect: Rect,
  ) => void;
  getBottomCenterAnchor: (
    rect: Rect,
    rotationDeg: number,
    offset: number,
  ) => { x: number; y: number };
  getTopCenterAnchor: (
    rect: Rect,
    rotationDeg: number,
    offset: number,
  ) => { x: number; y: number };
};

const SingleShapeTransformOverlay = ({
  selectedIds,
  elements,
  activePreview,
  isRotating,
  editingImageId,
  editingShapeTextId,
  updateElement,
  startShapeRotation,
  getBottomCenterAnchor,
  getTopCenterAnchor,
}: SingleShapeTransformOverlayProps) => {
  if (selectedIds.length !== 1) return null;
  const element = elements.find((el) => el.id === selectedIds[0]);
  if (
    !element ||
    element.locked ||
    (element.type !== "rect" &&
      element.type !== "roundRect" &&
      element.type !== "ellipse")
  ) {
    return null;
  }
  const rect =
    activePreview?.id === element.id
      ? activePreview.rect
      : getRectFromElement(element);
  if (!rect) return null;

  return (
    <ShapeTransformBar
      element={element}
      rect={rect}
      isRotating={isRotating}
      editingImageId={editingImageId}
      editingShapeTextId={editingShapeTextId}
      updateElement={updateElement}
      startShapeRotation={startShapeRotation}
      getBottomCenterAnchor={getBottomCenterAnchor}
      getTopCenterAnchor={getTopCenterAnchor}
    />
  );
};

export default SingleShapeTransformOverlay;
