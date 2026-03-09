/**
 * 페이지 추가/삭제/복제/이동 등 페이지 단위 편집 액션을 제공하는 훅.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { withLogoCanvasElements } from "../utils/logoElement";
import { cloneElementsWithNewIds } from "../utils/elementClone";
import type { Page } from "../model/pageTypes";
import { mp } from "@/shared/utils/mixpanel";
import { bumpPageRevision } from "../utils/pageRevision";

type PageActionsParams = {
  pages: Page[];
  selectedPageId: string;
  orientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical",
  ) => void;
};

export const usePageActions = ({
  pages,
  selectedPageId,
  orientation,
  setPages,
  setSelectedIds,
  setEditingTextId,
  setActivePage,
}: PageActionsParams) => {
  const handleAddPage = useCallback(() => {
    const newPageNumber = pages.length + 1;
    const newPage: Page = {
      id: crypto.randomUUID(),
      pageNumber: newPageNumber,
      templateId: null,
      elements: withLogoCanvasElements([]),
      orientation,
      rev: 0,
    };
    setPages([...pages, newPage]);
    setActivePage(newPage.id, newPage.orientation);
    mp.track("페이지 추가");
  }, [orientation, pages, setActivePage, setPages]);

  const handleAddPageAtIndex = useCallback(
    (index: number) => {
      const newPage: Page = {
        id: crypto.randomUUID(),
        pageNumber: index + 1,
        templateId: null,
        elements: withLogoCanvasElements([]),
        orientation,
        rev: 0,
      };

      const newPages = [...pages];
      newPages.splice(index, 0, newPage);

      const reorderedPages = newPages.map((page, idx) => ({
        ...page,
        pageNumber: idx + 1,
      }));
      // 중간 삽입 이후에는 전체 번호를 다시 부여해 썸네일/내보내기 번호를 일치시킨다.

      setPages(reorderedPages);
      setActivePage(newPage.id, newPage.orientation);
      mp.track("페이지 추가");
    },
    [orientation, pages, setActivePage, setPages],
  );

  const handleSelectPage = useCallback(
    (pageId: string) => {
      setActivePage(pageId);
      setSelectedIds([]);
      setEditingTextId(null);
    },
    [setActivePage, setEditingTextId, setSelectedIds],
  );

  const handleReorderPages = useCallback(
    (reorderedPages: Page[]) => {
      setPages(reorderedPages);
    },
    [setPages],
  );

  const handleDuplicatePage = useCallback(
    (pageId: string) => {
      const pageToDuplicate = pages.find((page) => page.id === pageId);
      if (!pageToDuplicate) return;

      const pageIndex = pages.findIndex((page) => page.id === pageId);
      const newPage: Page = {
        id: crypto.randomUUID(),
        pageNumber: pageIndex + 2,
        templateId: pageToDuplicate.templateId,
        orientation: pageToDuplicate.orientation,
        elements: cloneElementsWithNewIds(pageToDuplicate.elements),
        rev: 0,
      };

      const newPages = [...pages];
      newPages.splice(pageIndex + 1, 0, newPage);

      const reorderedPages = newPages.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }));

      setPages(reorderedPages);
      setActivePage(newPage.id, newPage.orientation);
      mp.track("페이지 복제");
    },
    [pages, setActivePage, setPages],
  );

  const handleCopyPage = useCallback((pageId: string) => {
    try {
      sessionStorage.setItem("copiedPageId", pageId);
    } catch {
      // 저장소 접근 실패는 복사 기능만 건너뛰고 편집 흐름은 유지한다.
    }
  }, []);

  const handlePastePage = useCallback(
    (targetPageId: string) => {
      let copiedPageId: string | null = null;
      try {
        copiedPageId = sessionStorage.getItem("copiedPageId");
      } catch {
        copiedPageId = null;
      }
      if (!copiedPageId) return;
      const sourcePage = pages.find((page) => page.id === copiedPageId);
      if (!sourcePage) return;
      const targetIndex = pages.findIndex((page) => page.id === targetPageId);
      if (targetIndex === -1) return;
      const newPage: Page = {
        id: crypto.randomUUID(),
        pageNumber: targetIndex + 2,
        templateId: sourcePage.templateId,
        orientation: sourcePage.orientation,
        elements: cloneElementsWithNewIds(sourcePage.elements),
        rev: 0,
      };
      const newPages = [...pages];
      newPages.splice(targetIndex + 1, 0, newPage);
      const reorderedPages = newPages.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }));
      // 붙여넣은 페이지를 즉시 활성화해 사용자가 후속 편집 대상을 명확히 인지하게 한다.
      setPages(reorderedPages);
      setActivePage(newPage.id, newPage.orientation);
    },
    [pages, setActivePage, setPages],
  );

  // 다중 페이지 복사(Ctrl+C) 후 붙여넣기(Ctrl+V) 처리.
  // copiedPageIds 배열을 우선 읽고, 없으면 단일 copiedPageId로 폴백한다.
  const handlePastePages = useCallback(
    (targetPageId: string) => {
      let copiedIds: string[] = [];
      try {
        const raw = sessionStorage.getItem("copiedPageIds");
        if (raw) copiedIds = JSON.parse(raw) as string[];
        if (copiedIds.length === 0) {
          const single = sessionStorage.getItem("copiedPageId");
          if (single) copiedIds = [single];
        }
      } catch {
        copiedIds = [];
      }
      if (copiedIds.length === 0) return;

      const targetIndex = pages.findIndex((p) => p.id === targetPageId);
      if (targetIndex === -1) return;

      const newPages = copiedIds
        .map((id) => pages.find((p) => p.id === id))
        .filter((p): p is Page => Boolean(p))
        .map((sourcePage) => ({
          id: crypto.randomUUID(),
          pageNumber: 0,
          templateId: sourcePage.templateId,
          orientation: sourcePage.orientation,
          elements: cloneElementsWithNewIds(sourcePage.elements),
          rev: 0 as const,
        }));

      if (newPages.length === 0) return;

      const result = [...pages];
      result.splice(targetIndex + 1, 0, ...newPages);
      const reordered = result.map((p, i) => ({ ...p, pageNumber: i + 1 }));
      setPages(reordered);
      const last = newPages[newPages.length - 1];
      setActivePage(last.id, last.orientation);
    },
    [pages, setActivePage, setPages],
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      mp.track("페이지 삭제");
      // 페이지가 1개만 있으면 템플릿을 제거하고 빈 페이지로 만듦
      if (pages.length <= 1) {
        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id !== pageId) return page;
            return bumpPageRevision({
              ...page,
              templateId: null,
              elements: withLogoCanvasElements([]),
            });
          }),
        );
        return;
      }

      const deletedIndex = pages.findIndex((page) => page.id === pageId);
      const updatedPages = pages
        .filter((page) => page.id !== pageId)
        .map((page, index) => ({
          ...page,
          pageNumber: index + 1,
        }));

      setPages(updatedPages);

      if (selectedPageId === pageId) {
        const targetIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
        const nextPage = updatedPages[targetIndex] ?? updatedPages[0];
        if (nextPage) {
          setActivePage(nextPage.id, nextPage.orientation);
        }
      }
    },
    [pages, selectedPageId, setActivePage, setPages],
  );

  const handleDeleteElements = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      mp.track("요소 삭제", { count: ids.length });
      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id !== selectedPageId) return page;

          const linkedIds = new Set<string>();
          // 카드 삭제 시 labelId 연결 텍스트도 함께 제거해 고아 텍스트를 방지한다.
          page.elements.forEach((element) => {
            if (ids.includes(element.id)) {
              if (
                (element.type === "rect" ||
                  element.type === "roundRect" ||
                  element.type === "ellipse") &&
                element.labelId
              ) {
                linkedIds.add(element.labelId);
              }
            }
          });

          const allIdsToDelete = new Set([...ids, ...linkedIds]);

          return {
            ...bumpPageRevision(page),
            elements: page.elements.filter(
              (element) => !allIdsToDelete.has(element.id),
            ),
          };
        }),
      );
      setSelectedIds([]);
      setEditingTextId(null);
    },
    [selectedPageId, setEditingTextId, setPages, setSelectedIds],
  );

  const handleClearPage = useCallback(
    (pageId: string) => {
      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === pageId
            ? bumpPageRevision({
                ...page,
                elements: page.elements.filter((element) => element.locked),
              })
            : page,
        ),
      );
      setSelectedIds([]);
      setEditingTextId(null);
      sessionStorage.removeItem("copiedElements");
      sessionStorage.removeItem("copiedElementsMeta");
    },
    [setEditingTextId, setPages, setSelectedIds],
  );

  const handleMovePage = useCallback(
    (pageId: string, direction: "left" | "right") => {
      const currentIndex = pages.findIndex((page) => page.id === pageId);
      if (currentIndex === -1) return;

      const targetIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= pages.length) return;

      const newPages = [...pages];
      const [movedPage] = newPages.splice(currentIndex, 1);
      newPages.splice(targetIndex, 0, movedPage);

      const reorderedPages = newPages.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }));

      setPages(reorderedPages);
    },
    [pages, setPages],
  );

  return {
    handleAddPage,
    handleAddPageAtIndex,
    handleSelectPage,
    handleReorderPages,
    handleDuplicatePage,
    handleCopyPage,
    handlePastePage,
    handlePastePages,
    handleDeletePage,
    handleDeleteElements,
    handleClearPage,
    handleMovePage,
  };
};
