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
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useStorybookSceneStore } from "@/features/storybook/store/storybookSceneStore";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Page } from "../../model/pageTypes";
import { useSpellCheckStore, buildCorrectionKey } from "../../store/spellCheckStore";
import DesignPaper from "../canvas/DesignPaper";
import { useBottomBarDrag, type PageDragHandlers } from "./hooks/useBottomBarDrag";
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
  isPartOfActiveDrag: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  readOnly?: boolean;
  spellErrorCount?: number;
  isStorybookGenerating?: boolean;
  onSelect: (pageId: string, shiftKey: boolean, metaKey: boolean) => void;
  onDuplicate?: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onMovePage?: (pageId: string, direction: "left" | "right") => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  dragHandlers: PageDragHandlers;
};

const PageThumbnail = ({
  page,
  isSelected,
  isDragging,
  isPartOfActiveDrag,
  canMoveLeft,
  canMoveRight,
  readOnly,
  spellErrorCount,
  isStorybookGenerating,
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
  const ghostRef = useRef<HTMLElement | null>(null);

  // 언마운트 시 잔류 ghost clone 제거
  useEffect(() => {
    return () => {
      if (ghostRef.current?.parentNode) {
        ghostRef.current.parentNode.removeChild(ghostRef.current);
        ghostRef.current = null;
      }
    };
  }, []);

  // 드래그 묶음에 포함된 썸네일은 이동 중임을 표현하기 위해 흐리게
  const dragFadeClass = isDragging && isPartOfActiveDrag ? "opacity-50" : "";

  return (
    <div
      draggable={!readOnly}
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
          // 다중 선택 묶음을 드래그할 때는 우상단에 개수 뱃지 추가
          if (dragHandlers.isPartOfSelection && dragHandlers.selectedCount > 1) {
            const badge = document.createElement("span");
            badge.textContent = String(dragHandlers.selectedCount);
            badge.style.position = "absolute";
            badge.style.top = "-8px";
            badge.style.right = "-8px";
            badge.style.minWidth = "22px";
            badge.style.height = "22px";
            badge.style.padding = "0 6px";
            badge.style.display = "inline-flex";
            badge.style.alignItems = "center";
            badge.style.justifyContent = "center";
            badge.style.borderRadius = "9999px";
            badge.style.background = "#7C3AED";
            badge.style.color = "#ffffff";
            badge.style.fontSize = "12px";
            badge.style.fontWeight = "700";
            badge.style.boxShadow = "0 2px 6px rgba(124,58,237,0.35)";
            clone.style.position = "fixed";
            clone.appendChild(badge);
          }
          document.body.appendChild(clone);
          ghostRef.current = clone;
          event.dataTransfer.setDragImage(clone, event.clientX - rect.left, event.clientY - rect.top);
          // 다음 frame에서 제거 (setDragImage 캡처 완료 후)
          requestAnimationFrame(() => {
            if (ghostRef.current?.parentNode) {
              ghostRef.current.parentNode.removeChild(ghostRef.current);
              ghostRef.current = null;
            }
          });
        }
        dragHandlers.onDragStart(event);
      }}
      onDragOver={(event) => {
        // 드래그 중인 페이지가 자기 자신(또는 묶음 내부)이면 금지 피드백
        if (isPartOfActiveDrag) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "none";
          return;
        }
        dragHandlers.onDragOver(event);
      }}
      onDrop={dragHandlers.onDrop}
      onDragEnd={dragHandlers.onDragEnd}
      onContextMenu={onContextMenu}
      className={`group flex shrink-0 flex-col items-center gap-1 ${readOnly ? "cursor-pointer" : "cursor-move"} ${dragFadeClass} ${isDragging && isPartOfActiveDrag ? "cursor-grabbing" : ""}`}
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
              ? "border-primary bg-primary-50"
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
                  coverData={page.coverData}
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
        {spellErrorCount != null && spellErrorCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-white-100 shadow-sm"
            style={{ fontSize: "10px", fontWeight: 600 }}
          >
            {spellErrorCount}
          </span>
        )}
        {isStorybookGenerating && (
          <span
            className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white-100 shadow-sm"
            title="이미지 생성 중"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
          </span>
        )}
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

// 드롭 위치 강조용 인디케이터: 두꺼운 파란 바 + 상단 원형 캡 + 옅은 글로우
const DropIndicator = () => (
  <div className="relative flex items-center justify-center h-full pb-5">
    <div
      className="w-1.5 h-full bg-primary rounded-full"
      style={{ boxShadow: "0 0 0 3px var(--color-primary-100, #ede9fe)" }}
    />
    <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow" />
  </div>
);

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
            isDragOver ? "w-2" : "w-1 group-hover:w-8"
          }`}
        >
          {isDragOver ? (
            <DropIndicator />
          ) : (
            <button
              onClick={onAdd}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-primary-700 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      )}
      {/* isVisible=false(마지막/첫 divider)일 때도 dragOver 시 동일한 인디케이터 표시 */}
      {!isVisible && isDragOver && (
        <div className="w-2 h-full pb-5 flex items-center justify-center">
          <DropIndicator />
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
      className="flex box-border flex-col items-center justify-center w-16 h-22.5 rounded-lg border-2 border-dashed border-black-30 hover:border-primary hover:bg-primary-50 transition cursor-pointer"
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
  readOnly?: boolean;
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
  readOnly,
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
  // 맞춤법 검사 패널이 열려 있을 때만 페이지별 오류 건수 표시
  const spellResults = useSpellCheckStore((s) => s.results);
  const spellActionMap = useSpellCheckStore((s) => s.actionMap);
  const isPanelOpen = useSpellCheckStore((s) => s.isPanelOpen);

  const spellErrorCountByPageId = useMemo(() => {
    const map = new Map<string, number>();
    if (!isPanelOpen || !spellResults) return map;
    for (const r of spellResults) {
      let count = 0;
      r.corrections.forEach((_, idx) => {
        const key = buildCorrectionKey(r.elementId, r.field, idx);
        if (!spellActionMap.has(key)) count++;
      });
      if (count > 0) map.set(r.pageId, (map.get(r.pageId) ?? 0) + count);
    }
    return map;
  }, [isPanelOpen, spellResults, spellActionMap]);

  // 스토리북 생성 중인 페이지 ID 집합 — 썸네일 로딩 스피너 표시용
  const storybookPending = useStorybookSceneStore((s) => s.pendingGenerations);
  const storybookGeneratingPageIds = useMemo(() => {
    const set = new Set<string>();
    for (const pg of storybookPending) {
      if (pg.bannerPhase !== "generating") continue;
      pg.storyPageIds.forEach((id) => set.add(id));
    }
    return set;
  }, [storybookPending]);

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

  const { containerRef, listRef, suppressNextScroll } = useBottomBarScroll({
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

  // 드래그 중 커서가 하단 바 좌/우 가장자리에 가까워지면 자동으로 스크롤
  useEffect(() => {
    if (!isDragging) return;
    const scroller = listRef.current;
    if (!scroller) return;

    const EDGE_PX = 80;
    const MAX_SPEED = 18;
    const MIN_SPEED = 4;
    let rafId: number | null = null;
    let speed = 0;

    const step = () => {
      if (speed !== 0) {
        scroller.scrollLeft += speed;
      }
      rafId = requestAnimationFrame(step);
    };

    const handleDragOverEdge = (event: DragEvent) => {
      const rect = scroller.getBoundingClientRect();
      const leftDist = event.clientX - rect.left;
      const rightDist = rect.right - event.clientX;
      if (leftDist < EDGE_PX && leftDist >= 0) {
        const ratio = 1 - leftDist / EDGE_PX;
        speed = -Math.max(MIN_SPEED, Math.round(MAX_SPEED * ratio));
      } else if (rightDist < EDGE_PX && rightDist >= 0) {
        const ratio = 1 - rightDist / EDGE_PX;
        speed = Math.max(MIN_SPEED, Math.round(MAX_SPEED * ratio));
      } else {
        speed = 0;
      }
    };

    scroller.addEventListener("dragover", handleDragOverEdge);
    rafId = requestAnimationFrame(step);
    return () => {
      scroller.removeEventListener("dragover", handleDragOverEdge);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isDragging, listRef]);

  const [contextMenu, setContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);

  // 활성 페이지가 묶음 밖으로 나갈 때만 묶음 해제 (묶음 안에서의 이동/재정렬에서는 유지)
  useEffect(() => {
    setSelectedPageIds((prev) => {
      if (prev.length === 0) return prev;
      if (prev.includes(selectedPageId)) return prev;
      return [];
    });
  }, [selectedPageId]);

  // 페이지 목록이 바뀌면 삭제된 유령 ID를 자동 정리
  useEffect(() => {
    setSelectedPageIds((prev) => {
      if (prev.length === 0) return prev;
      const existing = new Set(pages.map((p) => p.id));
      const filtered = prev.filter((id) => existing.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [pages]);

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
      // 묶음의 앵커(=현재 활성 페이지)를 다시 단일 클릭한 경우는 묶음 유지 no-op
      const isAnchorReclick =
        pageId === selectedPageId && selectedPageIds.includes(pageId) && selectedPageIds.length > 1;
      if (isAnchorReclick) return;
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
  const onDeletePageRef = useRef(onDeletePage);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { onSelectPageRef.current = onSelectPage; }, [onSelectPage]);
  useEffect(() => { onPastePagesRef.current = onPastePages; }, [onPastePages]);
  useEffect(() => { onDeletePageRef.current = onDeletePage; }, [onDeletePage]);

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

      // Escape: 묶음 선택이 있으면 해제 (없으면 무시하고 이벤트 전파)
      if (event.key === "Escape" && currentSelectedPageIds.length > 0) {
        setSelectedPageIds([]);
        event.preventDefault();
        return;
      }

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

      // Ctrl+X: 페이지 데이터를 저장한 뒤 삭제 (잘라내기)
      if ((event.ctrlKey || event.metaKey) && event.key === "x") {
        const ids = currentSelectedPageIds.length > 0 ? currentSelectedPageIds : [currentSelectedPageId];
        const pagesToCut = ids
          .map((id) => currentPages.find((p) => p.id === id))
          .filter(Boolean);
        if (pagesToCut.length === 0) return;
        try {
          sessionStorage.setItem("cutPageData", JSON.stringify(pagesToCut));
          sessionStorage.removeItem("copiedPageIds");
        } catch {
          // 저장소 접근 실패는 무시
        }
        for (const id of ids) {
          onDeletePageRef.current(id);
        }
        event.preventDefault();
        return;
      }

      // Ctrl+V: 현재 페이지 직후에 복사된 페이지들 붙여넣기
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        suppressNextScroll();
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
      {/* 다중 선택 카운트 칩 (펼쳐진 상태에서만 표시) */}
      {!isCollapsed && selectedPageIds.length > 1 && (
        <div className="absolute -top-6 right-4 z-10 flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 shadow-sm">
          <span className="text-12-semibold text-primary-700">
            {selectedPageIds.length}개 선택됨
          </span>
          <button
            type="button"
            onClick={() => setSelectedPageIds([])}
            className="text-12-semibold text-primary-700 hover:text-primary-800"
            title="선택 해제 (Esc)"
          >
            ✕
          </button>
        </div>
      )}
      {!isCollapsed && (
        <div
          ref={listRef}
          className="flex flex-1 h-full items-center gap-2 overflow-x-auto overflow-y-hidden"
        >
          {items.map((item) => {
            if (item.type === "page") {
              const index = item.pageIndex;
              const dragHandlers = createDragHandlers(item.page.id);
              return (
                <div key={item.key}>
                  <PageThumbnail
                    page={item.page}
                    isSelected={
                      selectedPageId === item.page.id ||
                      selectedPageIds.includes(item.page.id)
                    }
                    isDragging={isDragging}
                    isPartOfActiveDrag={dragHandlers.isPartOfSelection}
                    canMoveLeft={index > 0}
                    canMoveRight={index < pages.length - 1}
                    readOnly={readOnly}
                    spellErrorCount={spellErrorCountByPageId.get(item.page.id)}
                    isStorybookGenerating={storybookGeneratingPageIds.has(item.page.id)}
                    onSelect={handlePageClick}
                    onDuplicate={readOnly ? undefined : onDuplicatePage}
                    onDelete={readOnly ? (() => {}) : onDeletePage}
                    onMovePage={readOnly ? undefined : onMovePage}
                    onContextMenu={readOnly ? (() => {}) : handlePageContextMenu(item.page.id)}
                    dragHandlers={dragHandlers}
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
              // 드래그 중 묶음에 포함된 페이지에 인접한 divider는 드롭 불가(의미 없는 이동)
              const prevPageId = pages[item.insertIndex - 1]?.id;
              const nextPageId = pages[item.insertIndex]?.id;
              const isBetweenSelection =
                isDragging &&
                ((prevPageId && selectedPageIds.includes(prevPageId)) ||
                  (nextPageId && selectedPageIds.includes(nextPageId))) &&
                selectedPageIds.length > 1;
              return (
                <PageInsertDivider
                  key={item.key}
                  isVisible={!readOnly && showAddButton}
                  onAdd={() => {
                    if (readOnly) return;
                    handleAddPageBetween(item.insertIndex);
                  }}
                  onDragOver={(event) => {
                    if (isBetweenSelection) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "none";
                      return;
                    }
                    handleDragOver(event);
                  }}
                  onDrop={
                    targetPageId && !isBetweenSelection
                      ? (e) => handleDrop(e, targetPageId, item.insertBefore)
                      : undefined
                  }
                />
              );
            }
            if (readOnly) return null;
            return <AddPageButton key={item.key} onAdd={onAddPage} />;
          })}
        </div>
      )}
      {!readOnly && <PageContextMenu
        contextMenu={contextMenu}
        onCopyPage={onCopyPage}
        onPastePage={(pageId) => {
          suppressNextScroll();
          onPastePage(pageId);
        }}
        onDeletePage={onDeletePage}
        onClose={() => {
          setContextMenu(null);
        }}
        hasCopiedPage={Boolean(getCopiedPageId())}
      />}
    </div>
  );
};

export default BottomBar;
