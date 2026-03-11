/**
 * 선 긋기 (직선) 템플릿: 좌우 이미지 박스 사이에 수평 직선 점선을 따라 그리는 학습지.
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

// 직선 SVG 공통
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

const straightLineSvg = (() => {
  const pathD = `M ${X0},${CY} L ${X1},${CY}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}"><path d="${pathD}" ${STROKE_ATTRS}/><circle cx="${X0}" cy="${CY}" r="${DOT_R}" fill="${DOT_FILL}"/><circle cx="${X1}" cy="${CY}" r="${DOT_R}" fill="${DOT_FILL}"/></svg>`;
  return `data:image/svg+xml,${svg.replace(/#/g, "%23")}`;
})();

// 상단 요소
const headerElements: TemplateElement[] = [
  {
    type: "text",
    x: mmToPx(MARGIN_X),
    y: mmToPx(TITLE_Y),
    w: mmToPx(CONTENT_W * 0.65),
    h: mmToPx(TITLE_H),
    text: "점선 따라그리기 (직선)",
    style: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#111827",
      underline: false,
      alignX: "left",
      alignY: "middle",
    },
  },
  {
    type: "text",
    x: mmToPx(MARGIN_X + CONTENT_W * 0.65 - 30),
    y: mmToPx(DATE_Y),
    w: mmToPx(CONTENT_W * 0.35 + 30),
    h: mmToPx(DATE_H),
    text: "월    일   이름 :",
    style: {
      fontSize: 16,
      fontWeight: "normal",
      color: "#111827",
      underline: false,
      alignX: "right",
      alignY: "middle",
    },
  },
  {
    type: "line" as const,
    start: { x: mmToPx(MARGIN_X), y: mmToPx(DIVIDER_Y) },
    end: { x: mmToPx(MARGIN_X + CONTENT_W), y: mmToPx(DIVIDER_Y) },
    stroke: { color: "#111827", width: 2, style: "solid" as const },
  },
  {
    type: "text",
    x: mmToPx(MARGIN_X),
    y: mmToPx(GUIDE_Y),
    w: mmToPx(CONTENT_W),
    h: mmToPx(GUIDE_H),
    text: "※ 점선을 따라 선을 그어보세요.",
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

// 본문 행 (5행): 좌측 이미지 박스 + 직선 점선 + 우측 이미지 박스
const rightBoxX = MARGIN_X + CONTENT_W - BOX_SIZE;
const lineStartX = MARGIN_X + BOX_SIZE + 3;

const bodyRows: TemplateElement[] = Array.from({ length: ROW_COUNT }).flatMap(
  (_, rowIndex) => {
    const rowY = BODY_START_Y + rowIndex * ROW_STEP;

    return [
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
      {
        type: "rect" as const,
        x: mmToPx(lineStartX),
        y: mmToPx(rowY),
        w: mmToPx(LINE_W_MM),
        h: mmToPx(LINE_H_MM),
        fill: straightLineSvg,
        radius: 0,
      },
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

export const straightLineTracingTemplate: Template = {
  id: "straightLineTracing",
  name: "선 긋기 (직선)",
  elements: [...headerElements, ...bodyRows],
};
