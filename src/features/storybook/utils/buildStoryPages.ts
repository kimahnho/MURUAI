/**
 * StoryBook 데이터를 에디터 Page[] 배열로 변환하는 모듈.
 * 레이아웃(세로/가로)에 따라 이미지+텍스트 배치가 달라진다.
 * 미리보기(PagePreviewPanel)와 동일한 1:1 비율로 배치한다.
 */
import type { Page } from "@/features/editor/model/pageTypes";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";

import type { StoryBook, StoryBookPage } from "../model/storybookTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => Math.round(mm * MM_TO_PX);

// A4 세로: 210×297mm
const A4_V_W = mmToPx(210);
const A4_V_H = mmToPx(297);

// A4 가로: 297×210mm
const A4_H_W = mmToPx(297);
const A4_H_H = mmToPx(210);

// 미리보기(PagePreviewPanel)와 동일한 정확히 50:50 분할
const HALF_V = Math.floor(A4_V_H / 2); // 세로형: 상단 이미지 높이 = 페이지 높이의 절반
const HALF_H = Math.floor(A4_H_W / 2); // 가로형: 좌측 이미지 너비 = 페이지 너비의 절반
const PADDING = mmToPx(10);

// 이미지 기본 크기 (Gemini 이미지 출력 기준)
const IMAGE_NATURAL_W = 1024;
const IMAGE_NATURAL_H = 576;

// ─── 세로형 레이아웃: 상단 이미지 + 하단 텍스트 (1:1 비율) ───

const buildVerticalElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {

  const elements: CanvasElement[] = [];

  // 이미지 영역 (상단 50% — 비율 유지, 세로 기준 맞춤)
  if (page.imageUrl) {
    const fitW = Math.round(HALF_V * (IMAGE_NATURAL_W / IMAGE_NATURAL_H));
    const imageW = Math.min(fitW, A4_V_W);
    const imageX = Math.round((A4_V_W - imageW) / 2);
    elements.push({
      id: crypto.randomUUID(),
      type: "rect",
      x: imageX,
      y: 0,
      w: imageW,
      h: HALF_V,
      fill: `url(${page.imageUrl})`,
      imageBox: { x: 0, y: 0, w: imageW, h: HALF_V },
      isStandaloneImage: true,
    });
  }

  // 텍스트 영역 (하단 50% — 세로 중앙 정렬)
  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: PADDING,
    y: HALF_V + PADDING,
    w: A4_V_W - PADDING * 2,
    h: A4_V_H - HALF_V - PADDING * 2,
    text: page.text,
    widthMode: "fixed",
    lockHeight: true,
    style: {
      fontSize: 36,
      fontWeight: "normal",
      fontFamily,
      color: "#333333",
      alignX: "left",
      alignY: "middle",
      lineHeight: 1.8,
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

  // 이미지 영역 (좌측 50% — 비율 유지, 너비 기준 맞춤)
  if (page.imageUrl) {
    const fitH = Math.round(HALF_H * (IMAGE_NATURAL_H / IMAGE_NATURAL_W));
    const imageH = Math.min(fitH, A4_H_H);
    const imageY = Math.round((A4_H_H - imageH) / 2);
    elements.push({
      id: crypto.randomUUID(),
      type: "rect",
      x: 0,
      y: imageY,
      w: HALF_H,
      h: imageH,
      fill: `url(${page.imageUrl})`,
      imageBox: { x: 0, y: 0, w: HALF_H, h: imageH },
      isStandaloneImage: true,
    });
  }

  // 텍스트 영역 (우측 50% — 세로 중앙 정렬)
  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: HALF_H + PADDING,
    y: PADDING,
    w: A4_H_W - HALF_H - PADDING * 2,
    h: A4_H_H - PADDING * 2,
    text: page.text,
    widthMode: "fixed",
    lockHeight: true,
    style: {
      fontSize: 32,
      fontWeight: "normal",
      fontFamily,
      color: "#333333",
      alignX: "left",
      alignY: "middle",
      lineHeight: 1.8,
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
