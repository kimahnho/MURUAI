/**
 * 선택 박스/가이드 등 캔버스 오버레이 레이어를 렌더링하는 컴포넌트.
 */
import type { PointerEvent as ReactPointerEvent } from "react";
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
      className="absolute z-40 border border-primary/60 bg-primary/10 pointer-events-none"
      style={{
        left: selectionRect.x,
        top: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
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
}: GroupSelectionOverlayProps) => {
  if (!isGroupedSelection || readOnly) return null;

  const groupRects = selectedIds
    .map((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element) return null;
      return getRectFromElement(element);
    })
    .filter((rect): rect is Rect => Boolean(rect));

  if (groupRects.length === 0) return null;

  // 선택 요소 전체 경계로 가상 그룹 박스를 만들어 그룹 이동/리사이즈의 기준 좌표로 사용한다.
  const minX = Math.min(...groupRects.map((r) => r.x));
  const minY = Math.min(...groupRects.map((r) => r.y));
  const maxX = Math.max(...groupRects.map((r) => r.x + r.width));
  const maxY = Math.max(...groupRects.map((r) => r.y + r.height));

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
