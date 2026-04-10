/**
 * 자유형 요소 렌더러.
 * 정규화된 포인트(0~1)를 SVG path로 렌더링하고, 선택/드래그/리사이즈를 지원한다.
 */
import type { FreeformElement } from "@/features/editor/model/canvasTypes";
import { useFreeformInteraction } from "./useFreeformInteraction";

interface FreeformBoxProps {
  element: FreeformElement;
  rect: { x: number; y: number; width: number; height: number };
  isSelected: boolean;
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
  locked,
  onRectChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
}: FreeformBoxProps) => {
  const { handlePointerDown } = useFreeformInteraction({
    element,
    locked,
    onRectChange,
    onDragStateChange,
    onSelectChange,
  });

  const { points, closed, fill, stroke, border, transform } = element;
  const pathD = buildPathD(points, closed);

  // viewBox 기준 stroke 너비 (정규화 좌표 공간에서의 비율)
  const svgStrokeWidth = rect.width > 0 ? stroke.width / rect.width : 0;
  const hitStrokeWidth = rect.width > 0 ? Math.max(12, stroke.width + 6) / rect.width : 0;

  const transformParts = [
    transform?.rotation ? `rotate(${transform.rotation}deg)` : "",
    transform?.flipX ? "scaleX(-1)" : "",
    transform?.flipY ? "scaleY(-1)" : "",
  ].filter(Boolean).join(" ");

  // 닫힌 도형의 border를 SVG stroke가 아닌 CSS border overlay로 렌더링 (ShapeElement 패턴)
  const borderStyle = border?.enabled && closed
    ? `${border.width}px ${border.style ?? "solid"} ${border.color}`
    : undefined;

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
      {/* 선택 아웃라인 */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            inset: -1,
            border: "2px solid var(--color-primary)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

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

      {/* SVG 경로 */}
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
          fill={closed ? "transparent" : "none"}
          pointerEvents="stroke"
        />
        {/* 실제 렌더링 */}
        <path
          d={pathD}
          stroke={stroke.color}
          strokeWidth={svgStrokeWidth}
          strokeDasharray={getDashArray(stroke.style, svgStrokeWidth)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={closed ? fill : "none"}
          pointerEvents="none"
        />
      </svg>
    </div>
  );
};

export default FreeformBox;
