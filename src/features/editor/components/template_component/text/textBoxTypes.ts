import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { Rect, ResizeHandle } from "../../../model/canvasTypes";

type TextAlign = "left" | "center" | "right";
type TextAlignY = "top" | "middle" | "bottom";

type TextBoxToolbar = {
  offset?: number;
  minFontSize: number;
  maxFontSize: number;
  fontSize: number;
  fontFamily: string;
  fontLabel: string;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  isBold: boolean;
  isUnderline: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  align: TextAlign;
  alignY: TextAlignY;
  onFontSizeChange: (value: number) => void;
  onFontSizeStep: (delta: number) => void;
  onLineHeightChange: (value: number) => void;
  onLetterSpacingChange: (value: number) => void;
  onColorChange: (value: string) => void;
  onFontFamilyClick: () => void;
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onToggleItalic: () => void;
  onToggleStrikethrough: () => void;
  onAlignChange: (value: TextAlign) => void;
  onAlignYChange: (value: TextAlignY) => void;
};

export interface TextBoxProps {
  text: string;
  richText?: string;
  editable?: boolean;
  rect: Rect;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  showChrome?: boolean;
  textClassName?: string;
  textStyle?: CSSProperties;
  textAlign?: TextAlign;
  textAlignY?: TextAlignY;
  isSelected?: boolean;
  selectionCount?: number;
  isEditing?: boolean;
  locked?: boolean;
  clipOverflow?: boolean;
  widthMode?: "auto" | "fixed" | "element";
  showToolbar?: boolean;
  toolbar?: TextBoxToolbar;
  onTextChange?: (text: string, richText?: string) => void;
  onRectChange?: (rect: Rect) => void;
  onWidthModeChange?: (mode: "auto" | "fixed" | "element") => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartEditing?: () => void;
  onFinishEditing?: () => void;
  onRequestDelete?: () => void;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => Rect;
}

export interface ActiveListeners {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
}
