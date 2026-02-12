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
