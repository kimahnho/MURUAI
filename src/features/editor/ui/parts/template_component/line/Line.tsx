import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import type { Point } from "../../../../model/canvasTypes";
import { normalizePoint } from "../../../../utils/domUtils";
import { useLineInteraction } from "./useLineInteraction";
import TransformToolbar from "../TransformToolbar";

interface LineShapeProps {
  id: string;
  start: Point;
  end: Point;
  stroke: {
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted";
  };
  isSelected?: boolean;
  selectionCount?: number;
  locked?: boolean;
  onLineChange?: (value: { start: Point; end: Point }) => void;
  onDragStateChange?: (
    isDragging: boolean,
    value?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" },
  ) => void;
  onSelectChange?: (
    isSelected: boolean,
    options?: { additive?: boolean },
  ) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
  };
  onFlipX?: () => void;
  onFlipY?: () => void;
  onRotateCW?: () => void;
  onRotateCCW?: () => void;
}

const Line = ({
  start,
  end,
  stroke,
  isSelected = false,
  selectionCount = 0,
  locked = false,
  onLineChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
  transform,
  onFlipX,
  onFlipY,
  onRotateCW,
  onRotateCCW,
}: LineShapeProps) => {
  const safeStart = normalizePoint(start);
  const safeEnd = normalizePoint(end);
  const lineRef = useRef({ start: safeStart, end: safeEnd });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lineRef.current = { start: safeStart, end: safeEnd };
  }, [safeStart, safeEnd]);

  const handleSize = 10;
  const halfHandle = handleSize / 2;
  const padding = Math.max(6, stroke.width, handleSize);
  const getBounds = (line: { start: Point; end: Point }) => {
    const minX = Math.min(line.start.x, line.end.x);
    const minY = Math.min(line.start.y, line.end.y);
    const width = Math.max(Math.abs(line.end.x - line.start.x), 1);
    const height = Math.max(Math.abs(line.end.y - line.start.y), 1);
    return {
      boxX: minX - padding,
      boxY: minY - padding,
      boxWidth: width + padding * 2,
      boxHeight: height + padding * 2,
    };
  };

  const { boxX, boxY, boxWidth, boxHeight } = getBounds({
    start: safeStart,
    end: safeEnd,
  });
  const startRel = { x: safeStart.x - boxX, y: safeStart.y - boxY };
  const endRel = { x: safeEnd.x - boxX, y: safeEnd.y - boxY };
  const angleRad = Math.atan2(safeEnd.y - safeStart.y, safeEnd.x - safeStart.x);
  const angleDeg = Math.round(((angleRad * 180) / Math.PI + 360) % 360) % 360;

  const getPointerPosition = (event: PointerEvent, scale: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const bounds = getBounds(lineRef.current);
    return {
      x: (event.clientX - rect.left) / scale + bounds.boxX,
      y: (event.clientY - rect.top) / scale + bounds.boxY,
    };
  };

  const { startDrag, startResize } = useLineInteraction({
    wrapperRef,
    lineRef,
    locked,
    isSelected,
    selectionCount,
    onLineChange,
    onDragStateChange,
    onSelectChange,
    getPointerPosition,
  });

  const showOutline = !locked && isSelected;
  const showTransformToolbar =
    isSelected && !locked && onFlipX && onFlipY && onRotateCW && onRotateCCW;

  // Transform 스타일 계산
  const transformStyle = (() => {
    const transforms: string[] = [];
    if (transform?.flipX) transforms.push("scaleX(-1)");
    if (transform?.flipY) transforms.push("scaleY(-1)");
    if (transform?.rotation)
      transforms.push(`rotate(${transform.rotation}deg)`);
    return transforms.length > 0 ? transforms.join(" ") : undefined;
  })();

  return (
    <div
      ref={wrapperRef}
      className="absolute"
      style={{
        left: boxX,
        top: boxY,
        width: boxWidth,
        height: boxHeight,
      }}
      onContextMenu={onContextMenu}
    >
      {showOutline && (
        <svg
          width={boxWidth}
          height={boxHeight}
          className="absolute inset-0 pointer-events-none"
        >
          <line
            x1={startRel.x}
            y1={startRel.y}
            x2={endRel.x}
            y2={endRel.y}
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth={stroke.width + 4}
            strokeLinecap="round"
          />
        </svg>
      )}
      <svg
        width={boxWidth}
        height={boxHeight}
        className="absolute inset-0"
        style={{
          transform: transformStyle,
          transformOrigin: "center center",
        }}
      >
        <line
          x1={startRel.x}
          y1={startRel.y}
          x2={endRel.x}
          y2={endRel.y}
          stroke="transparent"
          strokeWidth={Math.max(12, stroke.width + 6)}
          pointerEvents="stroke"
          onPointerDown={startDrag}
        />
        <line
          x1={startRel.x}
          y1={startRel.y}
          x2={endRel.x}
          y2={endRel.y}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap={stroke.style === "dotted" ? "square" : "round"}
          strokeDasharray={
            stroke.style === "dashed"
              ? `${stroke.width * 3} ${stroke.width * 2}`
              : stroke.style === "dotted"
                ? `${stroke.width * 0.5} ${stroke.width * 2}`
                : undefined
          }
          pointerEvents="none"
        />
      </svg>
      {!locked && isSelected && selectionCount <= 1 && (
        <>
          <div
            className="absolute rounded-full border border-primary bg-white-100"
            style={{
              width: handleSize,
              height: handleSize,
              left: startRel.x - halfHandle,
              top: startRel.y - halfHandle,
              cursor: "grab",
            }}
            onPointerDown={(event) => {
              startResize(event, "start");
            }}
          />
          <div
            className="absolute rounded-full border border-primary bg-white-100"
            style={{
              width: handleSize,
              height: handleSize,
              left: endRel.x - halfHandle,
              top: endRel.y - halfHandle,
              cursor: "grab",
            }}
            onPointerDown={(event) => {
              startResize(event, "end");
            }}
          />
        </>
      )}
      {!locked && isSelected && (
        <div
          className="absolute left-1/2 top-full mt-1 -translate-x-1/2 w-24 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap"
          style={{ pointerEvents: "none" }}
        >
          각도: {Math.round(angleDeg)}°
        </div>
      )}
      {showTransformToolbar && (
        <TransformToolbar
          onFlipX={onFlipX}
          onFlipY={onFlipY}
          onRotateCW={onRotateCW}
          onRotateCCW={onRotateCCW}
          showFlipX={false}
          showFlipY={false}
          showRotateCCW={false}
          showRotateCW={false}
        />
      )}
    </div>
  );
};

export default Line;
