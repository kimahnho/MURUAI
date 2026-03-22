/**
 * 캔버스 전체 페이지에서 맞춤법 검사 대상 텍스트를 추출하는 유틸리티.
 */
import type { Page } from "../model/pageTypes";
import type { CanvasElement } from "../model/canvasTypes";

export type TextItem = {
  elementId: string;
  pageId: string;
  pageNumber: number;
  field: "text" | `cell-${number}-${number}`;
  text: string;
  isEmotionInference?: boolean;
};

// 페이지에 emotionInference subType 요소가 있으면 감정추론 페이지로 판별
const isEmotionInferencePage = (page: Page): boolean =>
  page.elements.some(
    (el) =>
      "subType" in el && el.subType === "emotionInference",
  );

const extractFromElement = (
  el: CanvasElement,
  pageId: string,
  pageNumber: number,
  isEmotionInference: boolean,
): TextItem[] => {
  // 템플릿 고정 요소(locked)는 맞춤법 검사에서 제외
  if (el.locked) return [];

  const items: TextItem[] = [];

  if (el.type === "text") {
    if (el.text.trim()) {
      items.push({ elementId: el.id, pageId, pageNumber, field: "text", text: el.text, isEmotionInference });
    }
  } else if (el.type === "table") {
    el.cells.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell.text.trim()) {
          items.push({
            elementId: el.id,
            pageId,
            pageNumber,
            field: `cell-${ri}-${ci}`,
            text: cell.text,
            isEmotionInference,
          });
        }
      });
    });
  } else if (
    (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") &&
    el.text?.trim()
  ) {
    items.push({ elementId: el.id, pageId, pageNumber, field: "text", text: el.text, isEmotionInference });
  }

  return items;
};

export const extractTextsFromPages = (pages: Page[]): TextItem[] =>
  pages.flatMap((page) => {
    const isEmotion = isEmotionInferencePage(page);
    return page.elements.flatMap((el) => extractFromElement(el, page.id, page.pageNumber, isEmotion));
  });
