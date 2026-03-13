/**
 * 표 요소를 렌더링하고 선택/드래그/리사이즈 상호작용을 처리하는 컴포넌트.
 */
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { TableElement, Rect, ResizeHandle } from "../../../../model/canvasTypes";
import { getScale } from "../../../../utils/domUtils";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";
import { useTableStore } from "../../../../store/tableStore";

const HANDLE_SIZE = 10;
const HALF_HANDLE = HANDLE_SIZE / 2;
const SELECTION_COLOR = "#5500ff";
// 열/행 분리선 드래그 감지 영역 너비(px) — 히트 영역
const DIVIDER_HIT = 6;
// 행/열 헤더 버튼 크기 및 표와의 간격
const HEADER_BTN_SIZE = 18;
const HEADER_GAP = 4;

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

// colWidths 없으면 균등 분배, 있으면 비율 보정해 합이 w가 되도록 정규화
// 포인터 좌표에서 셀 인덱스를 계산해 드래그 선택에 사용한다.
const hitCellFromPointer = (
  clientX: number,
  clientY: number,
  box: HTMLDivElement,
  colWidths: number[],
  rowHeights: number[],
  scale: number,
): { row: number; col: number } | null => {
  const rect = box.getBoundingClientRect();
  const x = (clientX - rect.left) / scale;
  const y = (clientY - rect.top) / scale;
  let col = -1;
  let accX = 0;
  for (let i = 0; i < colWidths.length; i++) {
    accX += colWidths[i];
    if (x < accX) { col = i; break; }
  }
  let row = -1;
  let accY = 0;
  for (let i = 0; i < rowHeights.length; i++) {
    accY += rowHeights[i];
    if (y < accY) { row = i; break; }
  }
  if (col === -1) col = colWidths.length - 1;
  if (row === -1) row = rowHeights.length - 1;
  if (col < 0 || row < 0) return null;
  return { row, col };
};

const resolveColWidths = (cols: number, w: number, colWidths?: number[]): number[] => {
  if (!colWidths || colWidths.length !== cols) {
    return Array.from({ length: cols }, () => w / cols);
  }
  const sum = colWidths.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array.from({ length: cols }, () => w / cols);
  return colWidths.map((cw) => (cw / sum) * w);
};

// rowHeights 없으면 균등 분배
const resolveRowHeights = (rows: number, h: number, rowHeights?: number[]): number[] => {
  if (!rowHeights || rowHeights.length !== rows) {
    return Array.from({ length: rows }, () => h / rows);
  }
  const sum = rowHeights.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array.from({ length: rows }, () => h / rows);
  return rowHeights.map((rh) => (rh / sum) * h);
};

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
  onColWidthsChange?: (colWidths: number[]) => void;
  onRowHeightsChange?: (rowHeights: number[]) => void;
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
  onColWidthsChange,
  onRowHeightsChange,
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
  const [hoveredColDivider, setHoveredColDivider] = useState<number | null>(null);
  const [hoveredRowDivider, setHoveredRowDivider] = useState<number | null>(null);
  // 현재 포인터 이벤트 시작 시점에 테이블이 이미 선택 상태였는지 추적 — 첫 클릭은 요소 선택만, 두 번째 클릭부터 셀 선택
  const wasSelectedBeforePointerRef = useRef(false);
  // tableStore를 단일 진실 공급원으로 사용
  const selectedCells = useTableStore((s) => s.selectedCells);
  const setSelectedCells = useTableStore((s) => s.setSelectedCells);

  // 표 선택이 해제되면 셀 선택도 초기화한다.
  useEffect(() => {
    if (!isSelected) {
      setSelectedCells([]);
      setEditingCell(null);
    }
  }, [isSelected, setSelectedCells]);


  const { startPointerDragSession } = usePointerDragSession();

  const colWidths = resolveColWidths(element.cols, element.w, element.colWidths);
  const rowHeights = resolveRowHeights(element.rows, element.h, element.rowHeights);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (locked) return;

    event.stopPropagation();

    // 포인터 시작 시점의 선택 상태 기록
    wasSelectedBeforePointerRef.current = isSelected;

    if (!isSelected) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

    const scale = getScale(boxRef.current);

    // 셀이 선택된 상태에서만 셀 드래그 모드 — 셀 미선택 시 요소 이동 드래그
    if (wasSelectedBeforePointerRef.current && selectedCells.length > 0 && boxRef.current) {
      const startCell = hitCellFromPointer(event.clientX, event.clientY, boxRef.current, colWidths, rowHeights, scale);
      if (!startCell) return;

      const startClientX = event.clientX;
      const startClientY = event.clientY;

      // 클릭 시점에 해당 셀이 이미 선택되어 있었는지 기록 — 이미 선택된 셀을 다시 클릭해야 편집 진입
      const wasCellAlreadySelected = selectedCells.some(
        (c) => c.row === startCell.row && c.col === startCell.col,
      );

      setEditingCell(null);

      // Cmd(Meta) 클릭: 기존 선택에 토글 추가/제거
      const isMetaClick = event.metaKey || event.ctrlKey;
      if (isMetaClick) {
        if (wasCellAlreadySelected) {
          // 이미 선택된 셀 → 제거 (최소 1개는 유지)
          const filtered = selectedCells.filter(
            (c) => c.row !== startCell.row || c.col !== startCell.col,
          );
          setSelectedCells(filtered.length > 0 ? filtered : [startCell]);
        } else {
          setSelectedCells([...selectedCells, startCell]);
        }
      } else {
        setSelectedCells([startCell]);
      }

      // Cmd 클릭 시 기존 선택 기반을 유지해 드래그에 반영
      const baseCells = isMetaClick
        ? selectedCells.filter(
            (c) => c.row !== startCell.row || c.col !== startCell.col,
          )
        : [];

      startPointerDragSession({
        thresholdPx: 3,
        startContext: { startCell },
        createMoveContext: (moveEvent) => {
          const distance = Math.sqrt(
            (moveEvent.clientX - startClientX) ** 2 +
            (moveEvent.clientY - startClientY) ** 2,
          );
          return { distance, context: { moveEvent } };
        },
        onStart: () => {
          setEditingCell(null);
        },
        onMove: ({ moveEvent }) => {
          if (!boxRef.current) return;
          const currentCell = hitCellFromPointer(moveEvent.clientX, moveEvent.clientY, boxRef.current, colWidths, rowHeights, scale);
          if (!currentCell) return;
          // 시작 셀 ~ 현재 셀 직사각형 범위 내 모든 셀 선택
          const minRow = Math.min(startCell.row, currentCell.row);
          const maxRow = Math.max(startCell.row, currentCell.row);
          const minCol = Math.min(startCell.col, currentCell.col);
          const maxCol = Math.max(startCell.col, currentCell.col);
          const dragCells: { row: number; col: number }[] = [];
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              dragCells.push({ row: r, col: c });
            }
          }
          // Cmd 드래그: 기존 선택 + 드래그 범위 합산
          if (baseCells.length > 0) {
            const merged = [...baseCells];
            for (const dc of dragCells) {
              if (!merged.some((c) => c.row === dc.row && c.col === dc.col)) {
                merged.push(dc);
              }
            }
            setSelectedCells(merged);
          } else {
            setSelectedCells(dragCells);
          }
        },
        onEnd: (moved) => {
          if (!moved && wasCellAlreadySelected && !isMetaClick) {
            // 이미 선택된 셀을 다시 클릭(드래그 없음, Cmd 없음) → 편집 진입
            setSelectedCells([startCell]);
            setEditingCell(startCell);
          }
        },
      });
      return;
    }

    // 미선택 상태 → 테이블 이동 드래그
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = { ...rectRef.current };

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
        setSelectedCells([]);
        setEditingCell(null);
        onDragStateChange?.(true);
      },
      onMove: ({ nextRect }) => {
        onRectChange?.(nextRect);
      },
      onEnd: (moved) => {
        if (moved) {
          onDragStateChange?.(false, rectRef.current, { type: "drag" });
        } else if (wasSelectedBeforePointerRef.current && boxRef.current) {
          // 이미 선택된 상태에서 클릭(드래그 없음) → 클릭한 셀 선택
          const clickedCell = hitCellFromPointer(event.clientX, event.clientY, boxRef.current, colWidths, rowHeights, scale);
          if (clickedCell) {
            setSelectedCells([clickedCell]);
            setEditingCell(null);
          }
          onDragStateChange?.(false);
        } else {
          setSelectedCells([]);
          setEditingCell(null);
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

  // 열 분리선(colIndex: 0 ~ cols-2) 드래그 — 인접한 두 열 너비를 조정
  const handleColDividerPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    colIndex: number,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    const startX = event.clientX;
    const scale = getScale(boxRef.current);
    const startWidths = [...colWidths];
    const minWidth = 10;

    startPointerDragSession({
      thresholdPx: 0,
      startContext: {},
      createMoveContext: (moveEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const leftNew = Math.max(minWidth, startWidths[colIndex] + dx);
        const rightNew = Math.max(
          minWidth,
          startWidths[colIndex] + startWidths[colIndex + 1] - leftNew,
        );
        const actualLeft = startWidths[colIndex] + startWidths[colIndex + 1] - rightNew;
        const next = [...startWidths];
        next[colIndex] = actualLeft;
        next[colIndex + 1] = rightNew;
        return { distance: Math.abs(dx), context: { next } };
      },
      onStart: () => {},
      onMove: ({ next }) => {
        onColWidthsChange?.(next);
      },
      onEnd: () => {},
    });
  };

  // 행 분리선(rowIndex: 0 ~ rows-2) 드래그 — 인접한 두 행 높이를 조정
  const handleRowDividerPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    rowIndex: number,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();

    const startY = event.clientY;
    const scale = getScale(boxRef.current);
    const startHeights = [...rowHeights];
    const minHeight = 10;

    startPointerDragSession({
      thresholdPx: 0,
      startContext: {},
      createMoveContext: (moveEvent) => {
        const dy = (moveEvent.clientY - startY) / scale;
        const topNew = Math.max(minHeight, startHeights[rowIndex] + dy);
        const bottomNew = Math.max(
          minHeight,
          startHeights[rowIndex] + startHeights[rowIndex + 1] - topNew,
        );
        const actualTop = startHeights[rowIndex] + startHeights[rowIndex + 1] - bottomNew;
        const next = [...startHeights];
        next[rowIndex] = actualTop;
        next[rowIndex + 1] = bottomNew;
        return { distance: Math.abs(dy), context: { next } };
      },
      onStart: () => {},
      onMove: ({ next }) => {
        onRowHeightsChange?.(next);
      },
      onEnd: () => {},
    });
  };

  // 열 분리선 x 위치 목록 (colIndex 0~cols-2 각각의 누적 너비)
  const colDividerPositions: number[] = [];
  let accW = 0;
  for (let i = 0; i < element.cols - 1; i++) {
    accW += colWidths[i];
    colDividerPositions.push(accW);
  }

  // 행 분리선 y 위치 목록
  const rowDividerPositions: number[] = [];
  let accH = 0;
  for (let i = 0; i < element.rows - 1; i++) {
    accH += rowHeights[i];
    rowDividerPositions.push(accH);
  }

  // 열 헤더 버튼 x 위치 (각 열 중앙)
  const colHeaderPositions: number[] = [];
  let accumW = 0;
  for (let i = 0; i < element.cols; i++) {
    colHeaderPositions.push(accumW + colWidths[i] / 2 - HEADER_BTN_SIZE / 2);
    accumW += colWidths[i];
  }

  // 행 헤더 버튼 y 위치 (각 행 중앙)
  const rowHeaderPositions: number[] = [];
  let accumH = 0;
  for (let i = 0; i < element.rows; i++) {
    rowHeaderPositions.push(accumH + rowHeights[i] / 2 - HEADER_BTN_SIZE / 2);
    accumH += rowHeights[i];
  }

  const showHeaders = isSelected && selectedCells.length > 0;

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
        // 테이블이 이미 선택된 상태에서 우클릭하면 해당 셀을 자동 선택
        if (isSelected && boxRef.current) {
          const scale = getScale(boxRef.current);
          const clickedCell = hitCellFromPointer(
            event.clientX,
            event.clientY,
            boxRef.current,
            colWidths,
            rowHeights,
            scale,
          );
          if (clickedCell) {
            const isAlreadySelected = selectedCells.some(
              (c) => c.row === clickedCell.row && c.col === clickedCell.col,
            );
            if (!isAlreadySelected) {
              setSelectedCells([clickedCell]);
            }
          }
        }
        onContextMenu?.(event);
      }}
    >
      {/* 셀 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: colWidths.map((w) => `${w}px`).join(" "),
          gridTemplateRows: rowHeights.map((h) => `${h}px`).join(" "),
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
            const isCellSelected = selectedCells.some(
              (c) => c.row === rowIndex && c.col === colIndex,
            );
            // 개별 셀 스타일 우선, 없으면 표 전체 cellStyle, 없으면 기본값
            const cs = cell.style ?? element.cellStyle;
            const cellFontSize = cs?.fontSize ?? 13;
            const cellFontFamily = cs?.fontFamily;
            const cellAlignX = cs?.alignX ?? "center";
            const cellFontWeight = cs?.fontWeight;
            const cellColor = cs?.color ?? "#000000";
            const cellBgColor = cs?.backgroundColor ?? element.cellStyle?.backgroundColor;
            const cellFontStyle = cs?.italic ? "italic" : "normal";
            const cellTextDecoration = cs?.underline ? "underline" : "none";
            const cellJustifyContent =
              cellAlignX === "left" ? "flex-start" : cellAlignX === "right" ? "flex-end" : "center";
            const sharedTextStyle = {
              fontFamily: cellFontFamily,
              fontSize: cellFontSize,
              fontWeight: cellFontWeight,
              color: cellColor,
              fontStyle: cellFontStyle,
              textDecoration: cellTextDecoration,
              textAlign: cellAlignX as "left" | "center" | "right",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap" as const,
              wordBreak: "break-word" as const,
            };
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  borderRight: colIndex < element.cols - 1 ? "1px solid #000000" : "none",
                  borderBottom: rowIndex < element.rows - 1 ? "1px solid #000000" : "none",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: cellJustifyContent,
                  padding: "2px 4px",
                  boxSizing: "border-box",
                  minWidth: 0,
                  cursor: isSelected && !locked ? "pointer" : "inherit",
                  // 셀 배경색 유지 + 선택 시 inset box-shadow로 테두리 + 반투명 오버레이
                  backgroundColor: cellBgColor,
                  boxShadow: isCellSelected
                    ? "inset 0 0 0 1px #5500ff, inset 0 0 0 9999px rgba(85, 0, 255, 0.08)"
                    : "none",
                }}
                onClick={() => {
                  // Cmd 다중 선택 및 일반 클릭은 handlePointerDown에서 처리
                }}
              >
                {isEditingThis ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={{ outline: "none", width: "100%", minHeight: "1em", ...sharedTextStyle }}
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
                  <span style={sharedTextStyle}>
                    {cell.text}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 열 분리선 드래그 핸들 (선택 상태일 때) */}
      {isSelected && selectionCount === 1 && !locked &&
        colDividerPositions.map((xPos, i) => (
          <div
            key={`col-div-${i}`}
            style={{
              position: "absolute",
              left: xPos - DIVIDER_HIT / 2,
              top: 0,
              width: DIVIDER_HIT,
              height: element.h,
              cursor: "col-resize",
              zIndex: 10,
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
            }}
            onPointerDown={(event) => handleColDividerPointerDown(event, i)}
            onPointerEnter={() => setHoveredColDivider(i)}
            onPointerLeave={() => setHoveredColDivider(null)}
          >
            {/* hover 시 시각적 라인 */}
            <div
              style={{
                width: hoveredColDivider === i ? 2 : 0,
                height: "100%",
                backgroundColor: "var(--primary)",
                transition: "width 0.1s ease",
                pointerEvents: "none",
              }}
            />
          </div>
        ))
      }

      {/* 행 분리선 드래그 핸들 (선택 상태일 때) */}
      {isSelected && selectionCount === 1 && !locked &&
        rowDividerPositions.map((yPos, i) => (
          <div
            key={`row-div-${i}`}
            style={{
              position: "absolute",
              left: 0,
              top: yPos - DIVIDER_HIT / 2,
              width: element.w,
              height: DIVIDER_HIT,
              cursor: "row-resize",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "center",
            }}
            onPointerDown={(event) => handleRowDividerPointerDown(event, i)}
            onPointerEnter={() => setHoveredRowDivider(i)}
            onPointerLeave={() => setHoveredRowDivider(null)}
          >
            {/* hover 시 시각적 라인 */}
            <div
              style={{
                width: "100%",
                height: hoveredRowDivider === i ? 2 : 0,
                backgroundColor: "var(--primary)",
                transition: "height 0.1s ease",
                pointerEvents: "none",
              }}
            />
          </div>
        ))
      }

      {/* 열 헤더 버튼: 선택된 셀의 열 인덱스에 해당하는 버튼만 표 상단 바깥에 표시 */}
      {showHeaders && [...new Set(selectedCells.map((c) => c.col))].map((colIndex) => {
        const btnLeft = colHeaderPositions[colIndex];
        const isColSelected =
          selectedCells.length === element.rows &&
          selectedCells.every((c) => c.col === colIndex);
        return (
          <div
            key={`col-hdr-${colIndex}`}
            style={{
              position: "absolute",
              left: btnLeft,
              top: -(HEADER_BTN_SIZE + HEADER_GAP),
              width: HEADER_BTN_SIZE,
              height: HEADER_BTN_SIZE,
              backgroundColor: isColSelected ? "var(--primary)" : "#e8e0ff",
              border: `1.5px solid var(--primary)`,
              borderRadius: 3,
              cursor: "pointer",
              zIndex: 30,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              // 해당 열 전체 셀 선택
              setSelectedCells(
                Array.from({ length: element.rows }, (_, r) => ({ row: r, col: colIndex })),
              );
            }}
          />
        );
      })}

      {/* 행 헤더 버튼: 선택된 셀의 행 인덱스에 해당하는 버튼만 표 좌측 바깥에 표시 */}
      {showHeaders && [...new Set(selectedCells.map((c) => c.row))].map((rowIndex) => {
        const btnTop = rowHeaderPositions[rowIndex];
        const isRowSelected =
          selectedCells.length === element.cols &&
          selectedCells.every((c) => c.row === rowIndex);
        return (
          <div
            key={`row-hdr-${rowIndex}`}
            style={{
              position: "absolute",
              top: btnTop,
              left: -(HEADER_BTN_SIZE + HEADER_GAP),
              width: HEADER_BTN_SIZE,
              height: HEADER_BTN_SIZE,
              backgroundColor: isRowSelected ? "var(--primary)" : "#e8e0ff",
              border: `1.5px solid var(--primary)`,
              borderRadius: 3,
              cursor: "pointer",
              zIndex: 30,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              // 해당 행 전체 셀 선택
              setSelectedCells(
                Array.from({ length: element.cols }, (_, c) => ({ row: rowIndex, col: c })),
              );
            }}
          />
        );
      })}

      {/* 리사이즈 핸들 (선택 상태일 때) */}
      {isSelected && selectionCount === 1 && !locked && (
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
                zIndex: 20,
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
