/**
 * 스왑된 페이지를 포함한 저장용 페이지 스냅샷을 해석하는 모듈.
 */
import type { Page } from "../model/pageTypes";
import { loadPageElementsBatch } from "./pageSwapStorage";

export const resolvePagesForPersistence = async (
  pages: Page[],
): Promise<Page[]> => {
  const swappedPages = pages.filter((page) => page.isSwapped);
  if (swappedPages.length === 0) {
    return pages;
  }

  const loadedMap = await loadPageElementsBatch(
    swappedPages.map((page) => page.id),
  );

  return pages.map((page) => {
    if (!page.isSwapped) return page;
    const hydratedElements = loadedMap.get(page.id);
    return {
      ...page,
      elements: hydratedElements ?? page.elements,
      isSwapped: false,
    };
  });
};
