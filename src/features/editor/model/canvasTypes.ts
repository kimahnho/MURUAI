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
  | "emotionCard"
  | "freeform";

/** 워크시트 컴포넌트 소속 마커 — 요소가 어떤 워크시트 컴포넌트에 속하는지 식별 */
export type WorksheetMeta = {
  componentId: string;   // InsertedWorksheetComponent.id
  componentType: string; // WorksheetComponentType
  /** 마인드맵 전용: 이 요소가 대응하는 MindMapNode.id */
  mindMapNodeId?: string;
  /** 마인드맵 전용: 부모 노드의 id (center 또는 L1-N, 중심 노드는 null). 드래그 시 자식 추종에 사용 */
  mindMapParentId?: string | null;
};

export type ElementBase = {
  id: string;
  type: ElementType;
  visible?: boolean;
  locked?: boolean;
  selectable?: boolean;
  groupId?: string;
  /** 워크시트 컴포넌트 소속 마커 — 존재하면 이 요소는 워크시트 컴포넌트의 일부 */
  worksheetMeta?: WorksheetMeta;
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
  /** 자모 분해 모드 — 조음 치료 음소 강조용 */
  jamoMode?: "off" | "conjoining" | "split";
  /** 자모 모드에서 강조할 자모 → 색상 매핑 */
  jamoHighlights?: Record<string, string>;
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
    wordBreak?: "normal" | "break-all" | "keep-all";
    /** 텍스트 외곽선 (-webkit-text-stroke) */
    textStroke?: {
      enabled: boolean;
      width: number;    // px
      color: string;
    };
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
    italic?: boolean;
    underline?: boolean;
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

export type TableBorderStyle = "solid" | "dashed" | "dotted";

export type TableBorderLine = {
  color: string;
  width: number;
  style: TableBorderStyle;
};

export type TableBorderConfig = {
  outer?: TableBorderLine | null;      // 외곽 4변 (null = 없음)
  horizontal?: TableBorderLine | null;  // 내부 가로선 (행 사이)
  vertical?: TableBorderLine | null;    // 내부 세로선 (열 사이)
};

export type CellDiagonal = "backslash" | "slash" | "cross";

export type TableCellStyle = {
  fontSize: number;                      // 기본값 13
  fontFamily?: string;
  alignX: "left" | "center" | "right";  // 기본값 "center"
  alignY?: "top" | "middle" | "bottom"; // 기본값 "middle" (세로 정렬)
  fontWeight?: "normal" | "bold" | number;
  color?: string;                        // 기본값 "#000000"
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;              // 셀 배경색 (undefined = 투명)
  diagonal?: CellDiagonal | null;        // 빗금 방향 (\, /, X, 없음)
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
  borderConfig?: TableBorderConfig;  // undefined이면 기본값(1px solid #000000 전체) 사용
  diagonalColor?: string;  // 빗금 색상 (테이블 일괄, 기본값 "#000000")
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

export type FreeformElement = ElementBase & {
  type: "freeform";
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0~1 정규화 좌표 (바운딩 박스 기준). SVG viewBox로 렌더링하므로 리사이즈 시 자동 스케일 */
  points: Array<{ x: number; y: number }>;
  /** 시작/끝점이 만나면 true — 채우기/테두리 편집 가능 */
  closed: boolean;
  /** 매끈하게 — Catmull-Rom 스플라인으로 곡선화 */
  smooth?: boolean;
  fill: string;
  stroke: {
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted";
  };
  border?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted" | "double";
  };
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
  };
};

export type CanvasElement = TextElement | ShapeElement | LineElement | TableElement | AacCardElement | EmotionCardElement | FreeformElement;

export type TemplateElement =
  | Omit<TextElement, "id">
  | Omit<ShapeElement, "id">
  | Omit<LineElement, "id">
  | Omit<TableElement, "id">
  | Omit<AacCardElement, "id">
  | Omit<EmotionCardElement, "id">
  | Omit<FreeformElement, "id">;

export type Template = {
  id: string;
  name: string;
  elements: TemplateElement[];
};
