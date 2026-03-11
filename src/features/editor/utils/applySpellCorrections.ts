/**
 * 맞춤법 교정 결과를 캔버스 페이지에 반영하는 유틸리티.
 * 불변 업데이트로 새 Page[] 배열을 반환한다.
 */
import type { Page } from "../model/pageTypes";
import type { CanvasElement } from "../model/canvasTypes";
import type { SpellCheckResult, SpellCorrection } from "../ai/checkSpelling";

// 텍스트 내 모든 correction을 순서대로 적용 (plain text, richText HTML 공용)
const applyTextCorrections = (text: string, corrections: SpellCorrection[]): string =>
  corrections.reduce((acc, c) => acc.replaceAll(c.original, c.corrected), text);

const patchElement = (
  el: CanvasElement,
  result: SpellCheckResult,
): CanvasElement => {
  if (result.field === "text") {
    if (el.type === "text") {
      const newText = applyTextCorrections(el.text, result.corrections);
      const newRichText = el.richText
        ? applyTextCorrections(el.richText, result.corrections)
        : undefined;
      return { ...el, text: newText, richText: newRichText };
    }
    if (
      (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") &&
      el.text
    ) {
      return { ...el, text: applyTextCorrections(el.text, result.corrections) };
    }
  }

  // 테이블 셀: field = "cell-{row}-{col}"
  const cellMatch = result.field.match(/^cell-(\d+)-(\d+)$/);
  if (cellMatch && el.type === "table") {
    const row = Number(cellMatch[1]);
    const col = Number(cellMatch[2]);
    if (el.cells[row]?.[col]) {
      const newCells = el.cells.map((r, ri) =>
        ri === row
          ? r.map((c, ci) =>
              ci === col
                ? { ...c, text: applyTextCorrections(c.text, result.corrections) }
                : c,
            )
          : r,
      );
      return { ...el, cells: newCells };
    }
  }

  return el;
};

export const applyCorrections = (
  pages: Page[],
  results: SpellCheckResult[],
): Page[] => {
  // elementId → SpellCheckResult[] 매핑
  const resultsByElement = new Map<string, SpellCheckResult[]>();
  for (const r of results) {
    const list = resultsByElement.get(r.elementId) ?? [];
    list.push(r);
    resultsByElement.set(r.elementId, list);
  }

  return pages.map((page) => {
    const pageResults = results.filter((r) => r.pageId === page.id);
    if (pageResults.length === 0) return page;

    const newElements = page.elements.map((el) => {
      const elResults = resultsByElement.get(el.id);
      if (!elResults) return el;

      return elResults
        .filter((r) => r.pageId === page.id)
        .reduce<CanvasElement>((acc, r) => patchElement(acc, r), el);
    });

    return { ...page, elements: newElements };
  });
};
