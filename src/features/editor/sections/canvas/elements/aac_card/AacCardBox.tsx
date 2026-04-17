/**
 * AAC 카드 복합 요소: 이미지 영역 + 라벨 텍스트를 한 요소 안에 렌더링하는 컴포넌트.
 * RoundBox를 래핑해 드래그/리사이즈/이미지 편집 인터랙션을 재사용한다.
 */
import { useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Rect, ResizeHandle } from "../../../../model/canvasTypes";
import type { AacCardLabelStyle } from "../../../../model/canvasTypes";
import RoundBox from "../round_box/RoundBox";

interface AacCardBoxProps {
  rect: Rect;
  fill?: string;
  backgroundColor?: string;
  imageBox?: { x: number; y: number; w: number; h: number };
  borderRadius?: number | string;
  border?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted" | "double";
  };
  label: {
    text: string;
    position: "top" | "bottom" | "none";
    style: AacCardLabelStyle;
  };
  isSelected?: boolean;
  selectionCount?: number;
  locked?: boolean;
  selectable?: boolean;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => Rect;
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize" },
  ) => void;
  onImageBoxChange?: (value: {
    x: number;
    y: number;
    w: number;
    h: number;
  }) => void;
  onSelectChange?: (
    isSelected: boolean,
    options?: { additive?: boolean },
  ) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onImageDrop?: (imageUrl: string) => void;
  onFileDrop?: (file: File) => void;
  onLabelChange?: (text: string) => void;
  opacity?: number;
  isImageEditing?: boolean;
  onImageEditingChange?: (isEditing: boolean) => void;
  transform?: { flipX?: boolean; flipY?: boolean; rotation?: number };
  onFlipX?: () => void;
  onFlipY?: () => void;
  onRotateCW?: () => void;
  onRotateCCW?: () => void;
}

const LABEL_HEIGHT_RATIO = 0.22;
const MIN_LABEL_HEIGHT = 20;
const MAX_LABEL_HEIGHT = 45;

const AacCardBox = ({
  rect,
  fill = "#ffffff",
  backgroundColor,
  imageBox,
  borderRadius = 0,
  border,
  label,
  isSelected,
  selectionCount,
  locked,
  selectable,
  transformRect,
  onRectChange,
  onDragStateChange,
  onImageBoxChange,
  onSelectChange,
  onContextMenu,
  onImageDrop,
  onFileDrop,
  onLabelChange,
  opacity,
  isImageEditing,
  onImageEditingChange,
  transform,
  onFlipX,
  onFlipY,
  onRotateCW,
  onRotateCCW,
}: AacCardBoxProps) => {
  const [isLabelEditing, setIsLabelEditing] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  const labelHeight = Math.min(
    MAX_LABEL_HEIGHT,
    Math.max(MIN_LABEL_HEIGHT, rect.height * LABEL_HEIGHT_RATIO),
  );
  const showLabel = label.position !== "none";

  const handleLabelDoubleClick = (e: ReactMouseEvent) => {
    if (locked) return;
    e.stopPropagation();
    setIsLabelEditing(true);
    requestAnimationFrame(() => {
      const el = labelRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  };

  const commitLabel = () => {
    setIsLabelEditing(false);
    const text = labelRef.current?.textContent ?? label.text;
    if (text !== label.text) {
      onLabelChange?.(text);
    }
  };

  const handleLabelKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitLabel();
    }
    if (e.key === "Escape") {
      setIsLabelEditing(false);
      if (labelRef.current) {
        labelRef.current.textContent = label.text;
      }
    }
  };

  // 라벨이 표시될 때 이미지를 위로 올려 라벨과 겹치지 않게 한다.
  const adjustedImageBox = (() => {
    if (!imageBox || !showLabel) return imageBox;
    const offset = label.position === "bottom" ? -(labelHeight / 2) + 13 : (labelHeight / 2) + 13;
    return { ...imageBox, y: imageBox.y + offset };
  })();

  // 라벨 영역을 RoundBox의 children으로 전달
  const labelElement = showLabel ? (
    <div
      className="absolute left-0 right-0 flex items-center justify-center pointer-events-auto"
      style={{
        [label.position === "top" ? "top" : "bottom"]: 0,
        height: labelHeight,
      }}
    >
      <div
        ref={labelRef}
        contentEditable={isLabelEditing}
        suppressContentEditableWarning
        className="w-full text-center outline-none select-none"
        style={{
          fontSize: label.style.fontSize,
          fontWeight: label.style.fontWeight,
          fontFamily: label.style.fontFamily,
          color: label.style.color,
          lineHeight: `${labelHeight}px`,
          cursor: isLabelEditing ? "text" : "default",
          userSelect: isLabelEditing ? "text" : "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "0 4px",
        }}
        onDoubleClick={handleLabelDoubleClick}
        onBlur={commitLabel}
        onKeyDown={handleLabelKeyDown}
        onPointerDown={(e) => {
          if (isLabelEditing) e.stopPropagation();
        }}
      >
        {label.text}
      </div>
    </div>
  ) : null;

  return (
    <RoundBox
      className={isImageEditing ? "z-20" : ""}
      rect={rect}
      minWidth={80}
      minHeight={80}
      fill={fill}
      backgroundColor={backgroundColor}
      opacity={opacity}
      imageBox={adjustedImageBox}
      borderRadius={borderRadius}
      border={border}
      isSelected={isSelected}
      selectionCount={selectionCount}
      isImageEditing={isImageEditing}
      onImageEditingChange={onImageEditingChange}
      locked={locked}
      selectable={selectable}
      transformRect={transformRect}
      onRectChange={onRectChange}
      onDragStateChange={onDragStateChange}
      onImageBoxChange={onImageBoxChange}
      onSelectChange={onSelectChange}
      onContextMenu={onContextMenu}
      onImageDrop={onImageDrop}
      onFileDrop={onFileDrop}
      transform={transform}
      onFlipX={onFlipX}
      onFlipY={onFlipY}
      onRotateCW={onRotateCW}
      onRotateCCW={onRotateCCW}
      onRotationChange={undefined}
      showInlineMetrics={false}
    >
      {labelElement}
    </RoundBox>
  );
};

export default AacCardBox;
