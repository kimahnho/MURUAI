/**
 * 텍스트 요소 편집 훅에서 공유하는 상태/핸들러 타입 계약을 정의하는 모듈.
 */
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import type { Rect, ResizeHandle } from "../../../../model/canvasTypes";

type TextAlign = "left" | "center" | "right" | "justify";
type TextAlignY = "top" | "middle" | "bottom";

export type TextBoxToolbarState = {
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
};

export type TextBoxToolbarGlobalActions = {
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

/** 텍스트 선택 시 상단 툴바에 표시되는 공통 편집 액션 계약 */
type TextBoxToolbar = TextBoxToolbarState & TextBoxToolbarGlobalActions;

export type ToolbarFontSizeInputViewModel = {
  value: string;
  isDirty: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onFocus: () => void;
};

/** 캔버스 텍스트 박스 렌더러가 지원해야 하는 입력/상태/콜백 계약 */
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
  userResizedWidth?: boolean;
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

/** pointer 세션 종료 시 해제해야 하는 임시 전역 리스너 묶음 */
export interface ActiveListeners {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
}
