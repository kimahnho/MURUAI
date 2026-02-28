/**
 * 표 요소를 렌더링하고 선택/드래그/리사이즈 상호작용을 처리하는 컴포넌트.
 */
import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TableElement, Rect, ResizeHandle } from "../../../../model/canvasTypes";
import { getScale } from "../../../../utils/domUtils";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

const HANDLE_SIZE = 10;
const HALF_HANDLE = HANDLE_SIZE / 2;
const SELECTION_COLOR = "#5500ff";

type ResizeHandlePosition = {
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  transform?: string;
};

const getHandlePosition = (handle: ResizeHandle): ResizeHandlePosition => {
  if (handle === "nw") return { left: -HALF_HANDLE, top: -HALF_HANDLE };
  if (handle === "ne") return { right: -HALF_HANDLE, top: -HALF_HANDLE };
  if (handle === "sw") return { left: -HALF_HANDLE, bottom: -HALF_HANDLE };
  if (handle === "se") return { right: -HALF_HANDLE, bottom: -HALF_HANDLE };
  if (handle === "n") return { left: "50%", top: -HALF_HANDLE, transform: "translateX(-50%)" };
  if (handle === "s") return { left: "50%", bottom: -HALF_HANDLE, transform: "translateX(-50%)" };
  if (handle === "e") return { right: -HALF_HANDLE, top: "50%", transform: "translateY(-50%)" };
  return { left: -HALF_HANDLE, top: "50%", transform: "translateY(-50%)" };
};

const getResizeCursor = (handle: ResizeHandle) => {
  if (handle === "nw" || handle === "se") return "nwse-resize";
  if (handle === "ne" || handle === "sw") return "nesw-resize";
  if (handle === "n" || handle === "s") return "ns-resize";
  return "ew-resize";
};

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

interface TableBoxProps {
  element: TableElement;
  isSelected: boolean;
  selectionCount: number;
  locked: boolean;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => Rect;
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLElement>) => void;
  onCellTextChange?: (rowIndex: number, colIndex: number, text: string) => void;
}

export const TableBox = ({
  element,
  isSelected,
  selectionCount,
  locked,
  transformRect,
  onRectChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
  onCellTextChange,
}: TableBoxProps) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<Rect>({
    x: element.x,
    y: element.y,
    width: element.w,
    height: element.h,
  });
  rectRef.current = { x: element.x, y: element.y, width: element.w, height: element.h };

  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const { startPointerDragSession } = usePointerDragSession();

  const cellHeight = element.h / element.rows;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (locked) return;

    event.stopPropagation();

    if (!isSelected) {
      onSelectChange?.(true, { additive: event.shiftKey });
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = { ...rectRef.current };
    const scale = getScale(boxRef.current);

    startPointerDragSession({
      thresholdPx: 3,
      startContext: { startX, startY, startRect },
      createMoveContext: (moveEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const nextRect: Rect = {
          x: startRect.x + dx,
          y: startRect.y + dy,
          width: startRect.width,
          height: startRect.height,
        };
        const transformed = transformRect
          ? transformRect(nextRect, { type: "drag" })
          : nextRect;
        return { distance, context: { nextRect: transformed } };
      },
      onStart: () => {
        onDragStateChange?.(true);
      },
      onMove: ({ nextRect }) => {
        onRectChange?.(nextRect);
      },
      onEnd: (moved) => {
        if (moved) {
          onDragStateChange?.(false, rectRef.current, { type: "drag" });
        } else {
          onDragStateChange?.(false);
        }
      },
    });
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = { ...rectRef.current };
    const scale = getScale(boxRef.current);

    startPointerDragSession({
      thresholdPx: 0,
      startContext: {},
      createMoveContext: (moveEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let nextRect = { ...startRect };
        if (handle.includes("e")) nextRect.width = Math.max(1, startRect.width + dx);
        if (handle.includes("s")) nextRect.height = Math.max(1, startRect.height + dy);
        if (handle.includes("w")) {
          nextRect.x = startRect.x + dx;
          nextRect.width = Math.max(1, startRect.width - dx);
        }
        if (handle.includes("n")) {
          nextRect.y = startRect.y + dy;
          nextRect.height = Math.max(1, startRect.height - dy);
        }

        const transformed = transformRect
          ? transformRect(nextRect, { type: "resize", handle })
          : nextRect;
        return { distance, context: { nextRect: transformed } };
      },
      onStart: () => {
        onDragStateChange?.(true);
      },
      onMove: ({ nextRect }) => {
        onRectChange?.(nextRect);
      },
      onEnd: (moved) => {
        if (moved) {
          onDragStateChange?.(false, rectRef.current, { type: "resize", handle });
        } else {
          onDragStateChange?.(false);
        }
      },
    });
  };

  return (
    <div
      ref={boxRef}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        outline: isSelected ? `2px solid ${SELECTION_COLOR}` : "none",
        outlineOffset: isSelected ? 1 : 0,
        cursor: locked ? "default" : "move",
        userSelect: "none",
        boxSizing: "border-box",
      }}
      onPointerDown={handlePointerDown}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event);
      }}
    >
      {/* 셀 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${element.cols}, 1fr)`,
          gridTemplateRows: `repeat(${element.rows}, ${cellHeight}px)`,
          width: "100%",
          height: "100%",
          border: "1px solid #000000",
          boxSizing: "border-box",
        }}
      >
        {element.cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isEditingThis =
              editingCell?.row === rowIndex && editingCell?.col === colIndex;
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  borderRight: colIndex < element.cols - 1 ? "1px solid #000000" : "none",
                  borderBottom: rowIndex < element.rows - 1 ? "1px solid #000000" : "none",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px 4px",
                  fontSize: 13,
                  lineHeight: 1.4,
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
                onDoubleClick={(event) => {
                  if (locked) return;
                  event.stopPropagation();
                  setEditingCell({ row: rowIndex, col: colIndex });
                }}
              >
                {isEditingThis ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={{ outline: "none", width: "100%", minHeight: "1em" }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const text = e.currentTarget.textContent ?? "";
                      onCellTextChange?.(rowIndex, colIndex, text);
                      setEditingCell(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.currentTarget.blur();
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    // biome-ignore lint/a11y/noAutofocus: 편집 진입 즉시 입력 가능해야 함
                    autoFocus
                  >
                    {cell.text}
                  </div>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {cell.text}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 리사이즈 핸들 (선택 상태이고 편집 중이 아닐 때) */}
      {isSelected && selectionCount === 1 && !locked && !editingCell && (
        <>
          {RESIZE_HANDLES.map((handle) => (
            <div
              key={handle}
              style={{
                position: "absolute",
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                backgroundColor: "#ffffff",
                border: `1.5px solid ${SELECTION_COLOR}`,
                borderRadius: 2,
                cursor: getResizeCursor(handle),
                ...getHandlePosition(handle),
              }}
              onPointerDown={(event) => {
                handleResizePointerDown(event, handle);
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default TableBox;
