import type { MutableRefObject } from "react";
import type { ResizeHandle } from "../../../model/canvasTypes";
import type { Rect } from "../../../utils/designPaperUtils";
import type { GroupDragState } from "./useDesignPaperGroupDrag";

type SmartGuides = {
  compute: (params: {
    activeRect: Rect;
    otherRects: Rect[];
    activeX?: number[];
    activeY?: number[];
  }) => { snapOffset: { x: number; y: number } };
};

type ActiveInteractionState = {
  id: string;
  type: "drag" | "resize";
};

type UseSnapTransformRectParams = {
  activeInteractionRef: MutableRefObject<ActiveInteractionState | null>;
  groupDragRef: MutableRefObject<GroupDragState | null>;
  getGroupBoundingBox: (elementId: string, nextRect: Rect) => Rect | null;
  getTargetRects: (activeId: string, excludeIds?: Set<string>) => Rect[];
  smartGuides: SmartGuides;
};

const getGroupDragBoundingBox = (
  groupDrag: GroupDragState | null,
  elementId: string,
  nextRect: Rect,
): Rect | null => {
  if (!groupDrag || groupDrag.activeId !== elementId) return null;
  if (!groupDrag.activeRect) return null;
  const delta = {
    x: nextRect.x - groupDrag.activeRect.x,
    y: nextRect.y - groupDrag.activeRect.y,
  };
  const rects: Rect[] = [];
  groupDrag.items.forEach((item) => {
    if (item.kind === "rect") {
      rects.push({
        x: item.rect.x + delta.x,
        y: item.rect.y + delta.y,
        width: item.rect.width,
        height: item.rect.height,
      });
      return;
    }
    const minX = Math.min(item.line.start.x, item.line.end.x) + delta.x;
    const minY = Math.min(item.line.start.y, item.line.end.y) + delta.y;
    const width = Math.max(Math.abs(item.line.end.x - item.line.start.x), 1);
    const height = Math.max(Math.abs(item.line.end.y - item.line.start.y), 1);
    rects.push({
      x: minX,
      y: minY,
      width,
      height,
    });
  });
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const useSnapTransformRect = ({
  activeInteractionRef,
  groupDragRef,
  getGroupBoundingBox,
  getTargetRects,
  smartGuides,
}: UseSnapTransformRectParams) => {
  const transformElementRect = (
    elementId: string,
    nextRect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => {
    const activeInteraction = activeInteractionRef.current;
    if (!activeInteraction || activeInteraction.id !== elementId) {
      return nextRect;
    }
    const guideExcludeIds =
      context.type === "drag" &&
      groupDragRef.current?.activeId === elementId &&
      groupDragRef.current.items.size > 1
        ? new Set(groupDragRef.current.items.keys())
        : undefined;

    if (context.type === "resize") {
      const handle = context.handle ?? "";
      const activeX = handle.includes("e")
        ? [nextRect.x + nextRect.width]
        : handle.includes("w")
          ? [nextRect.x]
          : [];
      const activeY = handle.includes("s")
        ? [nextRect.y + nextRect.height]
        : handle.includes("n")
          ? [nextRect.y]
          : [];
      const { snapOffset } = smartGuides.compute({
        activeRect: nextRect,
        otherRects: getTargetRects(elementId, guideExcludeIds),
        activeX,
        activeY,
      });
      const next = { ...nextRect };
      if (handle.includes("e")) {
        next.width += snapOffset.x;
      } else if (handle.includes("w")) {
        next.x += snapOffset.x;
        next.width -= snapOffset.x;
      }
      if (handle.includes("s")) {
        next.height += snapOffset.y;
      } else if (handle.includes("n")) {
        next.y += snapOffset.y;
        next.height -= snapOffset.y;
      }
      return next;
    }

    const groupBoundingBox =
      getGroupDragBoundingBox(groupDragRef.current, elementId, nextRect) ??
      getGroupBoundingBox(elementId, nextRect);
    const activeRect = groupBoundingBox || nextRect;
    const { snapOffset } = smartGuides.compute({
      activeRect,
      otherRects: getTargetRects(elementId, guideExcludeIds),
    });
    return {
      ...nextRect,
      x: nextRect.x + snapOffset.x,
      y: nextRect.y + snapOffset.y,
    };
  };

  return { transformElementRect };
};
