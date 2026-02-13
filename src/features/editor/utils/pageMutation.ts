import type { CanvasElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import { bumpPageRevision } from "./pageRevision";

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

export const updateElementsByPageId = (
  pages: Page[],
  pageId: string,
  updater: (elements: CanvasElement[]) => CanvasElement[],
): Page[] =>
  updatePageById(pages, pageId, (page) => ({
    ...page,
    elements: updater(page.elements),
  }));
