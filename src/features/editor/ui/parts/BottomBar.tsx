import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Fragment,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Page } from "../../model/pageTypes";
import DesignPaper from "./DesignPaper";
import { useBottomBarDrag } from "./hooks/useBottomBarDrag";
import { useBottomBarScroll } from "./hooks/useBottomBarScroll";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;
const PAGE_SIZE_PX = { width: mmToPx(210), height: mmToPx(297) };
const PREVIEW_BOX = {
  vertical: { width: 64, height: 90 },
  horizontal: { width: 90, height: 64 },
};
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
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onSelect: (pageId: string) => void;
  onDuplicate?: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onMovePage?: (pageId: string, direction: "left" | "right") => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  dragHandlers: {
    onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
    onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
    onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  };
  itemRef: (node: HTMLDivElement | null) => void;
};

const PageThumbnail = ({
  page,
  isSelected,
  canMoveLeft,
  canMoveRight,
  onSelect,
  onDuplicate,
  onDelete,
  onMovePage,
  onContextMenu,
  dragHandlers,
  itemRef,
}: PageThumbnailProps) => {
  const { isHorizontal, pageSize, previewScale, scaledWidth, scaledHeight } =
    getPreviewMetrics(page.orientation);

  return (
    <div
      ref={itemRef}
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      onContextMenu={onContextMenu}
      className="group flex shrink-0 flex-col items-center gap-1 cursor-move"
    >
      <div className="relative">
        <button
          onClick={() => {
            onSelect(page.id);
          }}
          className={`relative flex items-center justify-center rounded-lg border-2 transition cursor-pointer overflow-hidden ${
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
        <>
          {canMoveLeft && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMovePage?.(page.id, "left");
              }}
              className="absolute left-0 top-1/2 translate-x-1/3 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-black-70 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-black-90"
            >
              <ChevronLeft className="w-3 h-3 text-white" />
            </button>
          )}
          {canMoveRight && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMovePage?.(page.id, "right");
              }}
              className="absolute right-0 top-1/2 -translate-x-1/3 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-black-70 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-black-90"
            >
              <ChevronRight className="w-3 h-3 text-white" />
            </button>
          )}
        </>
      </div>
      <div className="flex items-center justify-center gap-1 h-5">
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate?.(page.id);
            }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black-10 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-black-20"
            title="복제"
          >
            <Copy className="w-3 h-3 text-black-60" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(page.id);
            }}
            className="flex items-center justify-center w-5 h-5 rounded bg-black-10 opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-red-100 hover:text-white"
            title="삭제"
          >
            <Trash2 className="w-3 h-3 text-black-60 hover:text-white" />
          </button>
        </>
      </div>
    </div>
  );
};

type PageInsertDividerProps = {
  isVisible: boolean;
  onAdd: () => void;
};

const PageInsertDivider = ({ isVisible, onAdd }: PageInsertDividerProps) => {
  if (!isVisible) return null;
  return (
    <div className="group relative flex items-center shrink-0 h-full">
      <div
        className={`flex items-center justify-center h-full pb-5 transition-all ${"w-1 group-hover:w-8"}`}
      >
        <button
          onClick={onAdd}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-primary opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-primary/90 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};

type AddPageButtonProps = {
  onAdd: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
};

const AddPageButton = ({ onAdd, buttonRef }: AddPageButtonProps) => (
  <div className="flex shrink-0 flex-col items-center gap-2 ml-2">
    <button
      ref={buttonRef}
      onClick={onAdd}
      className="flex flex-col items-center justify-center w-16 h-22.5 rounded-lg border-2 border-dashed border-black-30 hover:border-primary hover:bg-primary/5 transition cursor-pointer"
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
  onReorderPages: (pages: Page[]) => void;
  onDeletePage: (pageId: string) => void;
  onAddPageAtIndex?: (index: number) => void;
  onMovePage?: (pageId: string, direction: "left" | "right") => void;
  onDuplicatePage?: (pageId: string) => void;
}

const BottomBar = ({
  pages,
  selectedPageId,
  onAddPage,
  onSelectPage,
  onCopyPage,
  onPastePage,
  onReorderPages,
  onDeletePage,
  onAddPageAtIndex,
  onMovePage,
  onDuplicatePage,
}: BottomBarProps) => {
  const { containerRef, listRef, addButtonRef, registerPageRef, handleWheel } =
    useBottomBarScroll({ pages, selectedPageId });
  const { createDragHandlers } = useBottomBarDrag({
    pages,
    onReorderPages,
  });

  const [contextMenu, setContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);

  const getCopiedPageId = () => {
    try {
      return sessionStorage.getItem("copiedPageId");
    } catch {
      return null;
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

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative flex shrink-0 w-full h-36 bg-white border-t border-black-25 items-center pt-3 px-4 outline-none"
      onPointerDown={() => {
        setContextMenu(null);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onWheel={handleWheel}
    >
      {/* 페이지 리스트 + 추가 버튼 - 가로 스크롤 */}
      <div
        ref={listRef}
        className="flex flex-1 h-full items-start pt-1 pb-3 gap-2 overflow-x-auto overflow-y-hidden"
      >
        {pages.map((page, index) => {
          return (
            <Fragment key={page.id}>
              <PageThumbnail
                page={page}
                isSelected={selectedPageId === page.id}
                canMoveLeft={index > 0}
                canMoveRight={index < pages.length - 1}
                onSelect={onSelectPage}
                onDuplicate={onDuplicatePage}
                onDelete={onDeletePage}
                onMovePage={onMovePage}
                onContextMenu={handlePageContextMenu(page.id)}
                dragHandlers={createDragHandlers(page.id)}
                itemRef={registerPageRef(page.id)}
              />
              <PageInsertDivider
                isVisible={pages.length >= 2 && index < pages.length - 1}
                onAdd={() => {
                  handleAddPageBetween(index + 1);
                }}
              />
            </Fragment>
          );
        })}

        <AddPageButton onAdd={onAddPage} buttonRef={addButtonRef} />
      </div>
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
