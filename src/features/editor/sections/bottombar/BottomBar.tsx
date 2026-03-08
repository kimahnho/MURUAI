/**
 * 페이지 썸네일 목록과 페이지 추가/정렬 액션을 제공하는 하단 바 컴포넌트.
 */
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clipboard,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Page } from "../../model/pageTypes";
import DesignPaper from "../canvas/DesignPaper";
import { useBottomBarDrag } from "./hooks/useBottomBarDrag";
import { useBottomBarScroll } from "./hooks/useBottomBarScroll";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;
const PAGE_SIZE_PX = { width: mmToPx(210), height: mmToPx(297) };
const PREVIEW_BOX = {
  vertical: { width: 64, height: 90 },
  horizontal: { width: 90, height: 64 },
};
const ITEM_GAP_PX = 8;
const DIVIDER_WIDTH_PX = 4;
const ADD_BUTTON_WIDTH_PX = 64;
const ADD_BUTTON_MARGIN_PX = 8;
const CONTEXT_MENU_SIZE = { width: 160, height: 3 * 36 + 8 };

const getPreviewMetrics = (orientation: Page["orientation"]) => {
  const isHorizontal = orientation === "horizontal";
  const previewBox = isHorizontal
    ? PREVIEW_BOX.horizontal
    : PREVIEW_BOX.vertical;
  const pageSize = {
    width: isHorizontal ? PAGE_SIZE_PX.height : PAGE_SIZE_PX.width,
    height: isHorizontal ? PAGE_SIZE_PX.width : PAGE_SIZE_PX.height,
  };
  const previewScale = Math.min(
    previewBox.width / pageSize.width,
    previewBox.height / pageSize.height,
  );
  return {
    isHorizontal,
    pageSize,
    previewScale,
    scaledWidth: pageSize.width * previewScale,
    scaledHeight: pageSize.height * previewScale,
  };
};

const getContextMenuPosition = (
  event: ReactMouseEvent,
  rect?: DOMRect | null,
) => {
  const rawX = event.clientX - (rect?.left ?? 0);
  const rawY = event.clientY - (rect?.top ?? 0);
  const maxX = (rect?.width ?? 0) - CONTEXT_MENU_SIZE.width - 8;
  const maxY = (rect?.height ?? 0) - CONTEXT_MENU_SIZE.height - 8;
  return {
    x: Math.min(Math.max(rawX, 8), Math.max(8, maxX)),
    y: Math.min(Math.max(rawY, 8), Math.max(8, maxY)),
  };
};

type PageThumbnailProps = {
  page: Page;
  isSelected: boolean;
  isDragging: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onSelect: (pageId: string, shiftKey: boolean, metaKey: boolean) => void;
  onDuplicate?: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onMovePage?: (pageId: string, direction: "left" | "right") => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  dragHandlers: {
    onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
    onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
    onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
};

const PageThumbnail = ({
  page,
  isSelected,
  isDragging,
  canMoveLeft,
  canMoveRight,
  onSelect,
  onDuplicate,
  onDelete,
  onMovePage,
  onContextMenu,
  dragHandlers,
}: PageThumbnailProps) => {
  const { isHorizontal, pageSize, previewScale, scaledWidth, scaledHeight } =
    getPreviewMetrics(page.orientation);
  // 드래그 ghost image를 썸네일 버튼 영역만으로 한정하기 위한 ref
  const thumbRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      draggable
      onDragStart={(event) => {
        if (thumbRef.current) {
          // button을 클론해 배경색만 제거하고 border/radius는 유지한 ghost image로 사용
          const rect = thumbRef.current.getBoundingClientRect();
          const clone = thumbRef.current.cloneNode(true) as HTMLElement;
          clone.style.position = "fixed";
          clone.style.top = "-9999px";
          clone.style.left = "-9999px";
          clone.style.width = `${rect.width}px`;
          clone.style.height = `${rect.height}px`;
          clone.style.background = "transparent";
          document.body.appendChild(clone);
          event.dataTransfer.setDragImage(clone, event.clientX - rect.left, event.clientY - rect.top);
          // 다음 frame에서 제거 (setDragImage 캡처 완료 후)
          requestAnimationFrame(() => { document.body.removeChild(clone); });
        }
        dragHandlers.onDragStart(event);
      }}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      onDragEnd={dragHandlers.onDragEnd}
      onContextMenu={onContextMenu}
      className="group flex shrink-0 flex-col items-center gap-1 cursor-move"
      style={{ width: `${isHorizontal ? PREVIEW_BOX.horizontal.width : PREVIEW_BOX.vertical.width}px` }}
    >
      <div className="flex items-center justify-center gap-1 h-5">
        {!isDragging && canMoveLeft && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onMovePage?.(page.id, "left");
            }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black-10 opacity-0 pointer-events-none transition hover:bg-black-20 group-hover:opacity-100 group-hover:pointer-events-auto"
            title="왼쪽으로 이동"
          >
            <ChevronLeft className="w-3 h-3 text-black-60" />
          </button>
        )}
        {!isDragging && canMoveRight && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onMovePage?.(page.id, "right");
            }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black-10 opacity-0 pointer-events-none transition hover:bg-black-20 group-hover:opacity-100 group-hover:pointer-events-auto"
            title="오른쪽으로 이동"
          >
            <ChevronRight className="w-3 h-3 text-black-60" />
          </button>
        )}
      </div>
      <div className="relative">
        <button
          ref={thumbRef}
          onClick={(e) => {
            onSelect(page.id, e.shiftKey, e.metaKey || e.ctrlKey);
          }}
          className={`relative box-border flex items-center justify-center rounded-lg border-2 transition cursor-pointer overflow-hidden outline-none focus:outline-none focus:ring-0 ${
            isHorizontal ? "w-22.5 h-16" : "w-16 h-22.5"
          } ${
            isSelected
              ? "border-primary bg-primary/5"
              : "border-black-25 bg-white hover:border-black-40"
          }`}
        >
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ borderRadius: "inherit" }}
          >
            <div
              className="relative"
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
              }}
            >
              <div
                style={{
                  width: `${pageSize.width}px`,
                  height: `${pageSize.height}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              >
                <DesignPaper
                  pageId={page.id}
                  orientation={page.orientation ?? "vertical"}
                  elements={page.elements}
                  background={page.background}
                  selectedIds={[]}
                  editingTextId={null}
                  readOnly
                />
              </div>
            </div>
          </div>
          <span
            className="absolute bottom-1 right-1 text-black-50 bg-white/80 px-1 rounded"
            style={{ fontSize: "10px", fontWeight: 500 }}
          >
            {page.pageNumber}
          </span>
        </button>
      </div>
      <div className="flex items-center justify-center gap-1 h-5">
        {!isDragging && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate?.(page.id);
            }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black-10 opacity-0 pointer-events-none transition hover:bg-black-20 group-hover:opacity-100 group-hover:pointer-events-auto"
            title="복제"
          >
            <Copy className="w-3 h-3 text-black-60" />
          </button>
        )}
        {!isDragging && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(page.id);
            }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black-10 opacity-0 pointer-events-none transition hover:bg-red-100 hover:text-white group-hover:opacity-100 group-hover:pointer-events-auto"
            title="삭제"
          >
            <Trash2 className="w-3 h-3 text-black-60 hover:text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

type PageInsertDividerProps = {
  isVisible: boolean;
  onAdd: () => void;
  onDragOver?: (e: ReactDragEvent<HTMLDivElement>) => void;
  onDrop?: (e: ReactDragEvent<HTMLDivElement>) => void;
};

const PageInsertDivider = ({ isVisible, onAdd, onDragOver, onDrop }: PageInsertDividerProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // isVisible=false 이더라도 drag drop zone으로는 동작해야 하므로 null 반환하지 않음
  return (
    <div
      className="group relative flex items-center shrink-0 h-full px-4 -mx-4"
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      onDragOver={onDragOver}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop?.(e);
      }}
    >
      {isVisible && (
        <div
          className={`flex items-center justify-center h-full pb-5 transition-all ${
            isDragOver ? "w-1 bg-primary rounded" : "w-1 group-hover:w-8"
          }`}
        >
          {!isDragOver && (
            <button
              onClick={onAdd}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      )}
      {/* isVisible=false(마지막 divider)일 때도 dragOver 시 파란 세로선 표시 */}
      {!isVisible && isDragOver && (
        <div className="w-1 h-full pb-5 flex items-center justify-center">
          <div className="w-1 h-full bg-primary rounded" />
        </div>
      )}
    </div>
  );
};

type AddPageButtonProps = {
  onAdd: () => void;
};

const AddPageButton = ({ onAdd }: AddPageButtonProps) => (
  <div
    className="flex shrink-0 flex-col items-center gap-2 ml-2"
    style={{ width: `${ADD_BUTTON_WIDTH_PX}px` }}
  >
    <button
      onClick={onAdd}
      className="flex box-border flex-col items-center justify-center w-16 h-22.5 rounded-lg border-2 border-dashed border-black-30 hover:border-primary hover:bg-primary/5 transition cursor-pointer"
    >
      <Plus className="w-5 h-5 text-black-60" />
    </button>
  </div>
);

type PageContextMenuProps = {
  contextMenu: { pageId: string; x: number; y: number } | null;
  onCopyPage: (pageId: string) => void;
  onPastePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onClose: () => void;
  hasCopiedPage: boolean;
};

const PageContextMenu = ({
  contextMenu,
  onCopyPage,
  onPastePage,
  onDeletePage,
  onClose,
  hasCopiedPage,
}: PageContextMenuProps) => {
  if (!contextMenu) return null;
  return (
    <div
      className="absolute z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="w-40 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg">
        <button
          type="button"
          onClick={() => {
            onCopyPage(contextMenu.pageId);
            onClose();
          }}
          className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
        >
          <span className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            복사
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            onPastePage(contextMenu.pageId);
            onClose();
          }}
          disabled={!hasCopiedPage}
          className={`flex w-full items-center justify-between px-3 py-2 text-14-regular ${
            hasCopiedPage ? "text-black-90 hover:bg-black-5" : "text-black-40"
          }`}
        >
          <span className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" />
            붙여넣기
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            onDeletePage(contextMenu.pageId);
            onClose();
          }}
          className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            삭제
          </span>
        </button>
      </div>
    </div>
  );
};

interface BottomBarProps {
  pages: Page[];
  selectedPageId: string;
  onAddPage: () => void;
  onSelectPage: (pageId: string) => void;
  onCopyPage: (pageId: string) => void;
  onPastePage: (pageId: string) => void;
  onPastePages: (targetPageId: string) => void;
  onReorderPages: (pages: Page[]) => void;
  onDeletePage: (pageId: string) => void;
  onAddPageAtIndex?: (index: number) => void;
  onMovePage?: (pageId: string, direction: "left" | "right") => void;
  onDuplicatePage?: (pageId: string) => void;
  onVisiblePageIdsChange?: (pageIds: string[]) => void;
}

type BottomBarItem =
  | {
      type: "page";
      key: string;
      page: Page;
      width: number;
      pageIndex: number;
    }
  | {
      type: "divider";
      key: string;
      width: number;
      insertIndex: number;
      // true: targetPageId 앞에 삽입(첫 페이지 앞), false: targetPageId 뒤에 삽입
      insertBefore: boolean;
    }
  | {
      type: "add";
      key: string;
      width: number;
    };

const BottomBar = ({
  pages,
  selectedPageId,
  onAddPage,
  onSelectPage,
  onCopyPage,
  onPastePage,
  onPastePages,
  onReorderPages,
  onDeletePage,
  onAddPageAtIndex,
  onMovePage,
  onDuplicatePage,
  onVisiblePageIdsChange,
}: BottomBarProps) => {
  // Shift+클릭으로 범위 선택된 페이지 ID 목록. 캔버스 활성 페이지(selectedPageId)와 별도로 관리.
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  // 드래그 중에는 hover 버튼을 숨기기 위한 상태
  const [isDragging, setIsDragging] = useState(false);
  // 하단 페이지 바 접기/펼치기 상태 (sessionStorage로 세션 유지)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return sessionStorage.getItem("bottomBarCollapsed") === "true"; }
    catch { return false; }
  });
  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try { sessionStorage.setItem("bottomBarCollapsed", String(next)); } catch {}
      return next;
    });
  };
  // keydown 핸들러의 클로저 문제를 피하기 위해 최신 값을 ref로 유지한다.
  const selectedPageIdsRef = useRef<string[]>([]);
  const selectedPageIdRef = useRef(selectedPageId);
  useEffect(() => { selectedPageIdsRef.current = selectedPageIds; }, [selectedPageIds]);
  useEffect(() => { selectedPageIdRef.current = selectedPageId; }, [selectedPageId]);
  const items = useMemo<BottomBarItem[]>(() => {
    const nextItems: BottomBarItem[] = [];
    // 페이지/삽입선/추가 버튼을 하나의 리스트 모델로 만들어 가상 스크롤 계산을 단순화한다.
    pages.forEach((page, index) => {
      const width =
        page.orientation === "horizontal"
          ? PREVIEW_BOX.horizontal.width
          : PREVIEW_BOX.vertical.width;
      // 첫 페이지 앞에 drop zone divider 삽입 (+ 버튼 없음, insertBefore=true)
      if (index === 0) {
        nextItems.push({
          type: "divider",
          key: "divider-first",
          width: DIVIDER_WIDTH_PX,
          insertIndex: 0,
          insertBefore: true,
        });
      }
      nextItems.push({
        type: "page",
        key: `page-${page.id}`,
        page,
        width,
        pageIndex: index,
      });
      nextItems.push({
        type: "divider",
        key: `divider-${page.id}`,
        width: DIVIDER_WIDTH_PX,
        insertIndex: index + 1,
        insertBefore: false,
      });
    });
    nextItems.push({
      type: "add",
      key: "add-page",
      width: ADD_BUTTON_WIDTH_PX + ADD_BUTTON_MARGIN_PX,
    });
    return nextItems;
  }, [pages]);

  const itemWidths = useMemo(() => items.map((item) => item.width), [items]);
  const itemOffsets = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;
    for (let i = 0; i < itemWidths.length; i += 1) {
      offsets.push(offset);
      offset += itemWidths[i] + ITEM_GAP_PX;
    }
    return offsets;
  }, [itemWidths]);

  const selectedItemIndex = useMemo(() => {
    const index = items.findIndex(
      (item) => item.type === "page" && item.page.id === selectedPageId,
    );
    return index >= 0 ? index : null;
  }, [items, selectedPageId]);

  const isSelectedLastPage =
    pages.length > 0 && pages[pages.length - 1]?.id === selectedPageId;

  const { containerRef, listRef } = useBottomBarScroll({
    pagesLength: pages.length,
    selectedPageId,
    selectedItemIndex,
    addButtonIndex: null,
    itemOffsets,
    itemWidths,
    isSelectedLastPage,
  });
  const { createDragHandlers, handleDrop, handleDragOver } = useBottomBarDrag({
    pages,
    selectedPageIds,
    onReorderPages,
    onDragStateChange: setIsDragging,
  });

  const [contextMenu, setContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);

  // selectedPageId가 단일 클릭으로 바뀌면 다중 선택 해제
  useEffect(() => {
    setSelectedPageIds([]);
  }, [selectedPageId]);

  const getCopiedPageId = () => {
    try {
      return sessionStorage.getItem("copiedPageId");
    } catch {
      return null;
    }
  };

  // Shift+클릭: 앵커(selectedPageId)~클릭 페이지 범위 선택.
  // Cmd/Ctrl+클릭: 개별 페이지 토글 추가/제거.
  // 일반 클릭: 단일 선택.
  const handlePageClick = (pageId: string, shiftKey: boolean, metaKey: boolean) => {
    if (shiftKey && pages.length > 1) {
      const anchorIndex = pages.findIndex((p) => p.id === selectedPageId);
      const clickedIndex = pages.findIndex((p) => p.id === pageId);
      const start = Math.min(anchorIndex, clickedIndex);
      const end = Math.max(anchorIndex, clickedIndex);
      setSelectedPageIds(pages.slice(start, end + 1).map((p) => p.id));
    } else if (metaKey) {
      // 앵커(selectedPageId)가 항상 선택에 포함되도록 기준을 유지
      const base = selectedPageIds.length > 0 ? selectedPageIds : [selectedPageId];
      if (base.includes(pageId)) {
        // 앵커 페이지는 제거하지 않음
        if (pageId !== selectedPageId) {
          setSelectedPageIds(base.filter((id) => id !== pageId));
        }
      } else {
        setSelectedPageIds([...base, pageId]);
      }
    } else {
      onSelectPage(pageId);
      setSelectedPageIds([]);
    }
  };

  const handleAddPageBetween = (index: number) => {
    if (onAddPageAtIndex) {
      onAddPageAtIndex(index);
    }
  };

  const handlePageContextMenu =
    (pageId: string) => (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectPage(pageId);
      const rect = containerRef.current?.getBoundingClientRect();
      const position = getContextMenuPosition(event, rect);
      setContextMenu({ pageId, ...position });
    };

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onVisiblePageIdsChange) return;
    const scroller = listRef.current;
    if (!scroller || items.length === 0) {
      onVisiblePageIdsChange([]);
      return;
    }

    const computeVisiblePageIds = () => {
      const scrollLeft = scroller.scrollLeft;
      const viewportRight = scrollLeft + scroller.clientWidth;
      const buffer = 16;
      const ids: string[] = [];

      items.forEach((item, index) => {
        if (item.type !== "page") return;
        const left = itemOffsets[index] ?? 0;
        const right = left + (itemWidths[index] ?? 0);
        if (right >= scrollLeft - buffer && left <= viewportRight + buffer) {
          ids.push(item.page.id);
        }
      });
      onVisiblePageIdsChange(ids);
    };

    const scheduleVisibleUpdate = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        computeVisiblePageIds();
      });
    };

    computeVisiblePageIds();
    scroller.addEventListener("scroll", scheduleVisibleUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleVisibleUpdate);

    return () => {
      scroller.removeEventListener("scroll", scheduleVisibleUpdate);
      window.removeEventListener("resize", scheduleVisibleUpdate);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [items, itemOffsets, itemWidths, listRef, onVisiblePageIdsChange]);

  // pages/onSelectPage/onPastePages는 ref로 유지해 핸들러 재등록 없이 최신 값을 참조한다.
  const pagesRef = useRef(pages);
  const onSelectPageRef = useRef(onSelectPage);
  const onPastePagesRef = useRef(onPastePages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { onSelectPageRef.current = onSelectPage; }, [onSelectPage]);
  useEffect(() => { onPastePagesRef.current = onPastePages; }, [onPastePages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 텍스트 입력 중이면 무시
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA"
      ) {
        return;
      }

      const currentPages = pagesRef.current;
      const currentSelectedPageId = selectedPageIdRef.current;
      const currentSelectedPageIds = selectedPageIdsRef.current;

      // Ctrl+C: 다중 선택이 있으면 해당 목록을, 없으면 현재 페이지 단독을 저장
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        const ids = currentSelectedPageIds.length > 0 ? currentSelectedPageIds : [currentSelectedPageId];
        try {
          sessionStorage.setItem("copiedPageIds", JSON.stringify(ids));
        } catch {
          // 저장소 접근 실패는 무시
        }
        event.preventDefault();
        return;
      }

      // Ctrl+V: 현재 페이지 직후에 복사된 페이지들 붙여넣기
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        onPastePagesRef.current(currentSelectedPageId);
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const index = currentPages.findIndex((p) => p.id === currentSelectedPageId);
      if (index < 0) return;
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onSelectPageRef.current(currentPages[index - 1].id);
      } else if (event.key === "ArrowRight" && index < currentPages.length - 1) {
        event.preventDefault();
        onSelectPageRef.current(currentPages[index + 1].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex shrink-0 w-full bg-white border-t border-black-25 items-center px-4 ${isCollapsed ? "h-8" : "h-40"}`}
      onPointerDown={() => {
        setContextMenu(null);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      {/* 하단 바 접기/펼치기 토글 버튼 */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-5 bg-white border border-black-25 border-b-0 rounded-t-md text-black-90 hover:text-black z-10"
      >
        {isCollapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {!isCollapsed && (
        <div
          ref={listRef}
          className="flex flex-1 h-full items-center gap-2 overflow-x-auto overflow-y-hidden"
        >
          {items.map((item) => {
            if (item.type === "page") {
              const index = item.pageIndex;
              return (
                <div key={item.key}>
                  <PageThumbnail
                    page={item.page}
                    isSelected={
                      selectedPageId === item.page.id ||
                      selectedPageIds.includes(item.page.id)
                    }
                    isDragging={isDragging}
                    canMoveLeft={index > 0}
                    canMoveRight={index < pages.length - 1}
                    onSelect={handlePageClick}
                    onDuplicate={onDuplicatePage}
                    onDelete={onDeletePage}
                    onMovePage={onMovePage}
                    onContextMenu={handlePageContextMenu(item.page.id)}
                    dragHandlers={createDragHandlers(item.page.id)}
                  />
                </div>
              );
            }
            if (item.type === "divider") {
              // 첫 divider(insertBefore=true): 첫 페이지 앞에 삽입 → targetPageId = pages[0]
              // 중간/마지막 divider(insertBefore=false): 앞 페이지 뒤에 삽입 → targetPageId = pages[insertIndex-1]
              const targetPageId = item.insertBefore
                ? pages[0]?.id
                : pages[item.insertIndex - 1]?.id;
              const isFirstDivider = item.insertBefore;
              const isLastDivider = !item.insertBefore && item.insertIndex === pages.length;
              const showAddButton = !isFirstDivider && !isLastDivider;
              return (
                <PageInsertDivider
                  key={item.key}
                  isVisible={showAddButton}
                  onAdd={() => {
                    handleAddPageBetween(item.insertIndex);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={
                    targetPageId
                      ? (e) => handleDrop(e, targetPageId, item.insertBefore)
                      : undefined
                  }
                />
              );
            }
            return <AddPageButton key={item.key} onAdd={onAddPage} />;
          })}
        </div>
      )}
      <PageContextMenu
        contextMenu={contextMenu}
        onCopyPage={onCopyPage}
        onPastePage={onPastePage}
        onDeletePage={onDeletePage}
        onClose={() => {
          setContextMenu(null);
        }}
        hasCopiedPage={Boolean(getCopiedPageId())}
      />
    </div>
  );
};

export default BottomBar;
