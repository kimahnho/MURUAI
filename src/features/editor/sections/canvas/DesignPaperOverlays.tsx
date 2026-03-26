/**
 * 선택 박스/가이드 등 캔버스 오버레이 레이어를 렌더링하는 컴포넌트.
 */
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { CanvasElement } from "../../model/canvasTypes";
import { getRectFromElement, type Rect, type SelectionRect } from "../../utils/designPaperUtils";
import type { ResizeHandle } from "../../model/canvasTypes";

type SelectionRectOverlayProps = {
  selectionRect: SelectionRect | null;
};

// 다중 선택 드래그 중 선택 사각형을 그린다.
export const SelectionRectOverlay = ({
  selectionRect,
}: SelectionRectOverlayProps) => {
  if (!selectionRect) return null;
  return (
    <div
      className="absolute z-40 border border-primary-400 pointer-events-none"
      style={{
        left: selectionRect.x,
        top: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
        backgroundColor: "rgba(237, 233, 254, 0.3)",
      }}
    />
  );
};

type GroupSelectionOverlayProps = {
  isGroupedSelection: boolean;
  readOnly: boolean;
  selectedIds: string[];
  elements: CanvasElement[];
  showHandles?: boolean;
  onResizeHandlePointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
    rect: Rect,
  ) => void;
  onDragPointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    rect: Rect,
  ) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
};

// 그룹 선택 시 바운딩 박스를 그린다.
export const GroupSelectionOverlay = ({
  isGroupedSelection,
  readOnly,
  selectedIds,
  elements,
  showHandles = false,
  onResizeHandlePointerDown,
  onDragPointerDown,
  onContextMenu,
}: GroupSelectionOverlayProps) => {
  if (!isGroupedSelection || readOnly) return null;

  // element Map 인덱싱 + 단일 패스 바운딩 박스로 O(n×m) → O(n+m) 최적화
  const elementMap = new Map(elements.map((el) => [el.id, el]));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let rectCount = 0;

  for (const id of selectedIds) {
    const element = elementMap.get(id);
    if (!element) continue;
    const rect = getRectFromElement(element);
    if (!rect) continue;
    rectCount++;
    if (rect.x < minX) minX = rect.x;
    if (rect.y < minY) minY = rect.y;
    if (rect.x + rect.width > maxX) maxX = rect.x + rect.width;
    if (rect.y + rect.height > maxY) maxY = rect.y + rect.height;
  }

  if (rectCount === 0) return null;

  const groupBoundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  const cornerSize = 16;
  const sideWidth = 24;
  const sideHeight = 10;
  const renderCornerHandle = (
    handle: ResizeHandle,
    x: number,
    y: number,
    cursor: string,
  ) => (
    <div
      key={handle}
      className="absolute rounded-full border border-gray-600 bg-white-100 shadow-sm pointer-events-auto"
      style={{
        width: cornerSize,
        height: cornerSize,
        left: x - cornerSize / 2,
        top: y - cornerSize / 2,
        cursor,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onResizeHandlePointerDown?.(event, handle, groupBoundingBox);
      }}
    />
  );
  const renderSideHandle = (
    handle: ResizeHandle,
    x: number,
    y: number,
    cursor: string,
  ) => (
    <div
      key={handle}
      className="absolute rounded-full border border-gray-600 bg-white-100 shadow-sm pointer-events-auto"
      style={{
        width: sideWidth,
        height: sideHeight,
        left: x - sideWidth / 2,
        top: y - sideHeight / 2,
        cursor,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onResizeHandlePointerDown?.(event, handle, groupBoundingBox);
      }}
    />
  );

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: groupBoundingBox.x,
        top: groupBoundingBox.y,
        width: groupBoundingBox.width,
        height: groupBoundingBox.height,
      }}
    >
      <div className="absolute inset-0 border-2 border-dashed border-gray-600" />
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ cursor: "move" }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragPointerDown?.(event, groupBoundingBox);
        }}
        onContextMenu={onContextMenu}
      />
      {showHandles && (
        <>
          {renderCornerHandle("nw", 0, 0, "nwse-resize")}
          {renderCornerHandle("ne", groupBoundingBox.width, 0, "nesw-resize")}
          {renderCornerHandle("sw", 0, groupBoundingBox.height, "nesw-resize")}
          {renderCornerHandle("se", groupBoundingBox.width, groupBoundingBox.height, "nwse-resize")}
          {renderSideHandle("n", groupBoundingBox.width / 2, 0, "ns-resize")}
          {renderSideHandle("s", groupBoundingBox.width / 2, groupBoundingBox.height, "ns-resize")}
          {renderSideHandle("w", 0, groupBoundingBox.height / 2, "ew-resize")}
          {renderSideHandle("e", groupBoundingBox.width, groupBoundingBox.height / 2, "ew-resize")}
        </>
      )}
    </div>
  );
};
