/**
 * 단일 선택 요소의 변형 박스와 핸들을 렌더링해 리사이즈/회전 진입점을 제공하는 오버레이 컴포넌트.
 */
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AacCardElement, CanvasElement, ShapeElement } from "../../model/canvasTypes";
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
  updateElement: (id: string, updates: Partial<ShapeElement | AacCardElement>) => void;
  startShapeRotation: (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: ShapeElement | AacCardElement,
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
  // 단일 도형 선택 상태에서만 변형 바를 노출해 다중 선택 오버레이와 UI 충돌을 방지한다.
  if (selectedIds.length !== 1) return null;
  const element = elements.find((el) => el.id === selectedIds[0]);
  if (
    !element ||
    element.locked ||
    (element.type !== "rect" &&
      element.type !== "roundRect" &&
      element.type !== "ellipse" &&
      element.type !== "mosaic" &&
      element.type !== "aacCard")
  ) {
    return null;
  }
  const rect =
    activePreview?.id === element.id
      ? activePreview.rect
      : getRectFromElement(element);
  // 드래그/리사이즈 중에는 preview rect를 우선 사용해 핸들 위치 지연을 줄인다.
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
