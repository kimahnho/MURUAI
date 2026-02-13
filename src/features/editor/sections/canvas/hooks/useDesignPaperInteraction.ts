import { useEffect, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
  LineElement,
  ResizeHandle,
} from "../../../model/canvasTypes";
import type { Rect } from "../../../utils/designPaperUtils";
import { isEmotionSlotShape } from "../../../utils/designPaperUtils";
import { computeScaledImageBox, isImageFillElement } from "../../../utils/imageBoxScaling";
import {
  computeGroupRectFromDeltas,
  buildGroupResizeSnapshot,
  applyGroupResizeSnapshot,
  type GroupResizeSnapshot,
} from "../../../utils/groupResize";

type Point = LineElement["start"];

type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};

type ElementPatch =
  | TextElementPatch
  | Partial<ShapeElement>
  | Partial<LineElement>
  | Partial<CanvasElement>;

type SmartGuides = {
  compute: (params: {
    activeRect: Rect;
    otherRects: Rect[];
    activeX?: number[];
    activeY?: number[];
  }) => { snapOffset: { x: number; y: number } };
  clear: () => void;
};

type GroupDragState = {
  activeId: string;
  activeKind: "rect" | "line";
  activeRect?: Rect;
  activeLine?: { start: Point; end: Point };
  items: Map<string, unknown>;
};

interface UseDesignPaperInteractionParams {
  elements: CanvasElement[];
  readOnly: boolean;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onInteractionChange?: (
    isActive: boolean,
    context?: { type: "drag" | "resize" },
  ) => void;
  updateElement: (id: string, patch: ElementPatch) => void;
  smartGuides: SmartGuides;
  getTargetRects: (activeId: string, excludeIds?: Set<string>) => Rect[];
  getPointerPosition: (event: PointerEvent | ReactPointerEvent<HTMLElement>) => { x: number; y: number };
  groupDragRef: MutableRefObject<GroupDragState | null>;
  buildGroupDragState: (activeId: string) => GroupDragState | null;
  applyGroupDelta: (delta: { x: number; y: number }) => void;
  applyEmotionSlotRectUpdate: (elementId: string, nextRect: Rect) => void;
  findEmotionPlaceholderId: (element: ShapeElement) => string | null;
  findEmotionLabelId: (element: ShapeElement) => string | null;
  selectedIdsRef: MutableRefObject<string[]>;
  setActivePreview: (value: { id: string; rect: Rect } | null) => void;
}

export const useDesignPaperInteraction = ({
  elements,
  readOnly,
  onElementsChange,
  onInteractionChange,
  updateElement,
  smartGuides,
  getTargetRects,
  getPointerPosition,
  groupDragRef,
  buildGroupDragState,
  applyGroupDelta,
  applyEmotionSlotRectUpdate,
  findEmotionPlaceholderId,
  findEmotionLabelId,
  selectedIdsRef,
  setActivePreview,
}: UseDesignPaperInteractionParams) => {
  const activeInteractionRef = useRef<{
    id: string;
    type: "drag" | "resize";
    startRect?: Rect;
    startFontSize?: number;
    handle?: ResizeHandle;
  } | null>(null);
  const groupResizeRef = useRef<GroupResizeSnapshot | null>(null);
  const groupResizeListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      const listeners = groupResizeListenersRef.current;
      if (listeners) {
        window.removeEventListener("pointermove", listeners.move);
        window.removeEventListener("pointerup", listeners.up);
        groupResizeListenersRef.current = null;
      }
    };
  }, []);

  const handleGroupResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: ResizeHandle,
    rect: Rect,
  ) => {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    const startPointer = getPointerPosition(event);
    const snapshot = buildGroupResizeSnapshot(
      selectedIdsRef.current[0],
      rect,
      elements,
      selectedIdsRef.current,
      findEmotionPlaceholderId,
      findEmotionLabelId,
      handle,
    );
    if (!snapshot) return;
    groupResizeRef.current = snapshot;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentPointer = getPointerPosition(moveEvent);
      const dx = currentPointer.x - startPointer.x;
      const dy = currentPointer.y - startPointer.y;
      const nextGroupRect = computeGroupRectFromDeltas(
        snapshot.startGroupRect,
        handle,
        dx,
        dy,
      );
      if (onElementsChange) {
        onElementsChange(applyGroupResizeSnapshot(snapshot, nextGroupRect, elements));
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      groupResizeListenersRef.current = null;
      groupResizeRef.current = null;
    };

    groupResizeListenersRef.current = {
      move: onPointerMove,
      up: onPointerUp,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleRectChange = (elementId: string, nextRect: Rect) => {
    const activeInteraction = activeInteractionRef.current;
    if (!activeInteraction || activeInteraction.id !== elementId) {
      const targetElement = elements.find(
        (element) => element.id === elementId,
      );
      const updates: Partial<ShapeElement> = {
        w: nextRect.width,
        h: nextRect.height,
      };
      if (targetElement?.type === "text") {
        updates.x = nextRect.x;
        updates.y = nextRect.y;
      }

      if (targetElement && isImageFillElement(targetElement)) {
        updates.imageBox = computeScaledImageBox(
          (targetElement as ShapeElement).imageBox,
          nextRect.width,
          nextRect.height,
        );
      }

      updateElement(elementId, updates);
      return;
    }

    const resizeSnapshot = groupResizeRef.current;
    if (
      activeInteraction.type === "resize" &&
      resizeSnapshot &&
      resizeSnapshot.activeId === elementId &&
      onElementsChange
    ) {
      const handle = resizeSnapshot.handle ?? activeInteraction.handle;
      if (!handle) return;
      const { startGroupRect, startActiveRect } = resizeSnapshot;
      const deltaX = nextRect.x - startActiveRect.x;
      const deltaY = nextRect.y - startActiveRect.y;
      const deltaW = nextRect.width - startActiveRect.width;
      const deltaH = nextRect.height - startActiveRect.height;
      const dx = handle.includes("e")
        ? deltaW
        : handle.includes("w")
          ? deltaX
          : 0;
      const dy = handle.includes("s")
        ? deltaH
        : handle.includes("n")
          ? deltaY
          : 0;
      const nextGroupRect = computeGroupRectFromDeltas(
        startGroupRect,
        handle,
        dx,
        dy,
      );

      if (onElementsChange) {
        onElementsChange(applyGroupResizeSnapshot(resizeSnapshot, nextGroupRect, elements));
      }
      setActivePreview(null);
      return;
    }
    const groupDrag = groupDragRef.current;
    if (
      groupDrag &&
      groupDrag.activeId === elementId &&
      activeInteraction.type === "drag"
    ) {
      if (groupDrag.activeKind !== "rect" || !groupDrag.activeRect) return;
      const delta = {
        x: nextRect.x - groupDrag.activeRect.x,
        y: nextRect.y - groupDrag.activeRect.y,
      };
      applyGroupDelta(delta);
      setActivePreview(null);
      return;
    }
    const targetElement = elements.find((element) => element.id === elementId);
    if (
      activeInteraction.type === "resize" ||
      activeInteraction.type === "drag"
    ) {
      if (targetElement && isEmotionSlotShape(targetElement)) {
        applyEmotionSlotRectUpdate(elementId, nextRect);
        setActivePreview(null);
        return;
      }
    }
    if (
      activeInteraction.type === "resize" &&
      targetElement &&
      targetElement.type === "text"
    ) {
      const startRect =
        activeInteraction.startRect ??
        ("x" in targetElement && "w" in targetElement
          ? {
              x: targetElement.x,
              y: targetElement.y,
              width: targetElement.w,
              height: targetElement.h,
            }
          : nextRect);
      const handle = activeInteraction.handle;
      const hasWidthHandle =
        handle != null && (handle.includes("e") || handle.includes("w"));
      const shouldScaleFont =
        handle != null && ["nw", "ne", "sw", "se"].includes(handle);
      const baseFontSize =
        activeInteraction.startFontSize ?? targetElement.style.fontSize;
      const heightRatio = startRect.height
        ? nextRect.height / startRect.height
        : 1;
      const nextFontSize = shouldScaleFont
        ? Math.max(6, Math.round(baseFontSize * heightRatio))
        : baseFontSize;
      const patch: TextElementPatch = {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
      };
      if (hasWidthHandle) {
        patch.widthMode = "fixed";
      }
      if (shouldScaleFont) {
        patch.style = { fontSize: nextFontSize };
      }
      updateElement(elementId, patch);
      setActivePreview({ id: elementId, rect: nextRect });
      return;
    }

    if (
      activeInteraction.type === "drag" &&
      targetElement &&
      (targetElement.type === "rect" ||
        targetElement.type === "roundRect" ||
        targetElement.type === "ellipse") &&
      targetElement.labelId &&
      onElementsChange
    ) {
      const deltaX = nextRect.x - targetElement.x;
      const deltaY = nextRect.y - targetElement.y;
      if (deltaX !== 0 || deltaY !== 0) {
        const nextElements = elements.map((element) => {
          if (element.id === elementId) {
            return {
              ...element,
              x: nextRect.x,
              y: nextRect.y,
              w: nextRect.width,
              h: nextRect.height,
            };
          }
          if (element.id === targetElement.labelId && element.type === "text") {
            return {
              ...element,
              x: element.x + deltaX,
              y: element.y + deltaY,
            };
          }
          return element;
        });
        onElementsChange(nextElements);
        setActivePreview(null);
        return;
      }
    }

    if (
      activeInteraction.type === "resize" &&
      targetElement &&
      isImageFillElement(targetElement)
    ) {
      updateElement(elementId, {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
        imageBox: computeScaledImageBox(
          (targetElement as ShapeElement).imageBox,
          nextRect.width,
          nextRect.height,
        ),
      });
      setActivePreview({ id: elementId, rect: nextRect });
      return;
    }

    setActivePreview({ id: elementId, rect: nextRect });
  };

  const handleDragStateChange = (
    elementId: string,
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => {
    if (isDragging) {
      const targetElement = elements.find(
        (element) => element.id === elementId,
      );
      const startRect =
        finalRect ??
        (targetElement && "x" in targetElement && "w" in targetElement
          ? {
              x: targetElement.x,
              y: targetElement.y,
              width: targetElement.w,
              height: targetElement.h,
            }
          : undefined);
      const handle = context?.handle;
      const hasWidthHandle =
        handle != null && (handle.includes("e") || handle.includes("w"));
      if (
        targetElement &&
        targetElement.type === "text" &&
        context?.type === "resize" &&
        hasWidthHandle &&
        targetElement.widthMode !== "fixed"
      ) {
        updateElement(elementId, { widthMode: "fixed" });
      }
      activeInteractionRef.current = {
        id: elementId,
        type: context?.type ?? "drag",
        startRect,
        startFontSize:
          targetElement && targetElement.type === "text"
            ? targetElement.style.fontSize
            : undefined,
        handle,
      };
      if (context?.type === "drag") {
        groupDragRef.current = buildGroupDragState(elementId);
        if (groupDragRef.current) {
          setActivePreview(null);
        }
      } else {
        groupDragRef.current = null;
      }
      if (context?.type === "resize" && startRect) {
        groupResizeRef.current = buildGroupResizeSnapshot(
          elementId,
          startRect,
          elements,
          selectedIdsRef.current,
          findEmotionPlaceholderId,
          findEmotionLabelId,
          handle,
        );
      } else {
        groupResizeRef.current = null;
      }
      onInteractionChange?.(true, context);
      return;
    }
    const hadGroupDrag = groupDragRef.current?.activeId === elementId;
    if (hadGroupDrag) {
      groupDragRef.current = null;
    }
    if (groupResizeRef.current?.activeId === elementId) {
      groupResizeRef.current = null;
    }
    if (finalRect && !hadGroupDrag) {
      const targetElement = elements.find(
        (element) => element.id === elementId,
      );
      const activeInteraction = activeInteractionRef.current;
      if (
        targetElement &&
        isEmotionSlotShape(targetElement) &&
        (context?.type === "drag" || context?.type === "resize")
      ) {
        applyEmotionSlotRectUpdate(elementId, finalRect);
        activeInteractionRef.current = null;
        setActivePreview(null);
        smartGuides.clear();
        return;
      }
      if (
        targetElement &&
        targetElement.type === "text" &&
        context?.type === "resize" &&
        activeInteraction?.startRect
      ) {
        const handle = activeInteraction.handle;
        const hasWidthHandle =
          handle != null && (handle.includes("e") || handle.includes("w"));
        const shouldScaleFont =
          handle != null && ["nw", "ne", "sw", "se"].includes(handle);
        const heightRatio = activeInteraction.startRect.height
          ? finalRect.height / activeInteraction.startRect.height
          : 1;
        const baseFontSize =
          activeInteraction.startFontSize ?? targetElement.style.fontSize;
        const nextFontSize = shouldScaleFont
          ? Math.max(6, Math.round(baseFontSize * heightRatio))
          : baseFontSize;
        const patch: TextElementPatch = {
          x: finalRect.x,
          y: finalRect.y,
          w: finalRect.width,
          h: finalRect.height,
        };
        if (hasWidthHandle) {
          patch.widthMode = "fixed";
        }
        if (shouldScaleFont) {
          patch.style = { fontSize: nextFontSize };
        }
        updateElement(elementId, patch);
      } else {
        const isResize = context?.type === "resize";
        const updates: Partial<ShapeElement> = {
          x: finalRect.x,
          y: finalRect.y,
          w: finalRect.width,
          h: finalRect.height,
        };

        if (
          targetElement &&
          isImageFillElement(targetElement) &&
          isResize
        ) {
          updates.imageBox = computeScaledImageBox(
            (targetElement as ShapeElement).imageBox,
            finalRect.width,
            finalRect.height,
          );
        }
        const labelId =
          targetElement &&
          (targetElement.type === "rect" ||
            targetElement.type === "roundRect" ||
            targetElement.type === "ellipse")
            ? targetElement.labelId
            : undefined;
        const deltaX =
          targetElement && "x" in targetElement
            ? finalRect.x - targetElement.x
            : 0;
        const deltaY =
          targetElement && "y" in targetElement
            ? finalRect.y - targetElement.y
            : 0;
        const shouldMoveLabel =
          context?.type === "drag" &&
          Boolean(labelId) &&
          (deltaX !== 0 || deltaY !== 0) &&
          !readOnly &&
          Boolean(onElementsChange);

        if (shouldMoveLabel && onElementsChange) {
          const nextElements = elements.map((element): CanvasElement => {
            if (element.id === elementId) {
              if (
                element.type === "rect" ||
                element.type === "roundRect" ||
                element.type === "ellipse"
              ) {
                return { ...element, ...updates };
              }
              return element;
            }
            if (labelId && element.id === labelId && element.type === "text") {
              return {
                ...element,
                x: element.x + deltaX,
                y: element.y + deltaY,
              };
            }
            return element;
          });
          onElementsChange(nextElements);
        } else {
          updateElement(elementId, updates);
        }
      }
    }
    if (context?.type) {
      onInteractionChange?.(false, context);
    }
    activeInteractionRef.current = null;
    setActivePreview(null);
    smartGuides.clear();
  };

  const handleLineChange = (
    elementId: string,
    nextLine: { start: Point; end: Point },
  ) => {
    const groupDrag = groupDragRef.current;
    if (
      groupDrag &&
      groupDrag.activeId === elementId &&
      activeInteractionRef.current?.type === "drag"
    ) {
      if (groupDrag.activeKind !== "line" || !groupDrag.activeLine) return;
      const delta = {
        x: nextLine.start.x - groupDrag.activeLine.start.x,
        y: nextLine.start.y - groupDrag.activeLine.start.y,
      };
      applyGroupDelta(delta);
      return;
    }

    const minX = Math.min(nextLine.start.x, nextLine.end.x);
    const minY = Math.min(nextLine.start.y, nextLine.end.y);
    const maxX = Math.max(nextLine.start.x, nextLine.end.x);
    const maxY = Math.max(nextLine.start.y, nextLine.end.y);
    const centerX = (nextLine.start.x + nextLine.end.x) / 2;
    const centerY = (nextLine.start.y + nextLine.end.y) / 2;
    const lineRect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    const context = activeInteractionRef.current;
    if (context?.type === "resize") {
      const currentElement = elements.find((e) => e.id === elementId);
      const isMovingStart =
        currentElement &&
        (currentElement.type === "line" || currentElement.type === "arrow")
          ? nextLine.start.x !== currentElement.start.x ||
            nextLine.start.y !== currentElement.start.y
          : false;
      const activeX = isMovingStart ? [nextLine.start.x] : [nextLine.end.x];
      const activeY = isMovingStart ? [nextLine.start.y] : [nextLine.end.y];

      const { snapOffset } = smartGuides.compute({
        activeRect: lineRect,
        otherRects: getTargetRects(
          elementId,
          groupDrag ? new Set(groupDrag.items.keys() as Iterable<string>) : undefined,
        ),
        activeX,
        activeY,
      });

      const adjustedLine = {
        start: isMovingStart
          ? {
              x: nextLine.start.x + snapOffset.x,
              y: nextLine.start.y + snapOffset.y,
            }
          : nextLine.start,
        end: isMovingStart
          ? nextLine.end
          : {
              x: nextLine.end.x + snapOffset.x,
              y: nextLine.end.y + snapOffset.y,
            },
      };
      updateElement(elementId, {
        start: adjustedLine.start,
        end: adjustedLine.end,
      });
    } else {
      const activeX = [centerX];
      const activeY = [centerY];

      const { snapOffset } = smartGuides.compute({
        activeRect: lineRect,
        otherRects: getTargetRects(
          elementId,
          groupDrag ? new Set(groupDrag.items.keys() as Iterable<string>) : undefined,
        ),
        activeX,
        activeY,
      });

      const adjustedLine = {
        start: {
          x: nextLine.start.x + snapOffset.x,
          y: nextLine.start.y + snapOffset.y,
        },
        end: {
          x: nextLine.end.x + snapOffset.x,
          y: nextLine.end.y + snapOffset.y,
        },
      };
      updateElement(elementId, {
        start: adjustedLine.start,
        end: adjustedLine.end,
      });
    }
  };

  const handleLineDragStateChange = (
    elementId: string,
    isDragging: boolean,
    _nextLine?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" },
  ) => {
    void _nextLine;
    if (isDragging) {
      activeInteractionRef.current = {
        id: elementId,
        type: context?.type ?? "drag",
      };
      if (context?.type === "drag") {
        groupDragRef.current = buildGroupDragState(elementId);
      } else {
        groupDragRef.current = null;
      }
      onInteractionChange?.(true, context);
      return;
    }
    if (groupDragRef.current?.activeId === elementId) {
      groupDragRef.current = null;
    }
    activeInteractionRef.current = null;
    if (context?.type) {
      onInteractionChange?.(false, context);
    }
    smartGuides.clear();
  };

  return {
    activeInteractionRef,
    groupResizeRef,
    handleGroupResizePointerDown,
    handleRectChange,
    handleDragStateChange,
    handleLineChange,
    handleLineDragStateChange,
  };
};
