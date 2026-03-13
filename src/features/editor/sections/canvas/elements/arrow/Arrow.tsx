/**
 * 화살표 요소를 렌더링하고 이동/선택 상호작용을 처리하는 컴포넌트.
 */
import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import type { Point } from "../../../../model/canvasTypes";
import { normalizePoint } from "../../../../utils/domUtils";
import { resolveMarkers } from "../../../../utils/designPaperUtils";
import { useLineInteraction } from "../line/useLineInteraction";
import TransformToolbar from "../TransformToolbar";

interface ArrowShapeProps {
  id: string;
  start: Point;
  end: Point;
  stroke: {
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted";
  };
  marker?: {
    start?: boolean;
    end?: boolean;
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

const Arrow = ({
  id,
  start,
  end,
  stroke,
  marker,
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
}: ArrowShapeProps) => {
  const safeStart = normalizePoint(start);
  const safeEnd = normalizePoint(end);
  const lineRef = useRef({ start: safeStart, end: safeEnd });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lineRef.current = { start: safeStart, end: safeEnd };
  }, [safeStart, safeEnd]);

  const resolved = resolveMarkers({ type: "arrow", marker } as Parameters<typeof resolveMarkers>[0]);
  const hasStart = resolved.start;
  const hasEnd = resolved.end;

  const markerPadding = (hasStart || hasEnd) ? 12 : 0;
  const padding = Math.max(6, stroke.width, markerPadding);
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
  const markerStartId = `arrow-start-${id}`;
  const markerEndId = `arrow-end-${id}`;
  const handleSize = 10;
  const halfHandle = handleSize / 2;
  const angleRad = Math.atan2(safeEnd.y - safeStart.y, safeEnd.x - safeStart.x);
  const angleDeg = Math.round(((angleRad * 180) / Math.PI + 360) % 360) % 360;

  const getPointerPosition = (event: PointerEvent, scale: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const bounds = getBounds(lineRef.current);
    // wrapper 내부 좌표를 전역 좌표계로 환산해 라인 인터랙션 훅과 동일 기준을 맞춘다.
    return {
      x: (event.clientX - rect.left) / scale + bounds.boxX,
      y: (event.clientY - rect.top) / scale + bounds.boxY,
    };
  };

  const { startDrag, startResize, handleWrapperPointerDown } =
    useLineInteraction({
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

  // 회전/반전 변환은 화살표 경로와 헤드 마커를 함께 뒤집어
  // 시각적 방향이 분리되지 않도록 한다.
  const transformStyle = (() => {
    const transforms: string[] = [];
    if (transform?.rotation)
      transforms.push(`rotate(${transform.rotation}deg)`);
    if (transform?.flipX) transforms.push("scaleX(-1)");
    if (transform?.flipY) transforms.push("scaleY(-1)");
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
      onPointerDown={handleWrapperPointerDown}
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
          overflow: "visible",
          transform: transformStyle,
          transformOrigin: "center center",
        }}
      >
        <defs>
          {hasStart && (
            <marker
              id={markerStartId}
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" fill={stroke.color} />
            </marker>
          )}
          {hasEnd && (
            <marker
              id={markerEndId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="10"
              markerHeight="10"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke.color} />
            </marker>
          )}
        </defs>
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
          strokeLinecap="round"
          strokeDasharray={
            stroke.style === "dashed"
              ? "6 3"
              : stroke.style === "dotted"
                ? "2 3"
                : undefined
          }
          markerStart={hasStart ? `url(#${markerStartId})` : undefined}
          markerEnd={hasEnd ? `url(#${markerEndId})` : undefined}
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

export default Arrow;
