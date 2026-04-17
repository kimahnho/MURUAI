/**
 * 감정카드 복합 요소: 이미지 영역 + 라벨 텍스트를 한 요소 안에 렌더링하는 컴포넌트.
 * 감정 추론 템플릿 3페이지 디자인과 동일하게, 라벨이 카드 외부 하단에 배치된다.
 */
import { useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Rect, ResizeHandle } from "../../../../model/canvasTypes";
import type { AacCardLabelStyle } from "../../../../model/canvasTypes";
import RoundBox from "../round_box/RoundBox";

interface EmotionCardBoxProps {
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

// 템플릿 기준: labelGapMm = 3, labelHeightMm = 6 → 약 11px 간격, 약 23px 높이
const LABEL_GAP = 11;
const LABEL_HEIGHT = 23;

const EmotionCardBox = ({
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
}: EmotionCardBoxProps) => {
  const [isLabelEditing, setIsLabelEditing] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

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

  // 라벨을 카드 외부 하단에 배치 (감정 추론 템플릿 3페이지와 동일한 배치)
  // RoundBox 내부 div는 overflow-hidden이므로, 라벨은 RoundBox 바깥 sibling으로 렌더한다.
  const labelElement = showLabel ? (
    <div
      className="absolute left-0 pointer-events-auto"
      style={{
        top: label.position === "top"
          ? rect.y - LABEL_GAP - LABEL_HEIGHT
          : rect.y + rect.height + LABEL_GAP,
        left: rect.x,
        width: rect.width,
        height: LABEL_HEIGHT,
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
          lineHeight: `${LABEL_HEIGHT}px`,
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
    <>
      <RoundBox
        className={isImageEditing ? "z-20" : ""}
        rect={rect}
        minWidth={80}
        minHeight={80}
        fill={fill}
        backgroundColor={backgroundColor}
        opacity={opacity}
        imageBox={imageBox}
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
      />
      {labelElement}
    </>
  );
};

export default EmotionCardBox;
