/**
 * 페이지 설정 패널 요청을 구독해 활성 페이지의 배경/번호 설정에 반영하는 훅.
 */
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { usePageSettingsStore } from "../store/pageSettingsStore";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updatePageById } from "../utils/pageMutation";
import {
  resolvePageBackground,
  resolvePageNumbering,
} from "../utils/pagePresentation";

type PageSettingsSubscriptionParams = {
  pages: Page[];
  selectedPageId: string;
  selectedPageIdRef: ReadonlyRef<string>;
  setPages: Dispatch<SetStateAction<Page[]>>;
};

export const usePageSettingsSubscription = ({
  pages,
  selectedPageId,
  selectedPageIdRef,
  setPages,
}: PageSettingsSubscriptionParams) => {
  const syncPanel = usePageSettingsStore((state) => state.syncPanel);

  useEffect(() => {
    const activePage = pages.find((page) => page.id === selectedPageId);
    if (!activePage) return;
    syncPanel({
      background: resolvePageBackground(activePage.background),
      numbering: resolvePageNumbering(activePage.numbering),
    });
  }, [pages, selectedPageId, syncPanel]);

  useStoreSubscription({
    subscribe: usePageSettingsStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.request),
    onChange: (state) => {
      const request = state.request;
      if (!request) return;
      const activePageId = selectedPageIdRef.current;
      setPages((prevPages) => {
        let nextPages = prevPages;
        // 배경은 활성 페이지에만 적용한다.
        if (request.background) {
          nextPages = updatePageById(nextPages, activePageId, (page) => ({
            ...page,
            background: request.background,
          }));
        }
        // 넘버링은 전체 페이지에 일괄 적용한다 (표지 페이지는 스킵).
        if (request.numbering) {
          nextPages = nextPages.map((page) => ({
            ...page,
            numbering: page.coverData ? page.numbering : request.numbering,
          }));
        }
        return nextPages;
      });
    },
    deps: [selectedPageIdRef, setPages],
  });
};
