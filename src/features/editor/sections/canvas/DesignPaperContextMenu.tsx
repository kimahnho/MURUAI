/**
 * 요소 우클릭 시 노출되는 컨텍스트 메뉴 액션을 제공하는 컴포넌트.
 */
import { useRef, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpFromLine,
  ArrowUpToLine,
  ChevronsDown,
  ChevronsUp,
  ChevronRight,
  Clipboard,
  Copy,
  Group,
  Layers,
  Table,
  Trash2,
  Ungroup,
} from "lucide-react";
import type { CanvasElement } from "../../model/canvasTypes";

export type LayerDirection = "forward" | "front" | "backward" | "back";

export type ContextMenuState = {
  x: number;
  y: number;
  activeSubmenu?: "layer" | "table";
  target:
    | { type: "element"; id: string }
    | { type: "canvas"; pastePosition: { x: number; y: number } };
};

export type TableContextMenuActions = {
  hasSelectedCells: boolean;
  rows: number;
  cols: number;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onInsertColLeft: () => void;
  onInsertColRight: () => void;
  onDeleteRow: () => void;
  onDeleteCol: () => void;
};

type DesignPaperContextMenuProps = {
  contextMenu: ContextMenuState | null;
  elements: CanvasElement[];
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  isGroupedSelection: boolean;
  canPaste: boolean;
  tableContext?: TableContextMenuActions;
  onCopy: () => void;
  onPaste: (position?: { x: number; y: number }) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onMoveLayer: (id: string, direction: LayerDirection) => void;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
};

const SUBMENU_W = 240; // w-60

type SubmenuItem = {
  key: string;
  label: string;
  Icon: typeof ArrowUpFromLine;
  enabled: boolean;
  action: () => void;
};

// 메인 메뉴 위치를 기준으로 서브메뉴가 뷰포트에 맞도록 방향을 계산한다.
const Submenu = ({
  items,
  mainMenuRef,
  dividerAfter,
}: {
  items: SubmenuItem[];
  mainMenuRef: React.RefObject<HTMLDivElement | null>;
  dividerAfter?: number[];
}) => {
  const rect = mainMenuRef.current?.getBoundingClientRect();
  const vw = typeof window !== "undefined" ? window.innerWidth : 9999;
  const openLeft = rect ? rect.right + SUBMENU_W > vw : false;
  const dividerSet = new Set(dividerAfter ?? []);

  return (
    <div
      className={`absolute top-0 w-60 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg ${
        openLeft ? "right-full" : "left-full"
      }`}
    >
      {items.map(({ key, label, Icon, enabled, action }, idx) => (
        <div key={key}>
          <button
            type="button"
            onClick={action}
            disabled={!enabled}
            className={`flex w-full items-center gap-2 px-3 py-2 text-14-regular ${
              enabled ? "text-black-90 hover:bg-black-5" : "text-black-40"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
          {dividerSet.has(idx) && (
            <div className="mx-2 my-1 border-t border-black-10" />
          )}
        </div>
      ))}
    </div>
  );
};

// 선택 컨텍스트 메뉴와 레이어 정렬 메뉴를 렌더링한다.
export const DesignPaperContextMenu = ({
  contextMenu,
  elements,
  canGroupSelection,
  canUngroupSelection,
  isGroupedSelection,
  canPaste,
  tableContext,
  onCopy,
  onPaste,
  onGroup,
  onUngroup,
  onDelete,
  onMoveLayer,
  setContextMenu,
}: DesignPaperContextMenuProps) => {
  const mainMenuRef = useRef<HTMLDivElement>(null);

  if (!contextMenu) return null;

  const target = contextMenu.target;
  const isElementMenu = target.type === "element";
  const elementId = target.type === "element" ? target.id : null;
  const index = isElementMenu
    ? elements.findIndex((element) => element.id === elementId)
    : -1;
  const canForward = isElementMenu && index < elements.length - 1;
  const canBackward = isElementMenu && index > 0;

  const layerItems: SubmenuItem[] = [
    {
      key: "forward",
      label: "앞으로 가져오기",
      Icon: ArrowUpFromLine,
      enabled: canForward,
      action: () => elementId && onMoveLayer(elementId, "forward"),
    },
    {
      key: "front",
      label: "맨 앞으로 가져오기",
      Icon: ChevronsUp,
      enabled: canForward,
      action: () => elementId && onMoveLayer(elementId, "front"),
    },
    {
      key: "backward",
      label: "뒤로 보내기",
      Icon: ArrowUpToLine,
      enabled: canBackward,
      action: () => elementId && onMoveLayer(elementId, "backward"),
    },
    {
      key: "back",
      label: "맨 뒤로 보내기",
      Icon: ChevronsDown,
      enabled: canBackward,
      action: () => elementId && onMoveLayer(elementId, "back"),
    },
  ];

  const showTableSubmenu =
    isElementMenu && tableContext?.hasSelectedCells;

  const tableItems: SubmenuItem[] = tableContext
    ? [
        {
          key: "insert-row-above",
          label: "위에 행 추가",
          Icon: ArrowUpFromLine,
          enabled: true,
          action: tableContext.onInsertRowAbove,
        },
        {
          key: "insert-row-below",
          label: "아래에 행 추가",
          Icon: ArrowUpToLine,
          enabled: true,
          action: tableContext.onInsertRowBelow,
        },
        {
          key: "insert-col-left",
          label: "왼쪽에 열 추가",
          Icon: ArrowUpFromLine,
          enabled: true,
          action: tableContext.onInsertColLeft,
        },
        {
          key: "insert-col-right",
          label: "오른쪽에 열 추가",
          Icon: ArrowUpToLine,
          enabled: true,
          action: tableContext.onInsertColRight,
        },
        {
          key: "delete-row",
          label: "행 삭제",
          Icon: Trash2,
          enabled: tableContext.rows > 1,
          action: tableContext.onDeleteRow,
        },
        {
          key: "delete-col",
          label: "열 삭제",
          Icon: Trash2,
          enabled: tableContext.cols > 1,
          action: tableContext.onDeleteCol,
        },
      ]
    : [];

  // transform된 부모 안에서 position:fixed가 깨지므로 portal로 body에 마운트한다.
  return createPortal(
    <div
      data-context-menu-portal
      className="fixed z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onMouseLeave={() =>
        setContextMenu((prev) =>
          prev ? { ...prev, activeSubmenu: undefined } : prev,
        )
      }
    >
      <div ref={mainMenuRef} className="w-56 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg">
        {isElementMenu && (
          <button
            type="button"
            onClick={onCopy}
            className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
          >
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              복사
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onPaste(
              target.type === "canvas" ? target.pastePosition : undefined,
            );
          }}
          disabled={!canPaste}
          className={`flex w-full items-center justify-between px-3 py-2 text-14-regular ${
            canPaste ? "text-black-90 hover:bg-black-5" : "text-black-40"
          }`}
        >
          <span className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" />
            붙여넣기
          </span>
        </button>
        {isElementMenu && canGroupSelection && (
          <button
            type="button"
            onClick={onGroup}
            disabled={isGroupedSelection}
            className={`flex w-full items-center justify-between px-3 py-2 text-14-regular ${
              isGroupedSelection
                ? "cursor-not-allowed text-black-40"
                : "text-black-90 hover:bg-black-5"
            }`}
          >
            <span className="flex items-center gap-2">
              <Group className="h-4 w-4" />
              그룹화
            </span>
          </button>
        )}
        {isElementMenu && canUngroupSelection && (
          <button
            type="button"
            onClick={onUngroup}
            className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
          >
            <span className="flex items-center gap-2">
              <Ungroup className="h-4 w-4" />
              그룹 해제
            </span>
          </button>
        )}
        {isElementMenu && (
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              삭제
            </span>
          </button>
        )}
        {showTableSubmenu && (
          <button
            type="button"
            onMouseEnter={() => {
              setContextMenu((prev) =>
                prev ? { ...prev, activeSubmenu: "table" } : prev,
              );
            }}
            className="flex w-full min-h-10 items-center justify-between px-3 py-2.5 text-14-regular text-black-90 hover:bg-black-5"
          >
            <span className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              표 편집
            </span>
            <ChevronRight className="h-4 w-4 text-black-50" />
          </button>
        )}
        {isElementMenu && (
          <button
            type="button"
            onMouseEnter={() => {
              setContextMenu((prev) =>
                prev ? { ...prev, activeSubmenu: "layer" } : prev,
              );
            }}
            className="flex w-full min-h-10 items-center justify-between px-3 py-2.5 text-14-regular text-black-90 hover:bg-black-5"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              레이어
            </span>
            <ChevronRight className="h-4 w-4 text-black-50" />
          </button>
        )}
      </div>
      {isElementMenu && contextMenu.activeSubmenu === "layer" && (
        <Submenu
          items={layerItems}
          mainMenuRef={mainMenuRef}
        />
      )}
      {showTableSubmenu && contextMenu.activeSubmenu === "table" && (
        <Submenu
          items={tableItems}
          mainMenuRef={mainMenuRef}
          dividerAfter={[1, 3]}
        />
      )}
    </div>,
    document.body,
  );
};
