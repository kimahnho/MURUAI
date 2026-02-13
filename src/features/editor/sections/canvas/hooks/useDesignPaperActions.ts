import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  SetStateAction,
} from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import type { ContextMenuState, LayerDirection } from "../DesignPaperContextMenu";
import { isEditableTarget } from "../../../utils/designPaperUtils";

interface UseDesignPaperActionsParams {
  elements: CanvasElement[];
  selectedIds: string[];
  readOnly: boolean;
  editingTextId: string | null;
  editingImageId: string | null;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  setEditingImageId: (id: string | null) => void;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  selectedIdsRef: MutableRefObject<string[]>;
}

export const useDesignPaperActions = ({
  elements,
  selectedIds,
  readOnly,
  editingTextId,
  editingImageId,
  onElementsChange,
  onSelectedIdsChange,
  onEditingTextIdChange,
  setEditingImageId,
  setContextMenu,
  selectedIdsRef,
}: UseDesignPaperActionsParams) => {
  const moveElement = (elementId: string, direction: LayerDirection) => {
    if (readOnly || !onElementsChange) return;
    const index = elements.findIndex((element) => element.id === elementId);
    if (index === -1) return;
    const nextElements = [...elements];
    if (direction === "forward") {
      if (index >= nextElements.length - 1) return;
      [nextElements[index], nextElements[index + 1]] = [
        nextElements[index + 1],
        nextElements[index],
      ];
    } else if (direction === "backward") {
      if (index <= 0) return;
      [nextElements[index - 1], nextElements[index]] = [
        nextElements[index],
        nextElements[index - 1],
      ];
    } else if (direction === "front") {
      if (index >= nextElements.length - 1) return;
      const [target] = nextElements.splice(index, 1);
      nextElements.push(target);
    } else {
      if (index <= 0) return;
      const [target] = nextElements.splice(index, 1);
      nextElements.unshift(target);
    }
    onElementsChange(nextElements);
    setContextMenu(null);
  };

  const groupSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    const nextGroupId = crypto.randomUUID();
    const nextElements = elements.map((element) =>
      ids.includes(element.id) ? { ...element, groupId: nextGroupId } : element,
    );
    onElementsChange(nextElements);
    setContextMenu(null);
  };

  const ungroupSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    const ids = selectedIdsRef.current;
    const groupIds = new Set(
      elements
        .filter((element) => ids.includes(element.id) && element.groupId)
        .map((element) => element.groupId as string),
    );
    if (groupIds.size === 0) return;
    const nextElements = elements.map((element) =>
      element.groupId && groupIds.has(element.groupId)
        ? { ...element, groupId: undefined }
        : element,
    );
    onElementsChange(nextElements);
    setContextMenu(null);
  };

  const getLinkedIdsToDelete = (idsToDelete: string[]) => {
    const linkedIds = new Set<string>();
    elements.forEach((element) => {
      if (idsToDelete.includes(element.id)) {
        if (
          (element.type === "rect" ||
            element.type === "roundRect" ||
            element.type === "ellipse") &&
          element.labelId
        ) {
          linkedIds.add(element.labelId);
        }
      }
    });
    return new Set([...idsToDelete, ...linkedIds]);
  };

  const deleteElementById = (id: string) => {
    if (readOnly || !onElementsChange) return;
    const allIdsToDelete = getLinkedIdsToDelete([id]);
    onElementsChange(
      elements.filter((element) => !allIdsToDelete.has(element.id)),
    );
    const nextSelected = selectedIdsRef.current.filter(
      (selectedId) => !allIdsToDelete.has(selectedId),
    );
    selectedIdsRef.current = nextSelected;
    onSelectedIdsChange?.(nextSelected);
    if (editingTextId && allIdsToDelete.has(editingTextId)) {
      onEditingTextIdChange?.(null);
    }
    if (editingImageId && allIdsToDelete.has(editingImageId)) {
      setEditingImageId(null);
    }
    setContextMenu((prev) =>
      prev?.target.type === "element" && allIdsToDelete.has(prev.target.id)
        ? null
        : prev,
    );
  };

  const deleteSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    if (selectedIds.length === 0) return;
    const allIdsToDelete = getLinkedIdsToDelete(selectedIds);
    onElementsChange(
      elements.filter((element) => !allIdsToDelete.has(element.id)),
    );
    selectedIdsRef.current = [];
    onSelectedIdsChange?.([]);
    onEditingTextIdChange?.(null);
    setContextMenu(null);
  };

  const handleDeleteSelectionKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (readOnly) return;
    event.stopPropagation();
    if ((event.key !== "Delete" && event.key !== "Backspace") || editingTextId) {
      return;
    }
    if (isEditableTarget(event.target)) return;
    const currentSelectedIds = selectedIdsRef.current;
    if (currentSelectedIds.length === 0 || !onElementsChange) return;
    event.preventDefault();
    const allIdsToDelete = getLinkedIdsToDelete(currentSelectedIds);
    onElementsChange(
      elements.filter((element) => !allIdsToDelete.has(element.id)),
    );
    selectedIdsRef.current = [];
    onSelectedIdsChange?.([]);
    onEditingTextIdChange?.(null);
    if (editingImageId && allIdsToDelete.has(editingImageId)) {
      setEditingImageId(null);
    }
    setContextMenu(null);
  };

  return {
    moveElement,
    groupSelectedElements,
    ungroupSelectedElements,
    deleteElementById,
    deleteSelectedElements,
    handleDeleteSelectionKeyDown,
  };
};
