/**
 * 선 긋기 (다양한 선) 템플릿: 좌우 이미지 박스 사이에 다양한 형태의 점선을 따라 그리는 학습지.
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

// 색상
const BOX_BORDER_COLOR = "#BDBDBD";
const IMAGE_SLOT_FILL = "#F5F5F5";
const GUIDE_TEXT_COLOR = "#BDBDBD";

// 곡선 SVG 공통
const LINE_W_MM = 112;
const LINE_H_MM = BOX_SIZE;
const CONTENT_PX_W = Math.round(mmToPx(LINE_W_MM));
const CONTENT_PX_H = Math.round(mmToPx(LINE_H_MM));
const PAD = 5;
const SVG_W = CONTENT_PX_W + PAD * 2;
const SVG_H = CONTENT_PX_H + PAD * 2;
const CY = SVG_H / 2;
const X0 = PAD;
const X1 = PAD + CONTENT_PX_W;
const STROKE_ATTRS = 'stroke="%239E9E9E" stroke-width="2" stroke-dasharray="6 4" fill="none" stroke-linecap="round"';
const DOT_R = 3;
const DOT_FILL = "%239E9E9E";

const dot = (cx: number, cy: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${DOT_R}" fill="${DOT_FILL}"/>`;

const buildSvgDataUri = (pathD: string, dotStart: [number, number], dotEnd: [number, number]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}"><path d="${pathD}" ${STROKE_ATTRS}/>${dot(...dotStart)}${dot(...dotEnd)}</svg>`;
  return `data:image/svg+xml,${svg.replace(/#/g, "%23")}`;
};

const PW = CONTENT_PX_W;

// 행 1: 아치형 곡선 — 위로 크게 올라갔다 내려오는 포물선
const archPath = (() => {
  const amp = CONTENT_PX_H * 0.85;
  const midX = X0 + PW / 2;
  return `M ${X0},${CY} Q ${midX},${CY - amp} ${X1},${CY}`;
})();

// 행 2: 지그재그 — 날카로운 V자 상하 반복
const zigzagPath = (() => {
  const amp = CONTENT_PX_H * 0.35;
  const count = 7;
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

// 행 3: 사다리꼴 패턴 — 수평→대각선↗→수평→대각선↘ 반복
const trapezoidPath = (() => {
  const amp = CONTENT_PX_H * 0.35;
  const reps = 2;
  // 각 반복: 하단수평 + 대각선↗ + 상단수평 + 대각선↘
  const segW = PW / (reps * 4 + 1); // +1 for leading flat
  let d = `M ${X0},${CY}`;
  let cx = X0;
  // 첫 수평 구간
  cx += segW;
  d += ` L ${cx},${CY}`;
  for (let i = 0; i < reps; i++) {
    // 대각선 상승
    d += ` L ${cx + segW},${CY - amp}`;
    cx += segW;
    // 상단 수평
    d += ` L ${cx + segW * 2},${CY - amp}`;
    cx += segW * 2;
    // 대각선 하강
    d += ` L ${cx + segW},${CY}`;
    cx += segW;
  }
  return d;
})();

// 행 4: 완만한 S커브 — 하나의 넓은 물결
const gentleSCurvePath = (() => {
  const amp = CONTENT_PX_H * 0.4;
  const x = (r: number) => X0 + PW * r;
  return `M ${X0},${CY} C ${x(0.2)},${CY - amp} ${x(0.35)},${CY - amp} ${x(0.5)},${CY} C ${x(0.65)},${CY + amp} ${x(0.8)},${CY + amp} ${X1},${CY}`;
})();

// 행 5: 물결 곡선 — 부드러운 2~3봉우리 파동
const wavePath = (() => {
  const amp = CONTENT_PX_H * 0.3;
  const seg = PW / 3;
  const x = (v: number) => X0 + v;
  return `M ${x(0)},${CY} C ${x(seg * 0.3)},${CY - amp} ${x(seg * 0.7)},${CY - amp} ${x(seg)},${CY} C ${x(seg * 1.3)},${CY + amp} ${x(seg * 1.7)},${CY + amp} ${x(seg * 2)},${CY} C ${x(seg * 2.3)},${CY - amp} ${x(seg * 2.7)},${CY - amp} ${x(seg * 3)},${CY}`;
})();

const variousSvgPatterns = [
  buildSvgDataUri(archPath, [X0, CY], [X1, CY]),
  buildSvgDataUri(zigzagPath, [X0, CY], [X1, CY]),
  buildSvgDataUri(trapezoidPath, [X0, CY], [X1, CY]),
  buildSvgDataUri(gentleSCurvePath, [X0, CY], [X1, CY]),
  buildSvgDataUri(wavePath, [X0, CY], [X1, CY]),
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
    text: "점선 따라그리기 (다양한 선)",
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

// 본문 행 (5행): 좌측 이미지 박스 + 다양한 점선 + 우측 이미지 박스
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
      // 다양한 점선 (SVG 이미지)
      {
        type: "rect" as const,
        x: mmToPx(lineStartX),
        y: mmToPx(rowY),
        w: mmToPx(LINE_W_MM),
        h: mmToPx(LINE_H_MM),
        fill: variousSvgPatterns[rowIndex],
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

export const variousLineTracingTemplate: Template = {
  id: "variousLineTracing",
  name: "선 긋기 (다양한 선)",
  elements: [...headerElements, ...bodyRows],
};
