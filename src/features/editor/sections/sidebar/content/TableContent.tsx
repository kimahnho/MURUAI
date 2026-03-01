/**
 * 선택된 표 요소의 행/열 수 및 셀 텍스트 스타일을 수정하는 사이드바 패널 컴포넌트.
 * 표 선택이 해제되면 자동으로 사이드바를 닫는다.
 * selectedCells가 있으면 선택된 셀에만, 없으면 표 전체(cellStyle)에 스타일을 적용한다.
 */
import { useEffect } from "react";
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Minus, Plus } from "lucide-react";
import { useTableStore } from "@/features/editor/store/tableStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import { useNumberInput } from "@/features/editor/shared/hooks/useNumberInput";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import { FONT_OPTIONS } from "@/features/editor/utils/fontOptions";
import type { TableCell, TableCellStyle } from "@/features/editor/model/canvasTypes";

const ALIGN_BUTTONS = [
  { key: "left" as const, Icon: AlignLeft, label: "왼쪽 정렬" },
  { key: "center" as const, Icon: AlignCenter, label: "가운데 정렬" },
  { key: "right" as const, Icon: AlignRight, label: "오른쪽 정렬" },
];

const TableContent = () => {
  const selectedTable = useTableStore((s) => s.selectedTable);
  const updateTable = useTableStore((s) => s.updateTable);
  const selectedCells = useTableStore((s) => s.selectedCells);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  // 표 선택이 해제되면(selectedTable === null) "표" 사이드바 탭을 닫는다.
  useEffect(() => {
    if (!selectedTable) {
      setSideBarMenu(null);
    }
  }, [selectedTable, setSideBarMenu]);

  // 현재 표시할 스타일: 셀 선택 시 첫 번째 선택 셀 스타일, 없으면 표 전체 cellStyle
  const getEffectiveStyle = (): TableCellStyle => {
    if (!selectedTable) {
      return { fontSize: 13, alignX: "center" };
    }
    if (selectedCells.length > 0) {
      const firstCell = selectedTable.cells[selectedCells[0].row]?.[selectedCells[0].col];
      const cs = firstCell?.style ?? selectedTable.cellStyle;
      return {
        fontSize: cs?.fontSize ?? 13,
        alignX: cs?.alignX ?? "center",
        color: cs?.color ?? "#000000",
        fontFamily: cs?.fontFamily,
        fontWeight: cs?.fontWeight,
        italic: cs?.italic ?? false,
        underline: cs?.underline ?? false,
      };
    }
    const cs = selectedTable.cellStyle;
    return {
      fontSize: cs?.fontSize ?? 13,
      alignX: cs?.alignX ?? "center",
      color: cs?.color ?? "#000000",
      fontFamily: cs?.fontFamily,
      fontWeight: cs?.fontWeight,
      italic: cs?.italic ?? false,
      underline: cs?.underline ?? false,
    };
  };

  const resolvedStyle = getEffectiveStyle();

  const fontSizeInput = useNumberInput({
    value: resolvedStyle.fontSize,
    min: 8,
    max: 120,
    onChange: (v) => {
      if (!selectedTable) return;
      updateStylePatch({ fontSize: v });
    },
  });

  if (!selectedTable || !updateTable) {
    return null;
  }

  const { rows, cols, cells, colWidths, rowHeights } = selectedTable;

  const isBold = resolvedStyle.fontWeight === 700 || resolvedStyle.fontWeight === "bold";

  // 스타일 패치 적용: 선택된 셀이 있으면 개별 셀에, 없으면 표 전체 cellStyle에 적용
  const updateStylePatch = (patch: Partial<TableCellStyle>) => {
    if (selectedCells.length > 0) {
      // 선택된 셀에만 개별 style 적용
      const newCells: TableCell[][] = cells.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isSel = selectedCells.some((c) => c.row === rowIndex && c.col === colIndex);
          if (!isSel) return cell;
          const baseStyle = cell.style ?? selectedTable.cellStyle;
          const merged: TableCellStyle = {
            fontSize: baseStyle?.fontSize ?? 13,
            alignX: baseStyle?.alignX ?? "center",
            color: baseStyle?.color ?? "#000000",
            fontFamily: baseStyle?.fontFamily,
            fontWeight: baseStyle?.fontWeight,
            italic: baseStyle?.italic ?? false,
            underline: baseStyle?.underline ?? false,
            ...patch,
          };
          return { ...cell, style: merged };
        }),
      );
      updateTable({ cells: newCells });
    } else {
      // 표 전체 cellStyle 적용
      updateTable({ cellStyle: { ...resolvedStyle, ...patch } });
    }
  };

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
      {/* 행 섹션 */}
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

      {/* 열 섹션 */}
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

      {/* 텍스트 스타일 섹션 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-title-16-semibold">텍스트</span>
          {/* 셀 선택 시 선택 범위 안내 */}
          {selectedCells.length > 0 && (
            <span className="text-12-regular text-primary">
              {selectedCells.length}개 셀 선택됨
            </span>
          )}
        </div>

        {/* 폰트 선택 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">폰트</span>
          <select
            value={resolvedStyle.fontFamily ?? ""}
            onChange={(e) => updateStylePatch({ fontFamily: e.target.value || undefined })}
            className="w-full rounded border border-black-30 px-2 py-1.5 text-14-regular text-black-90 bg-white"
          >
            <option value="">기본</option>
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.family}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* 폰트 크기 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">크기</span>
          <div className="flex items-center gap-2 rounded border border-black-30 px-1">
            <button
              type="button"
              onClick={() => fontSizeInput.step(-1)}
              className="flex h-7 w-7 items-center justify-center text-black-70 hover:text-primary"
              aria-label="크기 감소"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={fontSizeInput.displayValue}
              onChange={(e) => fontSizeInput.handleChange(e.target.value)}
              onFocus={fontSizeInput.handleFocus}
              onBlur={fontSizeInput.handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fontSizeInput.commit();
                  e.currentTarget.blur();
                }
              }}
              className="no-spinner flex-1 appearance-none border-x border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
            />
            <button
              type="button"
              onClick={() => fontSizeInput.step(1)}
              className="flex h-7 w-7 items-center justify-center text-black-70 hover:text-primary"
              aria-label="크기 증가"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 색상 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">색상</span>
          <ColorPickerPopover
            value={resolvedStyle.color ?? "#000000"}
            onChange={(color) => updateStylePatch({ color })}
          />
        </div>

        {/* 정렬 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">정렬</span>
          <div className="flex items-center gap-2">
            {ALIGN_BUTTONS.map(({ key, Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateStylePatch({ alignX: key })}
                aria-label={label}
                className={`flex flex-1 h-8 items-center justify-center rounded border ${
                  resolvedStyle.alignX === key
                    ? "border-primary text-primary"
                    : "border-black-30 text-black-70 hover:border-primary hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* 서식 (Bold / Italic / Underline) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">서식</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateStylePatch({ fontWeight: isBold ? undefined : 700 })}
              aria-label="굵게"
              className={`flex flex-1 h-8 items-center justify-center rounded border ${
                isBold
                  ? "border-primary text-primary"
                  : "border-black-30 text-black-70 hover:border-primary hover:text-primary"
              }`}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateStylePatch({ italic: !resolvedStyle.italic })}
              aria-label="기울임"
              className={`flex flex-1 h-8 items-center justify-center rounded border ${
                resolvedStyle.italic
                  ? "border-primary text-primary"
                  : "border-black-30 text-black-70 hover:border-primary hover:text-primary"
              }`}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateStylePatch({ underline: !resolvedStyle.underline })}
              aria-label="밑줄"
              className={`flex flex-1 h-8 items-center justify-center rounded border ${
                resolvedStyle.underline
                  ? "border-primary text-primary"
                  : "border-black-30 text-black-70 hover:border-primary hover:text-primary"
              }`}
            >
              <Underline className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableContent;
