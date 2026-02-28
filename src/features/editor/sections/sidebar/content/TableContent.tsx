/**
 * 선택된 표 요소의 행/열 수를 수정하는 사이드바 패널 컴포넌트.
 * 표 선택이 해제되면 자동으로 사이드바를 닫는다.
 */
import { useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { useTableStore } from "@/features/editor/store/tableStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import type { TableCell } from "@/features/editor/model/canvasTypes";

const TableContent = () => {
  const selectedTable = useTableStore((s) => s.selectedTable);
  const updateTable = useTableStore((s) => s.updateTable);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  // 표 선택이 해제되면(selectedTable === null) "표" 사이드바 탭을 닫는다.
  useEffect(() => {
    if (!selectedTable) {
      setSideBarMenu(null);
    }
  }, [selectedTable, setSideBarMenu]);

  if (!selectedTable || !updateTable) {
    return null;
  }

  const { rows, cols, cells, colWidths, rowHeights } = selectedTable;

  const addRow = () => {
    const newRow: TableCell[] = Array.from({ length: cols }, () => ({ text: "" }));
    // rowHeights가 있으면 새 행을 기존 평균 높이로 추가해 기존 행 간격을 유지한다.
    const nextRowHeights = rowHeights
      ? [...rowHeights, rowHeights.reduce((a, b) => a + b, 0) / rowHeights.length]
      : undefined;
    updateTable({ rows: rows + 1, cells: [...cells, newRow], rowHeights: nextRowHeights });
  };

  const removeRow = () => {
    if (rows <= 1) return;
    const nextRowHeights = rowHeights ? rowHeights.slice(0, rows - 1) : undefined;
    updateTable({ rows: rows - 1, cells: cells.slice(0, rows - 1), rowHeights: nextRowHeights });
  };

  const addCol = () => {
    const newCells = cells.map((row) => [...row, { text: "" }]);
    // colWidths가 있으면 새 열을 기존 평균 너비로 추가해 기존 열 간격을 유지한다.
    const nextColWidths = colWidths
      ? [...colWidths, colWidths.reduce((a, b) => a + b, 0) / colWidths.length]
      : undefined;
    updateTable({ cols: cols + 1, cells: newCells, colWidths: nextColWidths });
  };

  const removeCol = () => {
    if (cols <= 1) return;
    const newCells = cells.map((row) => row.slice(0, cols - 1));
    const nextColWidths = colWidths ? colWidths.slice(0, cols - 1) : undefined;
    updateTable({ cols: cols - 1, cells: newCells, colWidths: nextColWidths });
  };

  // 행 높이를 균등하게 리셋
  const equalizeRowHeights = () => {
    updateTable({ rowHeights: undefined });
  };

  // 열 너비를 균등하게 리셋
  const equalizeColWidths = () => {
    updateTable({ colWidths: undefined });
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-title-16-semibold">행</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={removeRow}
            disabled={rows <= 1}
            className="flex h-8 w-8 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="행 삭제"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-14-regular text-black-90">{rows}</span>
          <button
            type="button"
            onClick={addRow}
            className="flex h-8 w-8 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary"
            aria-label="행 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* 행 높이가 불균등한 경우에만 균등 리셋 버튼 표시 */}
        {!!rowHeights && (
          <button
            type="button"
            onClick={equalizeRowHeights}
            className="w-full rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary"
          >
            행 간격 동일
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-title-16-semibold">열</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={removeCol}
            disabled={cols <= 1}
            className="flex h-8 w-8 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="열 삭제"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-14-regular text-black-90">{cols}</span>
          <button
            type="button"
            onClick={addCol}
            className="flex h-8 w-8 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary"
            aria-label="열 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* 열 너비가 불균등한 경우에만 균등 리셋 버튼 표시 */}
        {!!colWidths && (
          <button
            type="button"
            onClick={equalizeColWidths}
            className="w-full rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary"
          >
            열 간격 동일
          </button>
        )}
      </div>
    </div>
  );
};

export default TableContent;
