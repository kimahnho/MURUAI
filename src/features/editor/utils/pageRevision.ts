/**
 * 페이지 revision 증가/보정 규칙을 공통화하는 유틸 모듈.
 */
import type { Page } from "../model/pageTypes";

export const ensurePageRevision = (page: Page): Page => {
  if (page.rev == null) {
    return { ...page, rev: 0 };
  }
  return page;
};

export const bumpPageRevision = (page: Page): Page => ({
  ...page,
  rev: (page.rev ?? 0) + 1,
});

