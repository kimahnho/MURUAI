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
};

const extractFromElement = (
  el: CanvasElement,
  pageId: string,
  pageNumber: number,
): TextItem[] => {
  const items: TextItem[] = [];

  if (el.type === "text") {
    if (el.text.trim()) {
      items.push({ elementId: el.id, pageId, pageNumber, field: "text", text: el.text });
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
          });
        }
      });
    });
  } else if (
    (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") &&
    el.text?.trim()
  ) {
    items.push({ elementId: el.id, pageId, pageNumber, field: "text", text: el.text });
  }

  return items;
};

export const extractTextsFromPages = (pages: Page[]): TextItem[] =>
  pages.flatMap((page) =>
    page.elements.flatMap((el) => extractFromElement(el, page.id, page.pageNumber)),
  );
