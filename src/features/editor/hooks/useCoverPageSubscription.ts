/**
 * 표지 페이지 요청을 구독해 페이지 삽입/변경/제거를 처리하는 훅.
 */
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import { useCoverPageStore } from "../store/coverPageStore";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { bumpPageRevision } from "../utils/pageRevision";
import { getCoverTemplate } from "../covers/coverTemplateRegistry";
import { withLogoCanvasElements } from "../utils/logoElement";

type CoverPageSubscriptionParams = {
  pages: Page[];
  setPages: Dispatch<SetStateAction<Page[]>>;
  setActivePage: (pageId: string) => void;
  recordHistory: (label?: string) => void;
};

/** pages[0]에 coverData가 있는지 확인 */
const hasCoverPage = (pages: Page[]): boolean =>
  pages.length > 0 && Boolean(pages[0].coverData);

export const useCoverPageSubscription = ({
  pages,
  setPages,
  setActivePage,
  recordHistory,
}: CoverPageSubscriptionParams) => {
  const syncCoverState = useCoverPageStore((s) => s.syncCoverState);

  // 페이지 변경 시 스토어 동기화
  useEffect(() => {
    const hasCover = hasCoverPage(pages);
    syncCoverState(hasCover, hasCover ? pages[0].coverData ?? null : null);
  }, [pages, syncCoverState]);

  useStoreSubscription({
    subscribe: useCoverPageStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.request),
    onChange: (state) => {
      const request = state.request;
      if (!request) return;

      if (request.type === "insert") {
        const template = getCoverTemplate(request.coverData.templateId);
        const newPage: Page = {
          id: crypto.randomUUID(),
          pageNumber: 1,
          elements: withLogoCanvasElements([]),
          coverData: request.coverData,
          background: template
            ? { type: "color", color: template.palette.bg }
            : { type: "none" },
          numbering: {
            enabled: false,
            format: "number",
            position: "bottom-center",
            startPage: 1,
          },
          orientation: "vertical",
          rev: 0,
        };

        setPages((prev) => {
          // 이미 표지가 있으면 교체
          if (hasCoverPage(prev)) {
            const updated = bumpPageRevision({ ...prev[0], coverData: request.coverData });
            return [updated, ...prev.slice(1)];
          }
          // 새 표지 삽입 + 페이지 번호 재인덱싱
          const next = [newPage, ...prev];
          next.forEach((p, i) => { p.pageNumber = i + 1; });
          return next;
        });
        setActivePage(hasCoverPage(pages) ? pages[0].id : newPage.id);
        recordHistory("표지 추가");
        return;
      }

      if (request.type === "change") {
        const template = getCoverTemplate(request.coverData.templateId);
        setPages((prev) => {
          if (!hasCoverPage(prev)) return prev;
          const updated = bumpPageRevision({
            ...prev[0],
            coverData: request.coverData,
            background: template
              ? { type: "color", color: template.palette.bg }
              : prev[0].background,
          });
          return [updated, ...prev.slice(1)];
        });
        recordHistory("표지 변경");
        return;
      }

      if (request.type === "update-title") {
        setPages((prev) => {
          if (!hasCoverPage(prev)) return prev;
          const existing = prev[0].coverData;
          if (!existing) return prev;
          const updated = bumpPageRevision({
            ...prev[0],
            coverData: { ...existing, title: request.title },
          });
          return [updated, ...prev.slice(1)];
        });
        recordHistory("표지 제목 변경");
        return;
      }

      if (request.type === "remove") {
        setPages((prev) => {
          if (!hasCoverPage(prev)) return prev;
          const next = prev.slice(1);
          next.forEach((p, i) => { p.pageNumber = i + 1; });
          return next;
        });
        // 제거 후 첫 번째 컨텐츠 페이지로 이동
        if (pages.length > 1) {
          setActivePage(pages[1].id);
        }
        recordHistory("표지 제거");
      }
    },
    deps: [setPages, setActivePage, recordHistory, pages],
  });
};
