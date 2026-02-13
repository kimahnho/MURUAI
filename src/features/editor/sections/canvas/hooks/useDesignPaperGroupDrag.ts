import { useCallback, useRef, type MutableRefObject } from "react";
import type { CanvasElement, LineElement, ShapeElement } from "../../../model/canvasTypes";
import {
  getRectFromElement,
  isEmotionSlotShape,
  type Rect,
} from "../../../utils/designPaperUtils";

type Point = LineElement["start"];

type GroupDragItem =
  | { kind: "rect"; rect: Rect }
  | { kind: "line"; line: { start: Point; end: Point } };

type GroupDragState = {
  activeId: string;
  activeKind: GroupDragItem["kind"];
  activeRect?: Rect;
  activeLine?: { start: Point; end: Point };
  items: Map<string, GroupDragItem>;
};

type UseDesignPaperGroupDragProps = {
  elements: CanvasElement[];
  selectedIds: string[];
  selectedIdsRef: MutableRefObject<string[]>;
  readOnly: boolean;
  onElementsChange?: (elements: CanvasElement[]) => void;
  findEmotionPlaceholderId: (shape: ShapeElement) => string | null;
  findEmotionLabelId: (shape: ShapeElement) => string | null;
};

export const useDesignPaperGroupDrag = ({
  elements,
  selectedIds,
  selectedIdsRef,
  readOnly,
  onElementsChange,
  findEmotionPlaceholderId,
  findEmotionLabelId,
}: UseDesignPaperGroupDragProps) => {
  const groupDragRef = useRef<GroupDragState | null>(null);

  const buildGroupDragState = useCallback(
    (activeId: string): GroupDragState | null => {
      const activeSelectedIds = selectedIdsRef.current;
      if (activeSelectedIds.length <= 1) return null;
      const items = new Map<string, GroupDragItem>();
      elements.forEach((element) => {
        if (!activeSelectedIds.includes(element.id) || element.locked) return;
        if (element.type === "line" || element.type === "arrow") {
          items.set(element.id, {
            kind: "line",
            line: {
              start: { ...element.start },
              end: { ...element.end },
            },
          });
          return;
        }
        if ("x" in element && "y" in element && "w" in element && "h" in element) {
          items.set(element.id, {
            kind: "rect",
            rect: {
              x: element.x,
              y: element.y,
              width: element.w,
              height: element.h,
            },
          });
        }
      });
      const activeItem = items.get(activeId);
      if (!activeItem) return null;
      return {
        activeId,
        activeKind: activeItem.kind,
        activeRect: activeItem.kind === "rect" ? activeItem.rect : undefined,
        activeLine: activeItem.kind === "line" ? activeItem.line : undefined,
        items,
      };
    },
    [elements, selectedIdsRef]
  );

  const getGroupBoundingBox = useCallback(
    (elementId: string, currentElementRect: Rect): Rect | null => {
      const element = elements.find((el) => el.id === elementId);
      if (!element) return null;

      const elementGroupId = element.groupId;
      if (!elementGroupId) return null;

      const groupElements = elements.filter((el) => el.groupId === elementGroupId);
      const allGroupSelected = groupElements.every((el) =>
        selectedIds.includes(el.id)
      );

      if (!allGroupSelected) return null;

      const originalRect = getRectFromElement(element);
      if (!originalRect) return null;

      const deltaX = currentElementRect.x - originalRect.x;
      const deltaY = currentElementRect.y - originalRect.y;

      const groupRects = groupElements
        .map((el) => {
          const rect = getRectFromElement(el);
          if (!rect) return null;
          return {
            x: rect.x + deltaX,
            y: rect.y + deltaY,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter((rect): rect is Rect => Boolean(rect));

      if (groupRects.length === 0) return null;

      const minX = Math.min(...groupRects.map((r) => r.x));
      const minY = Math.min(...groupRects.map((r) => r.y));
      const maxX = Math.max(...groupRects.map((r) => r.x + r.width));
      const maxY = Math.max(...groupRects.map((r) => r.y + r.height));

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    [elements, selectedIds]
  );

  const applyGroupDelta = useCallback(
    (delta: { x: number; y: number }) => {
      if (readOnly || !onElementsChange) return;
      const snapshot = groupDragRef.current;
      if (!snapshot) return;
      const selected = new Set(snapshot.items.keys());
      const linkedIds = new Set<string>();
      elements.forEach((element) => {
        if (!selected.has(element.id)) return;
        if (!isEmotionSlotShape(element)) return;
        const placeholderId = findEmotionPlaceholderId(element);
        const labelId = findEmotionLabelId(element);
        if (placeholderId && !selected.has(placeholderId)) {
          linkedIds.add(placeholderId);
        }
        if (labelId && !selected.has(labelId)) {
          linkedIds.add(labelId);
        }
      });
      elements.forEach((element) => {
        if (!selected.has(element.id)) return;
        if (
          element.type !== "rect" &&
          element.type !== "roundRect" &&
          element.type !== "ellipse"
        ) {
          return;
        }
        if (!element.labelId) return;
        if (!selected.has(element.labelId)) {
          linkedIds.add(element.labelId);
        }
      });
      const nextElements = elements.map((element) => {
        const item = snapshot.items.get(element.id);
        if (!item) return element;
        if (item.kind === "line" && (element.type === "line" || element.type === "arrow")) {
          return {
            ...element,
            start: {
              x: item.line.start.x + delta.x,
              y: item.line.start.y + delta.y,
            },
            end: {
              x: item.line.end.x + delta.x,
              y: item.line.end.y + delta.y,
            },
          };
        }
        if (item.kind === "rect" && "x" in element && "y" in element) {
          return {
            ...element,
            x: item.rect.x + delta.x,
            y: item.rect.y + delta.y,
          };
        }
        return element;
      });
      const nextElementsWithLinked = linkedIds.size
        ? nextElements.map((element) => {
            if (!linkedIds.has(element.id)) return element;
            if (!("x" in element && "y" in element)) return element;
            return {
              ...element,
              x: element.x + delta.x,
              y: element.y + delta.y,
            } as CanvasElement;
          })
        : nextElements;
      onElementsChange(nextElementsWithLinked);
    },
    [
      elements,
      findEmotionLabelId,
      findEmotionPlaceholderId,
      onElementsChange,
      readOnly,
    ]
  );

  return {
    groupDragRef,
    buildGroupDragState,
    getGroupBoundingBox,
    applyGroupDelta,
  };
};
