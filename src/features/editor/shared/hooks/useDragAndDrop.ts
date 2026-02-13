/**
 * 페이지 드래그 앤 드롭 정렬 동작을 공통 처리하는 훅.
 */
import type { Page } from "../../model/pageTypes";

interface UseDragAndDropProps {
  pages: Page[];
  onReorderPages: (pages: Page[]) => void;
}

export const useDragAndDrop = ({
  pages,
  onReorderPages,
}: UseDragAndDropProps) => {
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pageId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    const draggedPageId = e.dataTransfer.getData("text/plain");

    if (draggedPageId === targetPageId) return;

    const draggedIndex = pages.findIndex((p) => p.id === draggedPageId);
    const targetIndex = pages.findIndex((p) => p.id === targetPageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPages = [...pages];
    const [draggedPage] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, draggedPage);

    // 페이지 번호 재정렬
    const reorderedPages = newPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    onReorderPages(reorderedPages);
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
};
