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
  Trash2,
  Ungroup,
} from "lucide-react";
import type { CanvasElement } from "../../model/canvasTypes";

export type LayerDirection = "forward" | "front" | "backward" | "back";

export type ContextMenuState = {
  x: number;
  y: number;
  activeSubmenu?: "layer";
  target:
    | { type: "element"; id: string }
    | { type: "canvas"; pastePosition: { x: number; y: number } };
};

type DesignPaperContextMenuProps = {
  contextMenu: ContextMenuState | null;
  elements: CanvasElement[];
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  isGroupedSelection: boolean;
  canPaste: boolean;
  onCopy: () => void;
  onPaste: (position?: { x: number; y: number }) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onMoveLayer: (id: string, direction: LayerDirection) => void;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
};

const SUBMENU_W = 240; // w-60

// 메인 메뉴 위치를 기준으로 서브메뉴가 뷰포트에 맞도록 방향을 계산한다.
const LayerSubmenu = ({
  items,
  mainMenuRef,
}: {
  items: Array<{
    key: string;
    label: string;
    Icon: typeof ArrowUpFromLine;
    enabled: boolean;
    action: () => void;
  }>;
  mainMenuRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const rect = mainMenuRef.current?.getBoundingClientRect();
  const vw = typeof window !== "undefined" ? window.innerWidth : 9999;
  const openLeft = rect ? rect.right + SUBMENU_W > vw : false;

  return (
    <div
      className={`absolute top-0 w-60 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg ${
        openLeft ? "right-full" : "left-full"
      }`}
    >
      {items.map(({ key, label, Icon, enabled, action }) => (
        <button
          key={key}
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

  const items = [
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

  // transform된 부모 안에서 position:fixed가 깨지므로 portal로 body에 마운트한다.
  return createPortal(
    <div
      className="fixed z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onMouseLeave={() =>
        // 레이어 서브메뉴는 마우스 이탈 시만 닫아 메뉴 이동 중 깜빡임을 줄인다.
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
        <LayerSubmenu
          items={items}
          mainMenuRef={mainMenuRef}
        />
      )}
    </div>,
    document.body,
  );
};
