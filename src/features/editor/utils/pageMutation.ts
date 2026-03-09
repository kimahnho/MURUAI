/**
 * 페이지/요소 갱신 패턴을 공통화해 setPages 보일러플레이트를 줄이는 모듈.
 */
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
): Page[] => {
  let didChange = false;
  const nextPages = pages.map((page) => {
    if (page.id !== pageId) return page;
    const nextPage = updater(page);
    if (nextPage === page) return page;
    didChange = true;
    return bumpPageRevision(nextPage);
  });
  return didChange ? nextPages : pages;
};

/**
 * pageId에 해당하는 페이지의 elements 배열만 교체한다.
 * 내부적으로 updatePageById를 호출해 revision 누락을 막는다.
 */
export const updateElementsByPageId = (
  pages: Page[],
  pageId: string,
  updater: (elements: CanvasElement[]) => CanvasElement[],
): Page[] =>
  updatePageById(pages, pageId, (page) => {
    const nextElements = updater(page.elements);
    if (nextElements === page.elements) return page;
    return { ...page, elements: nextElements };
  });
