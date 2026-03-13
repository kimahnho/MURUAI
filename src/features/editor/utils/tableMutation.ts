/**
 * 테이블 셀 기준 행/열 삽입·삭제 순수 유틸리티.
 * TableContent(사이드바)와 DesignPaperContextMenu(우클릭) 양쪽에서 공유한다.
 */
import type { TableCell, TableElement } from "../model/canvasTypes";

export type CellCoord = { row: number; col: number };

// ─── 행 삽입 ───

export const insertRowAt = (
  table: TableElement,
  rowIndex: number,
): Partial<TableElement> => {
  const { rows, cols, cells, rowHeights, h } = table;
  const newRow: TableCell[] = Array.from({ length: cols }, () => ({ text: "" }));
  const nextCells = [...cells.slice(0, rowIndex), newRow, ...cells.slice(rowIndex)];

  const newRowHeight = rowHeights
    ? rowHeights.reduce((a, b) => a + b, 0) / rowHeights.length
    : h / rows;

  const nextRowHeights = rowHeights
    ? [...rowHeights.slice(0, rowIndex), newRowHeight, ...rowHeights.slice(rowIndex)]
    : undefined;

  return {
    rows: rows + 1,
    cells: nextCells,
    rowHeights: nextRowHeights,
    h: h + newRowHeight,
  };
};

// ─── 열 삽입 ───

export const insertColAt = (
  table: TableElement,
  colIndex: number,
): Partial<TableElement> => {
  const { cols, cells, colWidths } = table;
  const nextCells = cells.map((row) => [
    ...row.slice(0, colIndex),
    { text: "" },
    ...row.slice(colIndex),
  ]);

  const nextColWidths = colWidths
    ? [
        ...colWidths.slice(0, colIndex),
        colWidths.reduce((a, b) => a + b, 0) / colWidths.length,
        ...colWidths.slice(colIndex),
      ]
    : undefined;

  return {
    cols: cols + 1,
    cells: nextCells,
    colWidths: nextColWidths,
  };
};

// ─── 행 삭제 ───

export const deleteRowAt = (
  table: TableElement,
  rowIndex: number,
): Partial<TableElement> | null => {
  const { rows, cells, rowHeights, h } = table;
  if (rows <= 1) return null;

  const removedHeight = rowHeights ? rowHeights[rowIndex] : h / rows;
  const nextCells = [...cells.slice(0, rowIndex), ...cells.slice(rowIndex + 1)];
  const nextRowHeights = rowHeights
    ? [...rowHeights.slice(0, rowIndex), ...rowHeights.slice(rowIndex + 1)]
    : undefined;

  return {
    rows: rows - 1,
    cells: nextCells,
    rowHeights: nextRowHeights,
    h: h - removedHeight,
  };
};

// ─── 열 삭제 ───

export const deleteColAt = (
  table: TableElement,
  colIndex: number,
): Partial<TableElement> | null => {
  const { cols, cells, colWidths } = table;
  if (cols <= 1) return null;

  const nextCells = cells.map((row) => [
    ...row.slice(0, colIndex),
    ...row.slice(colIndex + 1),
  ]);
  const nextColWidths = colWidths
    ? [...colWidths.slice(0, colIndex), ...colWidths.slice(colIndex + 1)]
    : undefined;

  return {
    cols: cols - 1,
    cells: nextCells,
    colWidths: nextColWidths,
  };
};

// ─── selectedCells 보정 ───

export const adjustCellsAfterInsertRow = (
  selected: CellCoord[],
  atRow: number,
  direction: "above" | "below",
): CellCoord[] => {
  const threshold = direction === "above" ? atRow : atRow + 1;
  return selected.map((c) => ({
    ...c,
    row: c.row >= threshold ? c.row + 1 : c.row,
  }));
};

export const adjustCellsAfterInsertCol = (
  selected: CellCoord[],
  atCol: number,
  direction: "left" | "right",
): CellCoord[] => {
  const threshold = direction === "left" ? atCol : atCol + 1;
  return selected.map((c) => ({
    ...c,
    col: c.col >= threshold ? c.col + 1 : c.col,
  }));
};

export const adjustCellsAfterDeleteRow = (
  selected: CellCoord[],
  atRow: number,
  remainingRows: number,
): CellCoord[] => {
  const adjusted = selected
    .filter((c) => c.row !== atRow)
    .map((c) => ({ ...c, row: c.row > atRow ? c.row - 1 : c.row }));

  if (adjusted.length > 0) return adjusted;

  // 선택된 셀이 모두 삭제된 행에 있었으면 인접 행의 같은 열 선택
  const fallbackRow = Math.min(atRow, remainingRows - 1);
  return [{ row: fallbackRow, col: selected[0].col }];
};

export const adjustCellsAfterDeleteCol = (
  selected: CellCoord[],
  atCol: number,
  remainingCols: number,
): CellCoord[] => {
  const adjusted = selected
    .filter((c) => c.col !== atCol)
    .map((c) => ({ ...c, col: c.col > atCol ? c.col - 1 : c.col }));

  if (adjusted.length > 0) return adjusted;

  const fallbackCol = Math.min(atCol, remainingCols - 1);
  return [{ row: selected[0].row, col: fallbackCol }];
};
