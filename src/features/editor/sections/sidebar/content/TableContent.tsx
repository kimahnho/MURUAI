/**
 * 선택된 표 요소의 행/열 수 및 셀 텍스트 스타일을 수정하는 사이드바 패널 컴포넌트.
 * 표 선택이 해제되면 자동으로 사이드바를 닫는다.
 * selectedCells가 있으면 선택된 셀에만, 없으면 표 전체(cellStyle)에 스타일을 적용한다.
 */
import { useState, useEffect } from "react";
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Minus, Plus, Ban } from "lucide-react";
import { useTableStore } from "@/features/editor/store/tableStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import { useNumberInput } from "@/features/editor/shared/hooks/useNumberInput";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import { FONT_OPTIONS } from "@/shared/utils/fontOptions";
import {
  insertRowAt,
  insertColAt,
  deleteRowAt,
  deleteColAt,
  adjustCellsAfterInsertRow,
  adjustCellsAfterInsertCol,
  adjustCellsAfterDeleteRow,
  adjustCellsAfterDeleteCol,
} from "@/features/editor/utils/tableMutation";
import type {
  TableCell,
  TableCellStyle,
  TableBorderLine,
  TableBorderConfig,
  TableBorderStyle,
  CellDiagonal,
} from "@/features/editor/model/canvasTypes";

type BorderTarget = "all" | "outer" | "inner" | "horizontal" | "vertical";

const DEFAULT_BORDER: TableBorderLine = { color: "#000000", width: 1, style: "solid" };

const BORDER_TARGETS: Array<{ key: BorderTarget; label: string }> = [
  { key: "all", label: "전체" },
  { key: "outer", label: "외곽" },
  { key: "inner", label: "내부" },
];

const BORDER_TARGETS_LINE: Array<{ key: BorderTarget; label: string }> = [
  { key: "horizontal", label: "가로선" },
  { key: "vertical", label: "세로선" },
];

const BORDER_STYLE_OPTIONS: Array<TableBorderStyle | "none"> = ["none", "solid", "dashed", "dotted"];

const clampBorderWidth = (v: number) => Math.min(20, Math.max(1, v));

const ALIGN_BUTTONS = [
  { key: "left" as const, Icon: AlignLeft, label: "왼쪽 정렬" },
  { key: "center" as const, Icon: AlignCenter, label: "가운데 정렬" },
  { key: "right" as const, Icon: AlignRight, label: "오른쪽 정렬" },
];

const TableContent = () => {
  const selectedTable = useTableStore((s) => s.selectedTable);
  const updateTable = useTableStore((s) => s.updateTable);
  const selectedCells = useTableStore((s) => s.selectedCells);
  const setSelectedCells = useTableStore((s) => s.setSelectedCells);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  // 테두리 편집 대상
  const [borderTarget, setBorderTarget] = useState<BorderTarget>("all");

  // 표 선택이 해제되면(selectedTable === null) "요소" 탭으로 전환한다.
  useEffect(() => {
    if (!selectedTable) {
      setSideBarMenu("element");
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
        backgroundColor: cs?.backgroundColor,
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
      backgroundColor: cs?.backgroundColor,
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

  // 현재 타겟의 테두리 값
  const getActiveBorderLine = (): TableBorderLine | null => {
    const bc = selectedTable?.borderConfig;
    switch (borderTarget) {
      case "all":
      case "outer":
        return bc?.outer === null ? null : (bc?.outer ?? DEFAULT_BORDER);
      case "inner":
      case "horizontal":
        return bc?.horizontal === null ? null : (bc?.horizontal ?? DEFAULT_BORDER);
      case "vertical":
        return bc?.vertical === null ? null : (bc?.vertical ?? DEFAULT_BORDER);
    }
  };

  const activeBorder = getActiveBorderLine();
  const activeBorderStyle: TableBorderStyle | "none" = activeBorder ? activeBorder.style : "none";
  const activeBorderWidth = activeBorder?.width ?? 1;
  const activeBorderColor = activeBorder?.color ?? "#000000";

  // 테두리 설정 업데이트
  const updateBorderConfig = (line: TableBorderLine | null) => {
    if (!selectedTable || !updateTable) return;
    const prev = selectedTable.borderConfig ?? {};
    let next: TableBorderConfig;
    switch (borderTarget) {
      case "all":
        next = { outer: line, horizontal: line, vertical: line };
        break;
      case "outer":
        next = { ...prev, outer: line };
        break;
      case "inner":
        next = { ...prev, horizontal: line, vertical: line };
        break;
      case "horizontal":
        next = { ...prev, horizontal: line };
        break;
      case "vertical":
        next = { ...prev, vertical: line };
        break;
    }
    updateTable({ borderConfig: next });
  };

  const handleBorderStyleSelect = (style: TableBorderStyle | "none") => {
    if (style === "none") {
      updateBorderConfig(null);
      return;
    }
    const base = activeBorder ?? DEFAULT_BORDER;
    updateBorderConfig({ ...base, style });
  };

  const handleBorderWidthChange = (width: number) => {
    const base = activeBorder ?? DEFAULT_BORDER;
    updateBorderConfig({ ...base, width: clampBorderWidth(width) });
  };

  const handleBorderColorChange = (color: string) => {
    const base = activeBorder ?? DEFAULT_BORDER;
    updateBorderConfig({ ...base, color });
  };

  if (!selectedTable || !updateTable) {
    return null;
  }

  const { rows, cols, cells, colWidths, rowHeights } = selectedTable;

  const isBold = resolvedStyle.fontWeight === 700 || resolvedStyle.fontWeight === "bold";

  // 대상 셀들의 특정 스타일 값이 혼합인지 감지
  const isMixedStyleField = (field: "color" | "backgroundColor"): boolean => {
    const defaultValue = field === "color" ? "#000000" : undefined;
    const targetCells = selectedCells.length > 0
      ? selectedCells.map((c) => cells[c.row]?.[c.col]).filter(Boolean)
      : cells.flat();
    if (targetCells.length <= 1) return false;
    const resolve = (cell: TableCell) =>
      cell.style?.[field] ?? selectedTable.cellStyle?.[field] ?? defaultValue;
    const first = resolve(targetCells[0]);
    return targetCells.some((cell) => resolve(cell) !== first);
  };

  const isMixedTextColor = isMixedStyleField("color");
  const isMixedBgColor = isMixedStyleField("backgroundColor");

  // 대상 셀들의 고유 색상 목록을 수집 (혼합 시 표시용)
  const collectUniqueColors = (field: "color" | "backgroundColor"): string[] => {
    const defaultValue = field === "color" ? "#000000" : "transparent";
    const targetCells = selectedCells.length > 0
      ? selectedCells.map((c) => cells[c.row]?.[c.col]).filter(Boolean)
      : cells.flat();
    const colorSet = new Set<string>();
    for (const cell of targetCells) {
      const val = cell.style?.[field] ?? selectedTable.cellStyle?.[field] ?? defaultValue;
      colorSet.add(val ?? defaultValue);
    }
    return [...colorSet];
  };

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
            backgroundColor: baseStyle?.backgroundColor,
            ...patch,
          };
          return { ...cell, style: merged };
        }),
      );
      updateTable({ cells: newCells });
    } else {
      // 표 전체: cellStyle 변경 + 개별 style이 있는 셀에도 patch 적용
      const newCellStyle = { ...resolvedStyle, ...patch };
      const newCells: TableCell[][] = cells.map((row) =>
        row.map((cell) => {
          if (!cell.style) return cell;
          return { ...cell, style: { ...cell.style, ...patch } };
        }),
      );
      updateTable({ cellStyle: newCellStyle, cells: newCells });
    }
  };

  // 대상 셀들의 현재 빗금 상태 (혼합이면 null)
  const getResolvedDiagonal = (): CellDiagonal | null | undefined => {
    const targetCells = selectedCells.length > 0
      ? selectedCells.map((c) => cells[c.row]?.[c.col]).filter(Boolean)
      : cells.flat();
    if (targetCells.length === 0) return undefined;
    const first = targetCells[0].style?.diagonal ?? undefined;
    const allSame = targetCells.every((cell) => (cell.style?.diagonal ?? undefined) === first);
    return allSame ? first : null; // null = 혼합
  };

  const resolvedDiagonal = getResolvedDiagonal();

  // 빗금 방향 토글
  const toggleDiagonal = (dir: "backslash" | "slash") => {
    const current = resolvedDiagonal;
    let next: CellDiagonal | null;
    if (dir === "backslash") {
      if (current === "backslash") next = null;
      else if (current === "slash") next = "cross";
      else if (current === "cross") next = "slash";
      else next = "backslash";
    } else {
      if (current === "slash") next = null;
      else if (current === "backslash") next = "cross";
      else if (current === "cross") next = "backslash";
      else next = "slash";
    }
    updateStylePatch({ diagonal: next });
  };

  const clearDiagonal = () => {
    updateStylePatch({ diagonal: null });
  };

  const addRow = () => {
    const newRow: TableCell[] = Array.from({ length: cols }, () => ({ text: "" }));
    // 새 행 높이: rowHeights가 있으면 기존 평균, 없으면 균등 분배 기준(h / rows)
    const newRowHeight = rowHeights
      ? rowHeights.reduce((a, b) => a + b, 0) / rowHeights.length
      : selectedTable.h / rows;
    const nextRowHeights = rowHeights ? [...rowHeights, newRowHeight] : undefined;
    // 표 전체 높이도 새 행 높이만큼 증가
    updateTable({
      rows: rows + 1,
      cells: [...cells, newRow],
      rowHeights: nextRowHeights,
      h: selectedTable.h + newRowHeight,
    });
  };

  const removeRow = () => {
    if (rows <= 1) return;
    // 삭제할 행 높이: rowHeights가 있으면 마지막 행 높이, 없으면 균등 분배 기준
    const removedRowHeight = rowHeights
      ? rowHeights[rows - 1]
      : selectedTable.h / rows;
    const nextRowHeights = rowHeights ? rowHeights.slice(0, rows - 1) : undefined;
    // 표 전체 높이도 삭제된 행 높이만큼 감소
    updateTable({
      rows: rows - 1,
      cells: cells.slice(0, rows - 1),
      rowHeights: nextRowHeights,
      h: selectedTable.h - removedRowHeight,
    });
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

      {/* 셀 기준 행/열 편집 — 셀 선택 시에만 표시 */}
      {selectedCells.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-title-16-semibold">셀 기준 편집</span>

          {/* 행 추가/삭제 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-12-regular text-black-50">행</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const refRow = selectedCells[0].row;
                  const patch = insertRowAt(selectedTable, refRow);
                  updateTable(patch);
                  setSelectedCells(adjustCellsAfterInsertRow(selectedCells, refRow, "above"));
                }}
                className="rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary"
              >
                위에 추가
              </button>
              <button
                type="button"
                onClick={() => {
                  const refRow = selectedCells[0].row;
                  const patch = insertRowAt(selectedTable, refRow + 1);
                  updateTable(patch);
                  setSelectedCells(adjustCellsAfterInsertRow(selectedCells, refRow, "below"));
                }}
                className="rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary"
              >
                아래에 추가
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const refRow = selectedCells[0].row;
                const patch = deleteRowAt(selectedTable, refRow);
                if (!patch) return;
                updateTable(patch);
                setSelectedCells(adjustCellsAfterDeleteRow(selectedCells, refRow, rows - 1));
              }}
              disabled={rows <= 1}
              className="rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              행 삭제
            </button>
          </div>

          {/* 열 추가/삭제 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-12-regular text-black-50">열</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const refCol = selectedCells[0].col;
                  const patch = insertColAt(selectedTable, refCol);
                  updateTable(patch);
                  setSelectedCells(adjustCellsAfterInsertCol(selectedCells, refCol, "left"));
                }}
                className="rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary"
              >
                왼쪽에 추가
              </button>
              <button
                type="button"
                onClick={() => {
                  const refCol = selectedCells[0].col;
                  const patch = insertColAt(selectedTable, refCol + 1);
                  updateTable(patch);
                  setSelectedCells(adjustCellsAfterInsertCol(selectedCells, refCol, "right"));
                }}
                className="rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary"
              >
                오른쪽에 추가
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const refCol = selectedCells[0].col;
                const patch = deleteColAt(selectedTable, refCol);
                if (!patch) return;
                updateTable(patch);
                setSelectedCells(adjustCellsAfterDeleteCol(selectedCells, refCol, cols - 1));
              }}
              disabled={cols <= 1}
              className="rounded border border-black-30 py-1.5 text-14-regular text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              열 삭제
            </button>
          </div>
        </div>
      )}

      {/* 테두리 섹션 */}
      <div className="flex flex-col gap-3">
        <span className="text-title-16-semibold">테두리</span>
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
          {/* 위치 선택 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {BORDER_TARGETS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBorderTarget(key)}
                  className={`flex-1 rounded-lg border py-1.5 text-13-medium transition ${
                    borderTarget === key
                      ? "border-primary bg-primary-100 text-primary"
                      : "border-black-30 text-black-70 hover:border-black-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {BORDER_TARGETS_LINE.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBorderTarget(key)}
                  className={`flex-1 rounded-lg border py-1.5 text-13-medium transition ${
                    borderTarget === key
                      ? "border-primary bg-primary-100 text-primary"
                      : "border-black-30 text-black-70 hover:border-black-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 스타일 (없음/실선/점선/대시) */}
          <div className="flex items-center gap-2">
            {BORDER_STYLE_OPTIONS.map((styleOption) => {
              const isActive = activeBorderStyle === styleOption;
              const cls = `flex h-10 flex-1 items-center justify-center rounded-lg border transition-colors ${
                isActive
                  ? "border-primary bg-primary-100 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`;
              if (styleOption === "none") {
                return (
                  <button key={styleOption} type="button" onClick={() => handleBorderStyleSelect(styleOption)} className={cls}>
                    <Ban className="h-4 w-4" />
                  </button>
                );
              }
              return (
                <button key={styleOption} type="button" onClick={() => handleBorderStyleSelect(styleOption)} className={cls}>
                  <span className="block w-5" style={{ borderTopWidth: 2, borderTopStyle: styleOption, borderTopColor: "currentColor" }} />
                </button>
              );
            })}
          </div>

          {/* 색상 */}
          <div className="flex items-center gap-2">
            <span className="text-12-regular text-black-60">색상</span>
            <ColorPickerPopover
              value={activeBorderColor}
              onChange={handleBorderColorChange}
            />
          </div>

          {/* 두께 */}
          <div className="flex flex-col gap-1">
            <label className="text-12-regular text-black-60">두께</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={20}
                value={activeBorderWidth}
                onChange={(e) => handleBorderWidthChange(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(activeBorderWidth)}
                onChange={(e) => {
                  const d = e.target.value.replace(/[^0-9]/g, "");
                  if (d) handleBorderWidthChange(Number(d));
                }}
                className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 빗금 섹션 — 셀 선택 시에만 표시 */}
      {selectedCells.length > 0 && <div className="flex flex-col gap-3">
        <span className="text-title-16-semibold">빗금</span>
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
          {/* 방향 버튼 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleDiagonal("backslash")}
              className={`flex h-10 flex-1 items-center justify-center rounded-lg border transition-colors ${
                resolvedDiagonal === "backslash" || resolvedDiagonal === "cross"
                  ? "border-primary bg-primary-100 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`}
            >
              {/* 좌상→우하 대각선 아이콘 */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => toggleDiagonal("slash")}
              className={`flex h-10 flex-1 items-center justify-center rounded-lg border transition-colors ${
                resolvedDiagonal === "slash" || resolvedDiagonal === "cross"
                  ? "border-primary bg-primary-100 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`}
            >
              {/* 우상→좌하 대각선 아이콘 */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={clearDiagonal}
              className={`flex h-10 flex-1 items-center justify-center rounded-lg border transition-colors ${
                resolvedDiagonal === undefined || resolvedDiagonal === null
                  ? "border-black-30 text-black-70"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`}
            >
              <Ban className="h-4 w-4" />
            </button>
          </div>

          {/* 색상 (테이블 일괄) */}
          <div className="flex items-center gap-2">
            <span className="text-12-regular text-black-60">색상</span>
            <ColorPickerPopover
              value={selectedTable.diagonalColor ?? "#000000"}
              onChange={(color) => updateTable({ diagonalColor: color })}
            />
          </div>
        </div>
      </div>}

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

        {/* 텍스트 색상 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">텍스트 색상</span>
          <div className="flex items-center gap-1.5">
            <ColorPickerPopover
              value={resolvedStyle.color ?? "#000000"}
              onChange={(color) => updateStylePatch({ color })}
              isMixed={isMixedTextColor}
            />
            {isMixedTextColor && (
              <div className="flex items-center gap-1">
                {collectUniqueColors("color").map((c) => (
                  <span
                    key={c}
                    className="h-4 w-4 shrink-0 rounded-full border border-black-25"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 배경색 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-12-regular text-black-50">배경색</span>
          <div className="flex items-center gap-1.5">
            <ColorPickerPopover
              value={resolvedStyle.backgroundColor ?? "transparent"}
              onChange={(color) => updateStylePatch({ backgroundColor: color === "transparent" ? undefined : color })}
              isMixed={isMixedBgColor}
              allowTransparent
            />
            {isMixedBgColor && (
              <div className="flex items-center gap-1">
                {collectUniqueColors("backgroundColor").map((c) => (
                  <span
                    key={c}
                    className="h-4 w-4 shrink-0 rounded-full border border-black-25"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
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
