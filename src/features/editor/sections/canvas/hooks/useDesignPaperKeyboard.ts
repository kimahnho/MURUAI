/**
 * 키보드 단축키 입력을 받아 삭제/이동/선택 관련 편집 동작을 처리하는 훅.
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import { useTableStore } from "../../../store/tableStore";
import {
  getRectFromElement,
  isEditableTarget,
  isEmotionSlotShape,
  type Rect,
} from "../../../utils/designPaperUtils";

type SmartGuideController = {
  compute: (args: { activeRect: Rect; otherRects: Rect[] }) => void;
  clear: () => void;
};

type UseDesignPaperKeyboardProps = {
  readOnly: boolean;
  editingTextId: string | null;
  editingImageId: string | null;
  setEditingImageId: (id: string | null) => void;
  elements: CanvasElement[];
  selectedIdsRef: MutableRefObject<string[]>;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  clearContextMenu: () => void;
  clearEmotionSlotImage: (id: string) => void;
  copySelectedElements: () => void;
  deleteSelectedElements: () => void;
  onDeleteElements?: (ids: string[]) => void;
  pasteElements: () => void;
  getClipboard: () => CanvasElement[] | null;
  smartGuides: SmartGuideController;
};

export const useDesignPaperKeyboard = ({
  readOnly,
  editingTextId,
  editingImageId,
  setEditingImageId,
  elements,
  selectedIdsRef,
  onElementsChange,
  onSelectedIdsChange,
  onEditingTextIdChange,
  clearContextMenu,
  clearEmotionSlotImage,
  copySelectedElements,
  deleteSelectedElements,
  onDeleteElements,
  pasteElements,
  getClipboard,
  smartGuides,
}: UseDesignPaperKeyboardProps) => {
  const clearGuidesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (readOnly || !onElementsChange) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (editingTextId) return;
      if (isEditableTarget(event.target)) return;

      const currentSelectedIds = selectedIdsRef.current;

      // 선택된 텍스트 요소에 Ctrl+B → 전체 bold 토글
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "b" &&
        currentSelectedIds.length === 1
      ) {
        const selectedId = currentSelectedIds[0];
        const selectedElement = elements.find((el) => el.id === selectedId);
        if (selectedElement?.type === "text" && !selectedElement.locked) {
          event.preventDefault();
          const isBold = selectedElement.style.fontWeight === "bold";
          const updatedElements = elements.map((el) =>
            el.id === selectedId && el.type === "text"
              ? {
                  ...el,
                  style: {
                    ...el.style,
                    fontWeight: isBold ? ("normal" as const) : ("bold" as const),
                  },
                }
              : el,
          );
          onElementsChange(updatedElements);
          return;
        }
      }

      if (
        (event.key === "Process" || event.key === "Unidentified") &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        // IME 조합 키 입력에서는 텍스트 요소의 편집 모드만 열고 실제 입력은 에디터에 위임한다.
        if (currentSelectedIds.length === 1) {
          const selectedId = currentSelectedIds[0];
          const selectedElement = elements.find(
            (element) => element.id === selectedId,
          );
          if (
            selectedElement &&
            selectedElement.type === "text" &&
            !selectedElement.locked
          ) {
            onEditingTextIdChange?.(selectedId);
            return;
          }
        }
      }

      const isPrintableKey =
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.isComposing;
      if (isPrintableKey) {
        // 텍스트가 선택된 상태에서 글자 입력이 시작되면 기존 내용을 새 입력 문자로 초기화한다.
        if (currentSelectedIds.length === 1) {
          const selectedId = currentSelectedIds[0];
          const selectedElement = elements.find(
            (element) => element.id === selectedId,
          );
          if (
            selectedElement &&
            selectedElement.type === "text" &&
            !selectedElement.locked
          ) {
            event.preventDefault();
            const updatedElements = elements.map((element) =>
              element.id === selectedId && element.type === "text"
                ? { ...element, text: event.key, richText: "" }
                : element,
            );
            onElementsChange(updatedElements);
            onEditingTextIdChange?.(selectedId);
            return;
          }
        }
      }

      if (event.key === "Escape") {
        selectedIdsRef.current = [];
        onSelectedIdsChange?.([]);
        onEditingTextIdChange?.(null);
        clearContextMenu();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (editingImageId) {
          const targetElement = elements.find(
            (element) => element.id === editingImageId,
          );
          if (targetElement && isEmotionSlotShape(targetElement)) {
            event.preventDefault();
            clearEmotionSlotImage(editingImageId);
            setEditingImageId(null);
            return;
          }
        }

        const currentSelectedIds = selectedIdsRef.current;
        if (currentSelectedIds.length > 0) {
          // 테이블 셀이 선택된 경우 → 셀 텍스트만 삭제
          const tableState = useTableStore.getState();
          if (
            tableState.selectedCells.length > 0 &&
            tableState.selectedTable &&
            tableState.updateTable
          ) {
            event.preventDefault();
            const { selectedTable, selectedCells, updateTable } = tableState;
            const cellSet = new Set(selectedCells.map((c) => `${c.row},${c.col}`));
            const newCells = selectedTable.cells.map((row, ri) =>
              row.map((cell, ci) =>
                cellSet.has(`${ri},${ci}`) ? { ...cell, text: "" } : cell,
              ),
            );
            updateTable({ cells: newCells });
            return;
          }

          event.preventDefault();
          if (onDeleteElements) {
            onDeleteElements([...currentSelectedIds]);
          } else {
            deleteSelectedElements();
          }
          return;
        }
      }

      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        const currentSelectedIds = selectedIdsRef.current;
        if (currentSelectedIds.length === 0) return;

        event.preventDefault();

        const baseDelta =
          event.key === "ArrowLeft"
            ? { x: -1, y: 0 }
            : event.key === "ArrowRight"
              ? { x: 1, y: 0 }
              : event.key === "ArrowUp"
                ? { x: 0, y: -1 }
                : { x: 0, y: 1 };

        const selectedElements = elements.filter((el) =>
          currentSelectedIds.includes(el.id),
        );
        const rects = selectedElements
          .map((el) => getRectFromElement(el))
          .filter((rect): rect is Rect => Boolean(rect));

        if (rects.length === 0) {
          return;
        }

        const minX = Math.min(...rects.map((r) => r.x));
        const minY = Math.min(...rects.map((r) => r.y));
        const maxX = Math.max(...rects.map((r) => r.x + r.width));
        const maxY = Math.max(...rects.map((r) => r.y + r.height));

        const activeRect = {
          x: minX + baseDelta.x,
          y: minY + baseDelta.y,
          width: maxX - minX,
          height: maxY - minY,
        };

        // 방향키 이동도 마우스 드래그와 동일한 스냅 가이드 기준을 사용해 미세 정렬을 맞춘다.
        const otherRects = elements
          .filter(
            (el) =>
              !currentSelectedIds.includes(el.id) &&
              el.visible !== false &&
              !el.locked,
          )
          .map((el) => getRectFromElement(el))
          .filter((rect): rect is Rect => Boolean(rect));

        smartGuides.compute({
          activeRect,
          otherRects,
        });

        const delta = baseDelta;

        const newElements = elements.map((element) => {
          if (!currentSelectedIds.includes(element.id) || element.locked) {
            return element;
          }
          if (element.type === "line" || element.type === "arrow") {
            return {
              ...element,
              start: {
                x: element.start.x + delta.x,
                y: element.start.y + delta.y,
              },
              end: {
                x: element.end.x + delta.x,
                y: element.end.y + delta.y,
              },
            };
          }
          if ("x" in element && "y" in element) {
            return {
              ...element,
              x: element.x + delta.x,
              y: element.y + delta.y,
            };
          }
          return element;
        });

        onElementsChange(newElements);

        if (clearGuidesTimeoutRef.current) {
          clearTimeout(clearGuidesTimeoutRef.current);
        }
        clearGuidesTimeoutRef.current = setTimeout(() => {
          smartGuides.clear();
          clearGuidesTimeoutRef.current = null;
        }, 100);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        if (selectedIdsRef.current.length === 0) return;
        copySelectedElements();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "x") {
        if (selectedIdsRef.current.length === 0) return;
        event.preventDefault();
        copySelectedElements();
        const currentIds = [...selectedIdsRef.current];
        if (onDeleteElements) {
          onDeleteElements(currentIds);
        } else {
          deleteSelectedElements();
        }
      }

      // Ctrl+V: paste 이벤트 핸들러(useDesignPaperPaste)에서 마커 기반으로 통합 처리

      if (
        event.key === "Tab" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();

        const selectableElements = elements.filter(
          (element) => !element.locked && element.selectable !== false,
        );

        if (selectableElements.length === 0) return;

        const sortedElements = [...selectableElements].sort((a, b) => {
          const aY = "y" in a ? a.y : 0;
          const bY = "y" in b ? b.y : 0;
          const aX = "x" in a ? a.x : 0;
          const bX = "x" in b ? b.x : 0;

          if (Math.abs(aY - bY) > 10) {
            return aY - bY;
          }
          return aX - bX;
        });

        const currentIndex =
          selectedIdsRef.current.length > 0
            ? sortedElements.findIndex(
                (el) => el.id === selectedIdsRef.current[0],
              )
            : -1;

        const nextIndex = event.shiftKey
          ? currentIndex <= 0
            ? sortedElements.length - 1
            : currentIndex - 1
          : currentIndex >= sortedElements.length - 1
            ? 0
            : currentIndex + 1;

        const nextElement = sortedElements[nextIndex];
        if (nextElement) {
          onSelectedIdsChange?.([nextElement.id]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (clearGuidesTimeoutRef.current) {
        clearTimeout(clearGuidesTimeoutRef.current);
        clearGuidesTimeoutRef.current = null;
      }
    };
  }, [
    readOnly,
    onElementsChange,
    editingTextId,
    editingImageId,
    clearEmotionSlotImage,
    onEditingTextIdChange,
    onSelectedIdsChange,
    copySelectedElements,
    pasteElements,
    getClipboard,
    elements,
    smartGuides,
    selectedIdsRef,
    clearContextMenu,
    setEditingImageId,
    onDeleteElements,
  ]);
};
