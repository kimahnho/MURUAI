/**
 * DesignPaper의 선택/드래그/리사이즈/컨텍스트 메뉴 입력 흐름을 통합 처리하는 핵심 훅.
 */
import { useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
  LineElement,
  ResizeHandle,
} from "../../../model/canvasTypes";
import { RECT_TOLERANCE, isEmotionSlotShape, isSameRect, type Rect } from "../../../utils/designPaperUtils";
import { computeScaledImageBox, isImageFillElement } from "../../../utils/imageBoxScaling";
import {
  computeGroupRectFromDeltas,
  buildGroupResizeSnapshot,
  applyGroupResizeSnapshot,
  type GroupResizeSnapshot,
} from "../../../utils/groupResize";
import { buildTextResizePatch } from "../utils/textResizePatch";
import {
  applyDragSnapOffsetToLine,
  applyResizeSnapOffsetToLine,
  getLineCenter,
  getLineRect,
  isMovingLineStart,
} from "../utils/lineSnap";
import { usePointerDragSession } from "./usePointerDragSession";

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
  const { startPointerDragSession } = usePointerDragSession();
  const getElementById = (id: string) =>
    elements.find((element) => element.id === id);

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

    startPointerDragSession({
      thresholdPx: 0,
      startContext: undefined,
      createMoveContext: (moveEvent) => {
        const currentPointer = getPointerPosition(moveEvent);
        return {
          distance: 0,
          context: {
            dx: currentPointer.x - startPointer.x,
            dy: currentPointer.y - startPointer.y,
          },
        };
      },
      onMove: ({ dx, dy }) => {
        const nextGroupRect = computeGroupRectFromDeltas(
          snapshot.startGroupRect,
          handle,
          dx,
          dy,
        );
        if (onElementsChange) {
          onElementsChange(applyGroupResizeSnapshot(snapshot, nextGroupRect, elements));
        }
      },
      onEnd: () => {
        groupResizeRef.current = null;
      },
    });
  };

  const handleRectChange = (elementId: string, nextRect: Rect) => {
    const activeInteraction = activeInteractionRef.current;
    if (!activeInteraction || activeInteraction.id !== elementId) {
      const targetElement = getElementById(elementId);
      if (targetElement?.type === "text" && isSameRect(nextRect, targetElement)) {
        return;
      }
      if (
        targetElement &&
        (targetElement.type === "rect" ||
          targetElement.type === "roundRect" ||
          targetElement.type === "ellipse")
      ) {
        const isSameShapeRect =
          Math.abs(nextRect.x - targetElement.x) <= RECT_TOLERANCE &&
          Math.abs(nextRect.y - targetElement.y) <= RECT_TOLERANCE &&
          Math.abs(nextRect.width - targetElement.w) <= RECT_TOLERANCE &&
          Math.abs(nextRect.height - targetElement.h) <= RECT_TOLERANCE;
        if (isSameShapeRect) {
          return;
        }
      }
      const updates: Partial<ShapeElement> = {
        w: nextRect.width,
        h: nextRect.height,
      };
      // 표/텍스트처럼 x/y로 직접 위치를 관리하는 요소는 좌표도 함께 업데이트한다.
      if (targetElement?.type === "text" || targetElement?.type === "table") {
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
      // 텍스트 리사이즈는 시작 시점 사각형을 기준으로 폰트 크기를 보정해
      // 박스 크기 변화와 글자 스케일이 어긋나지 않도록 한다.
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
      const patch = buildTextResizePatch({
        handle: activeInteraction.handle,
        startHeight: startRect.height,
        nextRect,
        baseFontSize:
          activeInteraction.startFontSize ?? targetElement.style.fontSize,
      });
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

    // 표처럼 x/y로 위치를 관리하는 요소는 드래그/리사이즈 중에도 실시간으로 좌표를 반영한다.
    if (targetElement?.type === "table") {
      updateElement(elementId, {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
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
      const targetElement = getElementById(elementId);
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
        // 드래그 시작 시 그룹 스냅샷을 한 번 만들고 이동 내내 재사용해
        // 서로 다른 타입이 섞여 있어도 그룹 이동 기준이 흔들리지 않게 한다.
        groupDragRef.current = buildGroupDragState(elementId);
        if (groupDragRef.current) {
          setActivePreview(null);
        }
      } else {
        groupDragRef.current = null;
      }
      if (context?.type === "resize" && startRect) {
        // 그룹 리사이즈는 각 요소의 시작 기하값 스냅샷을 기준으로
        // 비율/앵커를 동일하게 유지한다.
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
      const targetElement = getElementById(elementId);
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
        const patch = buildTextResizePatch({
          handle,
          startHeight: activeInteraction.startRect.height,
          nextRect: finalRect,
          baseFontSize:
            activeInteraction.startFontSize ?? targetElement.style.fontSize,
        });
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

    const lineRect = getLineRect(nextLine);

    const context = activeInteractionRef.current;
    if (context?.type === "resize") {
      // 라인 리사이즈는 움직이는 끝점을 기준으로 스냅하고,
      // 일반 드래그는 중심점을 기준으로 스냅해 끝점 드리프트를 줄인다.
      const currentElement = elements.find((e) => e.id === elementId);
      const currentLine =
        currentElement && (currentElement.type === "line" || currentElement.type === "arrow")
          ? {
              start: currentElement.start,
              end: currentElement.end,
            }
          : null;
      const isMovingStart = isMovingLineStart(nextLine, currentLine);
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

      const adjustedLine = applyResizeSnapOffsetToLine(
        nextLine,
        isMovingStart,
        snapOffset,
      );
      updateElement(elementId, {
        start: adjustedLine.start,
        end: adjustedLine.end,
      });
    } else {
      const center = getLineCenter(nextLine);
      const activeX = [center.x];
      const activeY = [center.y];

      const { snapOffset } = smartGuides.compute({
        activeRect: lineRect,
        otherRects: getTargetRects(
          elementId,
          groupDrag ? new Set(groupDrag.items.keys() as Iterable<string>) : undefined,
        ),
        activeX,
        activeY,
      });

      const adjustedLine = applyDragSnapOffsetToLine(nextLine, snapOffset);
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
