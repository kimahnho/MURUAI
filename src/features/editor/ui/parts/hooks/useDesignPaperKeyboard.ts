import { useEffect, type MutableRefObject } from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
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
  pasteElements,
  getClipboard,
  smartGuides,
}: UseDesignPaperKeyboardProps) => {
  useEffect(() => {
    if (readOnly || !onElementsChange) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (editingTextId) return;
      if (isEditableTarget(event.target)) return;

      const currentSelectedIds = selectedIdsRef.current;
      if (
        (event.key === "Process" || event.key === "Unidentified") &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
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
          event.preventDefault();
          onElementsChange(
            elements.filter(
              (element) => !currentSelectedIds.includes(element.id),
            ),
          );
          selectedIdsRef.current = [];
          onSelectedIdsChange?.([]);
          onEditingTextIdChange?.(null);
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

        setTimeout(() => {
          smartGuides.clear();
        }, 100);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        if (selectedIdsRef.current.length === 0) return;
        copySelectedElements();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        const clipboard = getClipboard();
        if (clipboard && clipboard.length > 0) {
          event.preventDefault();
          pasteElements();
        }
      }

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
  ]);
};
