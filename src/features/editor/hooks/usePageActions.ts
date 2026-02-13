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
      id: Date.now().toString(),
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
        id: Date.now().toString(),
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
        id: Date.now().toString(),
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
        id: Date.now().toString(),
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
      setPages(reorderedPages);
      setActivePage(newPage.id, newPage.orientation);
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
    handleDeletePage,
    handleDeleteElements,
    handleClearPage,
    handleMovePage,
  };
};
