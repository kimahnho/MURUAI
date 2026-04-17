/**
 * StoryBook 데이터를 에디터 Page[] 배열로 변환하는 모듈.
 * 레이아웃(6종)에 따라 이미지+텍스트 배치가 달라진다.
 */
import type { Page } from "@/features/editor/model/pageTypes";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";
import { measureTextBoxSize } from "@/features/editor/utils/textMeasure";

import type { PageLayout, StoryBook, StoryBookPage } from "../model/storybookTypes";
import { isLandscapeLayout } from "../model/storybookTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => Math.round(mm * MM_TO_PX);

// A4 세로: 210×297mm
const A4_V_W = mmToPx(210);
const A4_V_H = mmToPx(297);

// A4 가로: 297×210mm
const A4_H_W = mmToPx(297);
const A4_H_H = mmToPx(210);

const PADDING = mmToPx(10);

// ─── 헬퍼 ───

// 이미지 요소 — 항상 `isStandaloneImage: true` + `imageBox` 설정.
// placeholder(imageUrl 없음)일 때:
//  - 회색 fill + rect 내부 텍스트 "✨ 이미지 생성 중..." (ShapeElement.text 활용 → 별도 text 요소 불필요)
//  - `locked: true` 로 유저가 생성 중 삭제/이동 불가
// 패치 핸들러(`useEditorSubscriptions.imagePatchRequest`)가 `isStandaloneImage` 플래그로 요소를 찾아
// fill을 실제 이미지로 교체하면서 text/textStyle/locked를 제거한다.
const imageElement = (
  x: number,
  y: number,
  w: number,
  h: number,
  imageUrl: string | undefined,
): CanvasElement => {
  if (imageUrl) {
    return {
      id: crypto.randomUUID(),
      type: "rect",
      x,
      y,
      w,
      h,
      fill: `url(${imageUrl})`,
      imageBox: { x: 0, y: 0, w, h },
      isStandaloneImage: true,
    };
  }
  return {
    id: crypto.randomUUID(),
    type: "rect",
    x,
    y,
    w,
    h,
    fill: "#E5E7EB",
    imageBox: { x: 0, y: 0, w, h },
    isStandaloneImage: true,
    locked: true,
    text: "✨ 이미지 생성 중...",
    textStyle: {
      fontSize: 22,
      fontWeight: "bold",
      fontFamily: "Pretendard",
      color: "#9CA3AF",
    },
  };
};

const textElement = (
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fontSize: number,
  fontFamily: string,
  color: string = "#333333",
): CanvasElement => ({
  id: crypto.randomUUID(),
  type: "text",
  x,
  y,
  w,
  h,
  text,
  widthMode: "fixed",
  style: {
    fontSize,
    fontWeight: "normal",
    fontFamily,
    color,
    alignX: "left",
    alignY: "top",
    lineHeight: 1.8,
    wordBreak: "keep-all",
  },
});

/** 텍스트 박스의 크기를 측정해 가용 공간 세로 중앙에 배치 */
const placeTextCentered = (
  text: string,
  fontSize: number,
  fontFamily: string,
  x: number,
  y: number,
  availableW: number,
  availableH: number,
  color?: string,
): CanvasElement => {
  const measured = measureTextBoxSize(text, fontSize, "normal", {
    maxWidth: availableW,
    lineHeight: 1.8,
    fontFamily,
    wordBreak: "keep-all",
  });
  const h = Math.min(measured.height, availableH);
  const yCentered = y + Math.max(0, (availableH - h) / 2);
  return textElement(x, Math.round(yCentered), availableW, h, text, fontSize, fontFamily, color);
};

// ─── 레이아웃별 빌더 ───

// 상단 이미지 + 하단 텍스트
const buildVerticalElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const imgW = 780;
  const imgH = 500;
  const imgX = Math.round((A4_V_W - imgW) / 2);
  const imgY = mmToPx(30);

  const textStartY = imgY + imgH + PADDING;
  const textW = A4_V_W - PADDING * 2;
  const availableH = A4_V_H - textStartY - PADDING;

  return [
    imageElement(imgX, imgY, imgW, imgH, page.imageUrl),
    placeTextCentered(page.text, 36, fontFamily, PADDING, textStartY, textW, availableH),
  ];
};

// 좌측 이미지 + 우측 텍스트 (가로)
const buildHorizontalElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const imgW = 540;
  const imgH = 680;
  const imgY = Math.round((A4_H_H - imgH) / 2);

  const textX = imgW + PADDING;
  const textW = A4_H_W - imgW - PADDING * 2;
  const availableH = A4_H_H - PADDING * 2;

  return [
    imageElement(0, imgY, imgW, imgH, page.imageUrl),
    placeTextCentered(page.text, 32, fontFamily, textX, PADDING, textW, availableH),
  ];
};

// 전체 이미지 위에 하단 텍스트 (반투명 흰 배경)
const buildFullscreenBottomElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const overlayH = Math.round(A4_V_H * 0.25);
  const overlayY = A4_V_H - overlayH;
  const textInnerY = overlayY + PADDING;
  const textInnerX = PADDING;
  const textW = A4_V_W - PADDING * 2;
  const textAvailableH = overlayH - PADDING * 2;

  return [
    imageElement(0, 0, A4_V_W, A4_V_H, page.imageUrl),
    {
      id: crypto.randomUUID(),
      type: "rect",
      x: 0,
      y: overlayY,
      w: A4_V_W,
      h: overlayH,
      fill: "rgba(255, 255, 255, 0.85)",
    },
    placeTextCentered(page.text, 34, fontFamily, textInnerX, textInnerY, textW, textAvailableH),
  ];
};

// 전체 이미지 위에 상단 텍스트
const buildFullscreenTopElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const overlayH = Math.round(A4_V_H * 0.25);
  const textInnerY = PADDING;
  const textInnerX = PADDING;
  const textW = A4_V_W - PADDING * 2;
  const textAvailableH = overlayH - PADDING * 2;

  return [
    imageElement(0, 0, A4_V_W, A4_V_H, page.imageUrl),
    {
      id: crypto.randomUUID(),
      type: "rect",
      x: 0,
      y: 0,
      w: A4_V_W,
      h: overlayH,
      fill: "rgba(255, 255, 255, 0.85)",
    },
    placeTextCentered(page.text, 34, fontFamily, textInnerX, textInnerY, textW, textAvailableH),
  ];
};

// 가로 A4 — 좌측 텍스트 + 우측 이미지
const buildTextLeftElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const textW = Math.round(A4_H_W * 0.4) - PADDING;
  const textX = PADDING;
  const textY = PADDING;
  const textAvailableH = A4_H_H - PADDING * 2;

  const imgW = A4_H_W - textW - PADDING * 2;
  const imgH = A4_H_H;
  const imgX = textW + PADDING * 2;
  const imgY = 0;

  return [
    placeTextCentered(page.text, 32, fontFamily, textX, textY, textW, textAvailableH),
    imageElement(imgX, imgY, imgW, imgH, page.imageUrl),
  ];
};

// 세로 A4 — 상단 텍스트 + 하단 이미지
const buildTextTopElements = (
  page: StoryBookPage,
  fontFamily: string,
): CanvasElement[] => {
  const textAvailableH = Math.round(A4_V_H * 0.3) - PADDING;
  const textX = PADDING;
  const textY = PADDING;
  const textW = A4_V_W - PADDING * 2;

  const imgY = textAvailableH + PADDING;
  const imgH = A4_V_H - imgY;
  const imgW = A4_V_W;
  const imgX = 0;

  return [
    placeTextCentered(page.text, 34, fontFamily, textX, textY, textW, textAvailableH),
    imageElement(imgX, imgY, imgW, imgH, page.imageUrl),
  ];
};

// ─── 레이아웃 디스패치 ───

const buildElements = (
  page: StoryBookPage,
  fontFamily: string,
  layout: PageLayout,
): CanvasElement[] => {
  switch (layout) {
    case "vertical":
      return buildVerticalElements(page, fontFamily);
    case "horizontal":
      return buildHorizontalElements(page, fontFamily);
    case "fullscreen-bottom":
      return buildFullscreenBottomElements(page, fontFamily);
    case "fullscreen-top":
      return buildFullscreenTopElements(page, fontFamily);
    case "text-left":
      return buildTextLeftElements(page, fontFamily);
    case "text-top":
      return buildTextTopElements(page, fontFamily);
  }
};

// ─── 메인 함수 ───

export const buildStoryPages = (book: StoryBook): Page[] => {
  const landscape = isLandscapeLayout(book.layout);

  return book.pages.map((storyPage, index) => {
    const rawElements = buildElements(storyPage, book.fontFamily, book.layout);
    return {
      id: crypto.randomUUID(),
      pageNumber: index + 1,
      templateId: null,
      orientation: landscape ? ("horizontal" as const) : ("vertical" as const),
      elements: withLogoCanvasElements(rawElements),
      rev: 0,
    };
  });
};
