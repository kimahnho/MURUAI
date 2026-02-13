import { useEffect } from "react";
import type { Page } from "../model/pageTypes";

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

const isTypingTarget = (target: HTMLElement) =>
  target.tagName === "INPUT" ||
  target.tagName === "TEXTAREA" ||
  target.isContentEditable;

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
      // 텍스트 입력 중에는 페이지 단축키를 막아 편집 텍스트 손실을 방지한다.
      const target = e.target as HTMLElement;
      if (isTypingTarget(target)) {
        return;
      }

      // 요소가 선택되지 않은 상태의 복사는 페이지 복사로 해석한다.
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedIds.length > 0) return;
        const selectedPage = pages.find((page) => page.id === selectedPageId);
        if (!selectedPage) return;
        try {
          sessionStorage.setItem("copiedPageId", selectedPage.id);
          sessionStorage.removeItem("copiedElements");
          sessionStorage.removeItem("copiedElementsMeta");
        } catch {
          // 저장소 접근 실패는 복사 기능만 건너뛰고 앱 입력 흐름은 유지한다.
        }
        return;
      }

      // 요소 클립보드가 비어 있을 때만 페이지 붙여넣기를 수행한다.
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        const copiedElements = sessionStorage.getItem("copiedElements");
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

      if (e.key === "Backspace" || e.key === "Delete") {
        if (isTypingTarget(target)) {
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
