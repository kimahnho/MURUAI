/**
 * 페이지 추가/삭제/복제/이동 등 페이지 단위 편집 액션을 제공하는 훅.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { withLogoCanvasElements } from "../utils/logoElement";
import { cloneElementsWithNewIds } from "../utils/elementClone";
import type { Page } from "../model/pageTypes";
import { mp } from "@/shared/utils/mixpanel";
import { bumpPageRevision } from "../utils/pageRevision";
import { isImageFillElement } from "../utils/imageBoxScaling";

type PageActionsParams = {
  pages: Page[];
  selectedPageId: string;
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
      orientation: "vertical",
      rev: 0,
    };
    setPages([...pages, newPage]);
    setActivePage(newPage.id, newPage.orientation);
    mp.track("페이지 추가");
  }, [pages, setActivePage, setPages]);

  const handleAddPageAtIndex = useCallback(
    (index: number) => {
      const newPage: Page = {
        id: crypto.randomUUID(),
        pageNumber: index + 1,
        templateId: null,
        elements: withLogoCanvasElements([]),
        orientation: "vertical",
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
    [pages, setActivePage, setPages],
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
        ...(pageToDuplicate.coverData && { coverData: { ...pageToDuplicate.coverData } }),
        ...(pageToDuplicate.background && { background: pageToDuplicate.background }),
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
        ...(sourcePage.coverData && { coverData: { ...sourcePage.coverData } }),
        ...(sourcePage.background && { background: sourcePage.background }),
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

  // 다중 페이지 복사(Ctrl+C) 또는 잘라내기(Ctrl+X) 후 붙여넣기(Ctrl+V) 처리.
  // cutPageData(잘라내기 데이터)를 우선 확인하고, 없으면 copiedPageIds로 폴백한다.
  const handlePastePages = useCallback(
    (targetPageId: string) => {
      const targetIndex = pages.findIndex((p) => p.id === targetPageId);
      if (targetIndex === -1) return;

      let sourcePages: Page[] = [];

      // 잘라내기 데이터 우선 확인
      try {
        const cutRaw = sessionStorage.getItem("cutPageData");
        if (cutRaw) {
          sourcePages = JSON.parse(cutRaw) as Page[];
          sessionStorage.removeItem("cutPageData");
        }
      } catch {
        // 파싱 실패 시 무시
      }

      // 잘라내기 데이터가 없으면 복사 ID로 폴백
      if (sourcePages.length === 0) {
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

        sourcePages = copiedIds
          .map((id) => pages.find((p) => p.id === id))
          .filter((p): p is Page => Boolean(p));
      }

      if (sourcePages.length === 0) return;

      const newPages = sourcePages.map((sourcePage) => ({
        id: crypto.randomUUID(),
        pageNumber: 0,
        templateId: sourcePage.templateId,
        orientation: sourcePage.orientation,
        elements: cloneElementsWithNewIds(sourcePage.elements),
        rev: 0 as const,
        ...(sourcePage.coverData && { coverData: { ...sourcePage.coverData } }),
        ...(sourcePage.background && { background: sourcePage.background }),
      }));

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
              coverData: undefined,
              background: { type: "none" as const },
              orientation: "vertical",
              elements: withLogoCanvasElements([]),
            });
          }),
        );
        setActivePage(pageId, "vertical");
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

      // 이미지 클리어와 요소 삭제를 단일 setPages 안에서 원자적으로 처리한다.
      // setPages 업데이터 바깥에서 cleared 플래그를 읽는 패턴은 React batching으로 작동하지 않는다.
      let didClearImage = false;
      setPages((prevPages) => {
        const page = prevPages.find((p) => p.id === selectedPageId);
        if (!page) return prevPages;

        // 단일 요소 + 이미지 fill → 이미지만 제거하고 요소는 유지
        // 단, standalone 이미지(사이드바/파일 드롭으로 생성)는 요소 자체를 삭제
        if (ids.length === 1) {
          const el = page.elements.find((e) => e.id === ids[0]);
          const isStandalone =
            el &&
            "isStandaloneImage" in el &&
            el.isStandaloneImage === true;
          if (el && isImageFillElement(el) && !isStandalone) {
            didClearImage = true;
            const fallbackFill = ("backgroundColor" in el && typeof el.backgroundColor === "string" ? el.backgroundColor : undefined) ?? "#FFFFFF";
            const defaultLabel = el.type === "aacCard" ? "단어" : el.type === "emotionCard" ? "(감정)" : undefined;
            const linkedLabelId = "labelId" in el && typeof el.labelId === "string" ? el.labelId : undefined;
            return prevPages.map((p) => {
              if (p.id !== selectedPageId) return p;
              return {
                ...bumpPageRevision(p),
                elements: p.elements.map((e) => {
                  if (e.id === el.id) {
                    const c = { ...e, fill: fallbackFill, imageBox: undefined, backgroundColor: undefined };
                    if (defaultLabel && "label" in e && e.label && typeof e.label === "object") {
                      return { ...c, label: { ...e.label, text: defaultLabel } };
                    }
                    return c;
                  }
                  if (linkedLabelId && e.id === linkedLabelId && e.type === "text") {
                    return { ...e, text: "(감정)", richText: "" };
                  }
                  return e;
                }),
              };
            });
          }
        }

        // 이미지 fill이 아닌 경우 → 요소 삭제
        const linkedIds = new Set<string>();
        page.elements.forEach((element) => {
          if (ids.includes(element.id)) {
            if (
              (element.type === "rect" ||
                element.type === "roundRect" ||
                element.type === "ellipse" ||
                element.type === "mosaic" ||
                element.type === "circleMosaic") &&
              element.labelId
            ) {
              linkedIds.add(element.labelId);
            }
          }
        });

        const allIdsToDelete = new Set([...ids, ...linkedIds]);

        return prevPages.map((p) => {
          if (p.id !== selectedPageId) return p;
          return {
            ...bumpPageRevision(p),
            elements: p.elements.filter(
              (element) => !allIdsToDelete.has(element.id),
            ),
          };
        });
      });

      if (didClearImage) return;
      mp.track("요소 삭제", { count: ids.length });
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
                templateId: null,
                coverData: undefined,
                background: { type: "none" as const },
                elements: withLogoCanvasElements([]),
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
