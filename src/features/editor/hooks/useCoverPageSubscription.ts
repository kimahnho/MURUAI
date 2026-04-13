/**
 * 표지 요청을 구독해 선택 페이지에 coverData를 패치하는 훅.
 * 표지는 페이지의 배경 장식으로 적용되며, 기존 요소 위에 렌더링된다.
 */
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useCoverPageStore } from "../store/coverPageStore";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updatePageById } from "../utils/pageMutation";
import { getCoverTemplate } from "../covers/coverTemplateRegistry";

type CoverPageSubscriptionParams = {
  pages: Page[];
  selectedPageId: string;
  selectedPageIdRef: ReadonlyRef<string>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  recordHistory: (label?: string) => void;
};

export const useCoverPageSubscription = ({
  pages,
  selectedPageId,
  selectedPageIdRef,
  setPages,
  recordHistory,
}: CoverPageSubscriptionParams) => {
  const syncCoverState = useCoverPageStore((s) => s.syncCoverState);

  // 선택 페이지 변경 시 해당 페이지의 coverData 동기화
  useEffect(() => {
    const activePage = pages.find((p) => p.id === selectedPageId);
    const coverData = activePage?.coverData ?? null;
    syncCoverState(Boolean(coverData), coverData);
  }, [pages, selectedPageId, syncCoverState]);

  useStoreSubscription({
    subscribe: useCoverPageStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.request),
    onChange: (state) => {
      const request = state.request;
      if (!request) return;
      const activePageId = selectedPageIdRef.current;

      if (request.type === "insert" || request.type === "change") {
        const template = getCoverTemplate(request.coverData.templateId);
        setPages((prev) =>
          updatePageById(prev, activePageId, (page) => ({
            ...page,
            coverData: request.coverData,
            background: template
              ? { type: "color" as const, color: template.palette.bg }
              : page.background,
          })),
        );
        recordHistory("표지 적용");
        return;
      }

      if (request.type === "remove") {
        setPages((prev) =>
          updatePageById(prev, activePageId, (page) => ({
            ...page,
            coverData: undefined,
            background: { type: "none" as const },
          })),
        );
        recordHistory("표지 제거");
      }
    },
    deps: [selectedPageIdRef, setPages, recordHistory],
  });
};
