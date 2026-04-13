/**
 * 페이지 드래그 앤 드롭 정렬 동작을 공통 처리하는 훅.
 * 단일 및 다중 페이지 이동을 모두 지원한다.
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
  // pageIds 배열을 JSON으로 직렬화해 다중 선택 이동을 지원한다.
  const handleDragStart = (e: React.DragEvent, pageIds: string[]) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(pageIds));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // insertBefore=true: 타겟 페이지 앞에 삽입, false(기본): 타겟 페이지 뒤에 삽입
  const handleDrop = (e: React.DragEvent, targetPageId: string, insertBefore = false) => {
    e.preventDefault();
    let draggedIds: string[] = [];
    try {
      draggedIds = JSON.parse(e.dataTransfer.getData("text/plain")) as string[];
    } catch {
      return;
    }

    // 타겟이 드래그 그룹 내에 있으면 자기 자신으로의 드롭이므로 무시
    if (draggedIds.includes(targetPageId)) return;

    // 원본 순서를 유지하며 드래그된 페이지 목록 추출
    const draggedPages = pages.filter((p) => draggedIds.includes(p.id));
    if (draggedPages.length === 0) return;

    // 드래그된 페이지를 제외한 나머지에서 타겟 위치를 찾아 앞/뒤에 삽입
    const remaining = pages.filter((p) => !draggedIds.includes(p.id));
    const insertAtIndex = remaining.findIndex((p) => p.id === targetPageId);
    if (insertAtIndex === -1) return;

    const newPages = [...remaining];
    newPages.splice(insertBefore ? insertAtIndex : insertAtIndex + 1, 0, ...draggedPages);

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
