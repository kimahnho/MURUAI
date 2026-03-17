/**
 * StoryBook 데이터를 에디터 Page[] 배열로 변환하는 모듈.
 * 레이아웃(세로/가로)에 따라 이미지+텍스트 배치가 달라진다.
 * 미리보기(PagePreviewPanel)와 동일한 1:1 비율로 배치한다.
 */
import type { Page } from "@/features/editor/model/pageTypes";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";
import { measureTextBoxSize } from "@/features/editor/utils/textMeasure";

import type { StoryBook, StoryBookPage } from "../model/storybookTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => Math.round(mm * MM_TO_PX);

// A4 세로: 210×297mm
const A4_V_W = mmToPx(210);
const A4_V_H = mmToPx(297);

// A4 가로: 297×210mm
const A4_H_W = mmToPx(297);
const A4_H_H = mmToPx(210);

const PADDING = mmToPx(10);

// ─── 세로형 레이아웃: 상단 이미지 + 하단 텍스트 (1:1 비율) ───

const buildVerticalElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {

  const elements: CanvasElement[] = [];

  // 이미지 영역 (상단 — 780×500, 로고 아래로 약간 내림)
  const vImageW = 780;
  const vImageH = 500;
  const vImageX = Math.round((A4_V_W - vImageW) / 2);
  const vImageY = mmToPx(5);
  if (page.imageUrl) {
    elements.push({
      id: crypto.randomUUID(),
      type: "rect",
      x: vImageX,
      y: vImageY,
      w: vImageW,
      h: vImageH,
      fill: `url(${page.imageUrl})`,
      imageBox: { x: 0, y: 0, w: vImageW, h: vImageH },
      isStandaloneImage: true,
    });
  } else {
    // 이미지 미생성 시 플레이스홀더 박스
    elements.push({
      id: crypto.randomUUID(),
      type: "rect",
      x: vImageX,
      y: vImageY,
      w: vImageW,
      h: vImageH,
      fill: "#E5E7EB",
    });
  }

  // 텍스트 영역 (이미지 아래 — 가용 공간 세로 중앙 배치)
  const vTextStartY = vImageY + vImageH + PADDING;
  const vTextW = A4_V_W - PADDING * 2;
  const vAvailableH = A4_V_H - vTextStartY - PADDING;
  const vMeasured = measureTextBoxSize(page.text, 36, "normal", {
    maxWidth: vTextW,
    lineHeight: 1.8,
    fontFamily,
    wordBreak: "keep-all",
  });
  const vTextH = Math.min(vMeasured.height, vAvailableH);
  const vTextY = vTextStartY + Math.max(0, (vAvailableH - vTextH) / 2);

  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: PADDING,
    y: Math.round(vTextY),
    w: vTextW,
    h: vTextH,
    text: page.text,
    widthMode: "fixed",
    style: {
      fontSize: 36,
      fontWeight: "normal",
      fontFamily,
      color: "#333333",
      alignX: "left",
      alignY: "top",
      lineHeight: 1.8,
      wordBreak: "keep-all",
    },
  });

  return elements;
};

// ─── 가로형 레이아웃: 좌측 이미지 + 우측 텍스트 (1:1 비율) ───

const buildHorizontalElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const elements: CanvasElement[] = [];

  // 이미지 영역 (좌측 — 540×680, 세로 중앙 정렬)
  const hImageW = 540;
  const hImageH = 680;
  const hImageY = Math.round((A4_H_H - hImageH) / 2);
  if (page.imageUrl) {
    elements.push({
      id: crypto.randomUUID(),
      type: "rect",
      x: 0,
      y: hImageY,
      w: hImageW,
      h: hImageH,
      fill: `url(${page.imageUrl})`,
      imageBox: { x: 0, y: 0, w: hImageW, h: hImageH },
      isStandaloneImage: true,
    });
  } else {
    // 이미지 미생성 시 플레이스홀더 박스
    elements.push({
      id: crypto.randomUUID(),
      type: "rect",
      x: 0,
      y: hImageY,
      w: hImageW,
      h: hImageH,
      fill: "#E5E7EB",
    });
  }

  // 텍스트 영역 (이미지 우측 — 가용 공간 세로 중앙 배치)
  const hTextW = A4_H_W - hImageW - PADDING * 2;
  const hAvailableH = A4_H_H - PADDING * 2;
  const hMeasured = measureTextBoxSize(page.text, 32, "normal", {
    maxWidth: hTextW,
    lineHeight: 1.8,
    fontFamily,
    wordBreak: "keep-all",
  });
  const hTextH = Math.min(hMeasured.height, hAvailableH);
  const hTextY = PADDING + Math.max(0, (hAvailableH - hTextH) / 2);

  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: hImageW + PADDING,
    y: Math.round(hTextY),
    w: hTextW,
    h: hTextH,
    text: page.text,
    widthMode: "fixed",
    style: {
      fontSize: 32,
      fontWeight: "normal",
      fontFamily,
      color: "#333333",
      alignX: "left",
      alignY: "top",
      lineHeight: 1.8,
      wordBreak: "keep-all",
    },
  });

  return elements;
};

// ─── 메인 함수 ───

export const buildStoryPages = (book: StoryBook): Page[] => {
  const isVertical = book.layout === "vertical";

  return book.pages.map((storyPage, index) => {
    const rawElements = isVertical
      ? buildVerticalElements(storyPage, book.fontFamily)
      : buildHorizontalElements(storyPage, book.fontFamily);

    return {
      id: crypto.randomUUID(),
      pageNumber: index + 1,
      templateId: null,
      orientation: isVertical ? ("vertical" as const) : ("horizontal" as const),
      elements: withLogoCanvasElements(rawElements),
      rev: 0,
    };
  });
};
