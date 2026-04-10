/**
 * 자유형 요소 렌더러.
 * 정규화된 포인트(0~1)를 SVG path로 렌더링하고, 선택/드래그/리사이즈를 지원한다.
 */
import type { FreeformElement } from "@/features/editor/model/canvasTypes";
import { useFreeformInteraction } from "./useFreeformInteraction";
import { ResizeHandles } from "../round_box/ResizeHandles";
import { buildSmoothPathD } from "@/features/editor/utils/pathSmooth";

const SELECTION_COLOR = "#7C3AED";

interface FreeformBoxProps {
  element: FreeformElement;
  rect: { x: number; y: number; width: number; height: number };
  isSelected: boolean;
  selectionCount: number;
  locked: boolean;
  onRectChange?: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
  onDragStateChange?: (id: string, isDragging: boolean, finalRect?: { x: number; y: number; width: number; height: number }, context?: { type: "drag" | "resize" }) => void;
  onSelectChange?: (id: string, selected: boolean, options?: { additive?: boolean }) => void;
  onContextMenu?: (e: React.MouseEvent<Element>) => void;
}

// SVG path d 속성 생성 (정규화 좌표 → viewBox 0 0 1 1)
function buildPathD(points: Array<{ x: number; y: number }>, closed: boolean): string {
  if (points.length === 0) return "";
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }
  if (closed) parts.push("Z");
  return parts.join(" ");
}

function getDashArray(style: string | undefined, strokeWidth: number): string | undefined {
  if (style === "dashed") return `${strokeWidth * 3} ${strokeWidth * 2}`;
  if (style === "dotted") return `${strokeWidth} ${strokeWidth}`;
  return undefined;
}

const FreeformBox = ({
  element,
  rect,
  isSelected,
  selectionCount,
  locked,
  onRectChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
}: FreeformBoxProps) => {
  const { handlePointerDown, handleResizePointerDown } = useFreeformInteraction({
    element,
    isSelected,
    selectionCount,
    locked,
    onRectChange,
    onDragStateChange,
    onSelectChange,
  });

  const { points, closed, smooth, fill, stroke, border, transform } = element;
  const pathD = smooth ? buildSmoothPathD(points, closed) : buildPathD(points, closed);

  // vector-effect="non-scaling-stroke" 사용 시 px 단위 그대로 적용 가능
  const svgStrokeWidth = stroke.width;
  const hitStrokeWidth = Math.max(12, stroke.width + 6);

  const transformParts = [
    transform?.rotation ? `rotate(${transform.rotation}deg)` : "",
    transform?.flipX ? "scaleX(-1)" : "",
    transform?.flipY ? "scaleY(-1)" : "",
  ].filter(Boolean).join(" ");

  // 닫힌 도형의 border를 SVG stroke가 아닌 CSS border overlay로 렌더링 (ShapeElement 패턴)
  const borderStyle = border?.enabled && closed
    ? `${border.width}px ${border.style ?? "solid"} ${border.color}`
    : undefined;

  const showOutline = isSelected && !locked;
  const showResizeHandles = showOutline && selectionCount <= 1;

  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        transform: transformParts || undefined,
        cursor: locked ? "default" : "move",
      }}
      onPointerDown={handlePointerDown}
      onContextMenu={onContextMenu}
    >
      {/* SVG 경로 — 핸들보다 먼저 렌더링하여 핸들이 DOM 순서상 위에 오게 한다 */}
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
      >
        {/* 투명 히트 영역 */}
        <path
          d={pathD}
          stroke="transparent"
          strokeWidth={hitStrokeWidth}
          vectorEffect="non-scaling-stroke"
          fill={closed ? "transparent" : "none"}
          pointerEvents="stroke"
        />
        {/* 실제 렌더링 */}
        <path
          d={pathD}
          stroke={stroke.color}
          strokeWidth={svgStrokeWidth}
          vectorEffect="non-scaling-stroke"
          strokeDasharray={getDashArray(stroke.style, svgStrokeWidth)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={closed ? fill : "none"}
          pointerEvents="none"
        />
      </svg>

      {/* 닫힌 도형 border overlay */}
      {borderStyle && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: borderStyle,
            pointerEvents: "none",
            boxSizing: "border-box",
            zIndex: 1,
          }}
        />
      )}

      {/* 선택 아웃라인 */}
      {showOutline && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: `2px solid ${SELECTION_COLOR}`,
            pointerEvents: "none",
            boxSizing: "border-box",
            zIndex: 2,
          }}
        />
      )}

      {/* 리사이즈 핸들 (8개 도트) — SVG보다 뒤에 렌더링하여 포인터 이벤트 우선 수신 */}
      {showResizeHandles && (
        <ResizeHandles
          selectionColor={SELECTION_COLOR}
          onPointerDown={handleResizePointerDown}
        />
      )}
    </div>
  );
};

export default FreeformBox;
