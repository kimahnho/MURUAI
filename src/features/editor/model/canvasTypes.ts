/**
 * 캔버스 요소 타입과 공통 속성 계약을 정의하는 모듈.
 */
// 캔버스 요소 공통 좌표/기하 타입
export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export type ElementType =
  | "text"
  | "rect"
  | "roundRect"
  | "ellipse"
  | "mosaic"
  | "circleMosaic"
  | "line"
  | "arrow"
  | "table"
  | "aacCard"
  | "emotionCard";

export type ElementBase = {
  id: string;
  type: ElementType;
  visible?: boolean;
  locked?: boolean;
  selectable?: boolean;
  groupId?: string;
};

export type TextElement = ElementBase & {
  type: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  richText?: string;
  widthMode?: "auto" | "fixed" | "element";
  userResizedWidth?: boolean;
  lockHeight?: boolean;
  style: {
    fontSize: number;
    fontWeight: "normal" | "bold" | number;
    fontFamily?: string;
    color: string;
    underline?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    alignX: "left" | "center" | "right" | "justify";
    alignY: "top" | "middle" | "bottom";
    lineHeight?: number;
    letterSpacing?: number;
  };
};

export type ShapeSubType = "emotionSlot" | "emotionInference" | "aacCard" | "imageSlot";

export type ShapeElement = ElementBase & {
  type: "rect" | "roundRect" | "ellipse" | "mosaic" | "circleMosaic";
  subType?: ShapeSubType;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  imageScale?: number;
  imageOffset?: {
    x: number;
    y: number;
  };
  imageBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  radius?: number;
  border?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted" | "double";
  };
  text?: string;
  textStyle?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    fontFamily?: string;
    color?: string;
  };
  labelId?: string;
  mosaicLevel?: number;
  isStandaloneImage?: boolean;
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number; // 0, 90, 180, 270
  };
};

export type LineElement = ElementBase & {
  type: "line" | "arrow";
  start: { x: number; y: number };
  end: { x: number; y: number };
  stroke: {
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted";
  };
  // 화살표 끝점 설정 (미설정 시 arrow → end-only, line → 없음)
  marker?: {
    start?: boolean;
    end?: boolean;
  };
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number; // 0, 90, 180, 270
  };
};

export type TableCellStyle = {
  fontSize: number;                      // 기본값 13
  fontFamily?: string;
  alignX: "left" | "center" | "right";  // 기본값 "center"
  fontWeight?: "normal" | "bold" | number;
  color?: string;                        // 기본값 "#000000"
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;              // 셀 배경색 (undefined = 투명)
};

export type TableCell = {
  text: string;
  style?: TableCellStyle;  // 개별 셀 스타일 (없으면 element.cellStyle → 기본값 순으로 fallback)
};

export type TableElement = ElementBase & {
  type: "table";
  x: number;
  y: number;
  w: number;
  h: number;
  rows: number;
  cols: number;
  cells: TableCell[][];
  // undefined 이면 균등 분배 (1fr × cols / 균등 행 높이)
  colWidths?: number[];   // 각 열 너비 (px, 합계 = w)
  rowHeights?: number[];  // 각 행 높이 (px, 합계 = h)
  cellStyle?: TableCellStyle;  // undefined이면 기본값(fontSize=13, alignX="center") 사용
};

export type AacCardLabelStyle = {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontFamily?: string;
  color: string;
};

export type AacCardElement = ElementBase & {
  type: "aacCard";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  backgroundColor?: string;
  imageBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  radius?: number;
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
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
  };
};

export type EmotionCardElement = ElementBase & {
  type: "emotionCard";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  backgroundColor?: string;
  imageBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  radius?: number;
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
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
  };
};

export type CanvasElement = TextElement | ShapeElement | LineElement | TableElement | AacCardElement | EmotionCardElement;

export type TemplateElement =
  | Omit<TextElement, "id">
  | Omit<ShapeElement, "id">
  | Omit<LineElement, "id">
  | Omit<TableElement, "id">
  | Omit<AacCardElement, "id">
  | Omit<EmotionCardElement, "id">;

export type Template = {
  id: string;
  name: string;
  elements: TemplateElement[];
};
