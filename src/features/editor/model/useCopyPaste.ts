import { useEffect } from "react";
import type { Page } from "./pageTypes";

interface UseCopyPasteProps {
  selectedPageId: string;
  pages: Page[];
  selectedIds: string[];
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onPastePage?: (pageId: string) => void;
  onDeleteElements?: (ids: string[]) => void;
  onClearPage?: (pageId: string) => void;
}

export const useCopyPaste = ({
  selectedPageId,
  pages,
  selectedIds,
  onDuplicatePage,
  onDeletePage,
  onPastePage,
  onDeleteElements,
  onClearPage,
}: UseCopyPasteProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // input, textarea 등에서 입력 중일 때는 동작하지 않음
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+C 또는 Cmd+C (복사)
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedIds.length > 0) return;
        const selectedPage = pages.find((page) => page.id === selectedPageId);
        if (!selectedPage) return;
        try {
          sessionStorage.setItem("copiedPageId", selectedPage.id);
          sessionStorage.removeItem("copiedElements");
          sessionStorage.removeItem("copiedElementsMeta");
        } catch {
          // ignore clipboard failures
        }
        return;
      }

      // Ctrl+V 또는 Cmd+V (붙여넣기)
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        // 요소 클립보드가 있는지 확인
        const copiedElements = sessionStorage.getItem("copiedElements");

        // 요소 클립보드가 없는 경우에만 페이지 붙여넣기 수행
        if (!copiedElements) {
          const copiedPageId = sessionStorage.getItem("copiedPageId");
          if (copiedPageId) {
            e.preventDefault();
            if (onPastePage) {
              onPastePage(selectedPageId);
            } else {
              onDuplicatePage(copiedPageId);
            }
          }
        }
      }

      // Backspace 또는 Delete (삭제)
      if (e.key === "Backspace" || e.key === "Delete") {
        // input, textarea 등에서 입력 중일 때는 삭제하지 않음
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        if (selectedIds.length > 0 && onDeleteElements) {
          e.preventDefault();
          onDeleteElements(selectedIds);
          return;
        }

        if (pages.length > 1) {
          e.preventDefault();
          onDeletePage(selectedPageId);
          return;
        }

        if (pages.length === 1 && onClearPage) {
          e.preventDefault();
          onClearPage(selectedPageId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedPageId,
    pages,
    selectedIds,
    onDuplicatePage,
    onDeletePage,
    onPastePage,
    onDeleteElements,
    onClearPage,
  ]);
};
