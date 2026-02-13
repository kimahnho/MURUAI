import type { CanvasElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import { bumpPageRevision } from "./pageRevision";

/**
 * 특정 페이지만 업데이트하고 revision 증가를 일관되게 적용한다.
 */
export const updatePageById = (
  pages: Page[],
  pageId: string,
  updater: (page: Page) => Page,
): Page[] =>
  pages.map((page) => {
    if (page.id !== pageId) return page;
    const nextPage = updater(page);
    return bumpPageRevision(nextPage);
  });

/**
 * pageId에 해당하는 페이지의 elements 배열만 교체한다.
 * 내부적으로 updatePageById를 호출해 revision 누락을 막는다.
 */
export const updateElementsByPageId = (
  pages: Page[],
  pageId: string,
  updater: (elements: CanvasElement[]) => CanvasElement[],
): Page[] =>
  updatePageById(pages, pageId, (page) => ({
    ...page,
    elements: updater(page.elements),
  }));
