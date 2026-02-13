/**
 * 도형 변형 상태에서 위치/크기/회전 편집 보조 UI를 제공하는 컴포넌트.
 */
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import type { ShapeElement } from "../../model/canvasTypes";
import type { Rect } from "../../utils/designPaperUtils";

interface ShapeTransformBarProps {
  element: ShapeElement;
  rect: Rect;
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
}

const ShapeTransformBar = ({
  element,
  rect,
  isRotating,
  editingImageId,
  editingShapeTextId,
  updateElement,
  startShapeRotation,
  getBottomCenterAnchor,
  getTopCenterAnchor,
}: ShapeTransformBarProps) => {
  const rotationDeg = element.transform?.rotation ?? 0;
  const showRotateHandle =
    !isRotating &&
    editingImageId !== element.id &&
    editingShapeTextId !== element.id;
  const showSizeLabel = !isRotating;
  const showTransformBar =
    !isRotating &&
    editingImageId !== element.id &&
    editingShapeTextId !== element.id;

  const labelOffset = 16;
  const labelHeight = 20;
  const handleRadius = 10;
  const handleGap = 8;
  const rotateHandleOffset =
    labelOffset + labelHeight / 2 + handleRadius + handleGap;
  // 회전/라벨/툴바 앵커를 현재 회전각 기준으로 계산해 항상 요소 축에 맞춰 배치한다.
  const rotatePos = getBottomCenterAnchor(rect, rotationDeg, rotateHandleOffset);
  const labelPos = getBottomCenterAnchor(rect, rotationDeg, labelOffset);
  const topBarOffset = 12;
  const topBarPos = getTopCenterAnchor(rect, rotationDeg, topBarOffset);

  const applyTransformPatch = (
    updater: (
      current: NonNullable<ShapeElement["transform"]>,
    ) => NonNullable<ShapeElement["transform"]>,
  ) => {
    const currentTransform: NonNullable<ShapeElement["transform"]> = {
      flipX: element.transform?.flipX ?? false,
      flipY: element.transform?.flipY ?? false,
      rotation: element.transform?.rotation ?? 0,
    };
    updateElement(element.id, {
      transform: updater(currentTransform),
    });
  };

  const handleFlipX = () => {
    applyTransformPatch((current) => ({
      ...current,
      flipX: !current.flipX,
    }));
  };

  const handleFlipY = () => {
    applyTransformPatch((current) => ({
      ...current,
      flipY: !current.flipY,
    }));
  };

  const handleRotateCCW = () => {
    applyTransformPatch((current) => {
      const step = 90;
      const currentRotation = current.rotation ?? 0;
      return {
        ...current,
        rotation: (currentRotation - step + 360) % 360,
      };
    });
  };

  const handleRotateCW = () => {
    applyTransformPatch((current) => {
      const step = 90;
      const currentRotation = current.rotation ?? 0;
      return {
        ...current,
        rotation: (currentRotation + step + 360) % 360,
      };
    });
  };

  return (
    <>
      {showTransformBar && (
        // 회전/반전 버튼은 요소 상단 앵커에 고정해 드래그 핸들과 시선 충돌을 줄인다.
        <div
          className="absolute z-50"
          style={{
            left: topBarPos.x,
            top: topBarPos.y,
            transform: "translate(-50%, -100%)",
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-center gap-1 bg-white-100 border border-black-25 rounded-lg shadow-lg px-2 py-1">
            <button
              type="button"
              onClick={handleRotateCCW}
              className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
              aria-label="왼쪽으로 회전"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
                왼쪽으로 회전
              </span>
            </button>
            <button
              type="button"
              onClick={handleRotateCW}
              className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
              aria-label="오른쪽으로 회전"
            >
              <RotateCw className="w-4 h-4" />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
                오른쪽으로 회전
              </span>
            </button>
            <button
              type="button"
              onClick={handleFlipX}
              className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
              aria-label="좌우 반전"
            >
              <FlipHorizontal className="w-4 h-4" />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
                좌우 반전
              </span>
            </button>
            <button
              type="button"
              onClick={handleFlipY}
              className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
              aria-label="상하 반전"
            >
              <FlipVertical className="w-4 h-4" />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
                상하 반전
              </span>
            </button>
          </div>
        </div>
      )}
      {showRotateHandle && (
        <button
          type="button"
          className="absolute flex items-center justify-center rounded-full border-2 bg-white-100 cursor-grab active:cursor-grabbing z-50"
          style={{
            left: rotatePos.x,
            top: rotatePos.y,
            width: 20,
            height: 20,
            borderColor: "var(--primary)",
            transform: "translate(-50%, -50%)",
          }}
          onPointerDown={(event) => {
            startShapeRotation(event, element, rect);
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      )}
      {showSizeLabel && (
        <div
          className="absolute rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
          style={{
            left: labelPos.x,
            top: labelPos.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
    </>
  );
};

export default ShapeTransformBar;
