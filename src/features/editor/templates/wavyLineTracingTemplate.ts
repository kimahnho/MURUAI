/**
 * 선 긋기 (구불구불 선) 템플릿: 좌우 이미지 박스 사이에 구불구불 곡선 점선을 따라 그리는 학습지.
 */
import type { Template, TemplateElement } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// 페이지 & 여백
const MARGIN_X = 14;
const CONTENT_W = 210 - MARGIN_X * 2; // 182mm

// 상단 영역
const TITLE_Y = 12;
const TITLE_H = 14;
const DATE_Y = 14;
const DATE_H = 10;
const DIVIDER_Y = 28;
const GUIDE_Y = 32;
const GUIDE_H = 10;

// 본문 영역
const BODY_START_Y = 48;
const BOX_SIZE = 32;
const ROW_GAP = 14;
const ROW_STEP = BOX_SIZE + ROW_GAP; // 46mm
const ROW_COUNT = 5;
const BOX_RADIUS = 3;

// 점선 색상
const BOX_BORDER_COLOR = "#BDBDBD";
const IMAGE_SLOT_FILL = "#F5F5F5";
const GUIDE_TEXT_COLOR = "#BDBDBD";

// 곡선 SVG 공통
const LINE_W_MM = 112; // lineEndX - lineStartX (mm)
const LINE_H_MM = BOX_SIZE; // 이미지 박스와 동일 높이
const CONTENT_PX_W = Math.round(mmToPx(LINE_W_MM));
const CONTENT_PX_H = Math.round(mmToPx(LINE_H_MM));
const PAD = 5; // dot(r=3) + stroke(2) 잘림 방지 패딩
const SVG_W = CONTENT_PX_W + PAD * 2;
const SVG_H = CONTENT_PX_H + PAD * 2;
const CY = SVG_H / 2; // 수직 중심
const X0 = PAD; // path 시작 x (패딩 오프셋)
const X1 = PAD + CONTENT_PX_W; // path 끝 x
const STROKE_ATTRS = 'stroke="%239E9E9E" stroke-width="2" stroke-dasharray="6 4" fill="none" stroke-linecap="round"';
const DOT_R = 3;
const DOT_FILL = "%239E9E9E";

const dot = (cx: number, cy: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${DOT_R}" fill="${DOT_FILL}"/>`;

const buildSvgDataUri = (pathD: string, dotStart: [number, number], dotEnd: [number, number]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}"><path d="${pathD}" ${STROKE_ATTRS}/>${dot(...dotStart)}${dot(...dotEnd)}</svg>`;
  return `data:image/svg+xml,${svg.replace(/#/g, "%23")}`;
};

// path 내에서 사용할 콘텐츠 너비 (패딩 제외)
const PW = CONTENT_PX_W;

// 행 1: 물결선 (3봉우리 사인 커브)
const wave3Path = (() => {
  const amp = CONTENT_PX_H * 0.35;
  const seg = PW / 3;
  const x = (v: number) => X0 + v;
  return `M ${x(0)},${CY} C ${x(seg * 0.25)},${CY - amp} ${x(seg * 0.75)},${CY - amp} ${x(seg)},${CY} C ${x(seg * 1.25)},${CY + amp} ${x(seg * 1.75)},${CY - amp} ${x(seg * 2)},${CY} C ${x(seg * 2.25)},${CY + amp} ${x(seg * 2.75)},${CY + amp} ${x(seg * 3)},${CY}`;
})();

// 행 2: 완만한 S커브
const sCurvePath = (() => {
  const amp = CONTENT_PX_H * 0.35;
  const x = (r: number) => X0 + PW * r;
  return `M ${X0},${CY} C ${x(0.15)},${CY - amp} ${x(0.35)},${CY - amp} ${x(0.5)},${CY} C ${x(0.65)},${CY + amp} ${x(0.85)},${CY + amp} ${X1},${CY}`;
})();

// 행 3: 큰 S커브
const bigSCurvePath = (() => {
  const amp = CONTENT_PX_H * 0.42;
  const x = (r: number) => X0 + PW * r;
  return `M ${X0},${CY} C ${x(0.1)},${CY} ${x(0.2)},${CY + amp} ${x(0.35)},${CY + amp} C ${x(0.5)},${CY + amp} ${x(0.5)},${CY - amp} ${x(0.65)},${CY - amp} C ${x(0.8)},${CY - amp} ${x(0.9)},${CY} ${X1},${CY}`;
})();

// 행 4: 작은 파동 (빠른 사인파 5봉우리)
const smallWavePath = (() => {
  const amp = CONTENT_PX_H * 0.2;
  const count = 5;
  const seg = PW / count;
  let d = `M ${X0},${CY}`;
  for (let i = 0; i < count; i++) {
    const sx = X0 + seg * i;
    const ex = X0 + seg * (i + 1);
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` C ${sx + seg * 0.25},${CY + amp * dir} ${ex - seg * 0.25},${CY + amp * dir} ${ex},${CY}`;
  }
  return d;
})();

// 행 5: 지그재그 (V자 반복 5봉우리)
const zigzagPath = (() => {
  const amp = CONTENT_PX_H * 0.3;
  const count = 5;
  const seg = PW / count;
  let d = `M ${X0},${CY}`;
  for (let i = 0; i < count; i++) {
    const mid = X0 + seg * i + seg / 2;
    const end = X0 + seg * (i + 1);
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` L ${mid},${CY + amp * dir} L ${end},${CY}`;
  }
  return d;
})();

const wavySvgPatterns = [
  buildSvgDataUri(wave3Path, [X0, CY], [X1, CY]),
  buildSvgDataUri(sCurvePath, [X0, CY], [X1, CY]),
  buildSvgDataUri(bigSCurvePath, [X0, CY], [X1, CY]),
  buildSvgDataUri(smallWavePath, [X0, CY], [X1, CY]),
  buildSvgDataUri(zigzagPath, [X0, CY], [X1, CY]),
];

// 상단 요소
const headerElements: TemplateElement[] = [
  // 제목
  {
    type: "text",
    x: mmToPx(MARGIN_X),
    y: mmToPx(TITLE_Y),
    w: mmToPx(CONTENT_W * 0.65),
    h: mmToPx(TITLE_H),
    text: "점선 따라그리기 (구불구불 선)",
    locked: true,
    style: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#111827",
      underline: false,
      alignX: "left",
      alignY: "middle",
    },
  },
  // 날짜/이름
  {
    type: "text",
    x: mmToPx(MARGIN_X + CONTENT_W * 0.65 - 30),
    y: mmToPx(DATE_Y),
    w: mmToPx(CONTENT_W * 0.35 + 30),
    h: mmToPx(DATE_H),
    text: "월    일   이름 :",
    locked: true,
    style: {
      fontSize: 16,
      fontWeight: "normal",
      color: "#111827",
      underline: false,
      alignX: "right",
      alignY: "middle",
    },
  },
  // 구분선
  {
    type: "line" as const,
    start: { x: mmToPx(MARGIN_X), y: mmToPx(DIVIDER_Y) },
    end: { x: mmToPx(MARGIN_X + CONTENT_W), y: mmToPx(DIVIDER_Y) },
    stroke: { color: "#111827", width: 2, style: "solid" as const },
  },
  // 안내문
  {
    type: "text",
    x: mmToPx(MARGIN_X),
    y: mmToPx(GUIDE_Y),
    w: mmToPx(CONTENT_W),
    h: mmToPx(GUIDE_H),
    text: "※ 점선을 따라 선을 그어보세요.",
    locked: true,
    style: {
      fontSize: 18,
      fontWeight: "normal",
      color: "#111827",
      underline: false,
      alignX: "left",
      alignY: "middle",
    },
  },
];

// 본문 행 (5행): 좌측 이미지 박스 + 구불구불 곡선 점선 + 우측 이미지 박스
const rightBoxX = MARGIN_X + CONTENT_W - BOX_SIZE;
const lineStartX = MARGIN_X + BOX_SIZE + 3;

const bodyRows: TemplateElement[] = Array.from({ length: ROW_COUNT }).flatMap(
  (_, rowIndex) => {
    const rowY = BODY_START_Y + rowIndex * ROW_STEP;

    return [
      // 좌측 이미지 박스
      {
        type: "roundRect" as const,
        subType: "imageSlot" as const,
        x: mmToPx(MARGIN_X),
        y: mmToPx(rowY),
        w: mmToPx(BOX_SIZE),
        h: mmToPx(BOX_SIZE),
        fill: IMAGE_SLOT_FILL,
        radius: mmToPx(BOX_RADIUS),
        border: {
          enabled: true,
          color: BOX_BORDER_COLOR,
          width: 1.5,
          style: "solid" as const,
        },
        text: "",
        textStyle: {
          fontSize: 10,
          fontWeight: "normal" as const,
          color: GUIDE_TEXT_COLOR,
        },
      },
      // 구불구불 곡선 점선 (SVG 이미지)
      {
        type: "rect" as const,
        x: mmToPx(lineStartX),
        y: mmToPx(rowY),
        w: mmToPx(LINE_W_MM),
        h: mmToPx(LINE_H_MM),
        fill: wavySvgPatterns[rowIndex],
        radius: 0,
      },
      // 우측 이미지 박스
      {
        type: "roundRect" as const,
        subType: "imageSlot" as const,
        x: mmToPx(rightBoxX),
        y: mmToPx(rowY),
        w: mmToPx(BOX_SIZE),
        h: mmToPx(BOX_SIZE),
        fill: IMAGE_SLOT_FILL,
        radius: mmToPx(BOX_RADIUS),
        border: {
          enabled: true,
          color: BOX_BORDER_COLOR,
          width: 1.5,
          style: "solid" as const,
        },
        text: "",
        textStyle: {
          fontSize: 10,
          fontWeight: "normal" as const,
          color: GUIDE_TEXT_COLOR,
        },
      },
    ];
  },
);

export const wavyLineTracingTemplate: Template = {
  id: "wavyLineTracing",
  name: "선 긋기 (구불구불 선)",
  elements: [...headerElements, ...bodyRows],
};
