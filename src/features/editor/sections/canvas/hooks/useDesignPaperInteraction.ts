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
    context?: { type: "drag" | "resize"; isCrop?: boolean },
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
    startImageBox?: { x: number; y: number; w: number; h: number };
    isCrop?: boolean;
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
          targetElement.type === "ellipse" ||
          targetElement.type === "mosaic" ||
          targetElement.type === "circleMosaic" ||
          targetElement.type === "aacCard" ||
          targetElement.type === "emotionCard" ||
          targetElement.type === "freeform")
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
      // 표/텍스트/자유형처럼 x/y로 직접 위치를 관리하는 요소는 좌표도 함께 업데이트한다.
      if (targetElement?.type === "text" || targetElement?.type === "table" || targetElement?.type === "freeform") {
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
        targetElement.type === "ellipse" ||
        targetElement.type === "mosaic" ||
        targetElement.type === "circleMosaic") &&
      onElementsChange
    ) {
      const deltaX = nextRect.x - targetElement.x;
      const deltaY = nextRect.y - targetElement.y;

      // labelId 연동 또는 마인드맵 노드 연결선 추종
      const meta = (targetElement as { worksheetMeta?: { mindMapNodeId?: string; componentId?: string } }).worksheetMeta;
      const hasMindMap = !!meta?.mindMapNodeId;
      const hasLabel = !!(targetElement as { labelId?: string }).labelId;

      // 1차 노드를 드래그하면 그 자식(2차 노드)들도 함께 이동시킨다 — 같은 컴포넌트의
      // mindMapParentId가 이 L1의 nodeId와 일치하는 요소들을 같은 delta로 옮긴다.
      const draggingL1NodeId =
        hasMindMap && meta?.mindMapNodeId && /^L1-\d+$/.test(meta.mindMapNodeId)
          ? meta.mindMapNodeId
          : null;
      const sameCompId = meta?.componentId;

      if ((hasLabel || hasMindMap) && (deltaX !== 0 || deltaY !== 0)) {
        const nodeCenterX = nextRect.x + nextRect.width / 2;
        const nodeCenterY = nextRect.y + nextRect.height / 2;

        // 1차 드래그면 이 L1의 자식(L2)들 중심 좌표를 미리 계산해둔다.
        // 각 라인의 끝점이 L2 중심과 가까우면 delta만큼 함께 이동시킨다.
        const l1ChildCenters: { x: number; y: number }[] = [];
        // 컴팩트 모드(1차 7+)에서는 2차 도형이 캔버스에 없지만 라인 끝점은 있다.
        // center 노드 위치를 알면 "L1 끝점이 아닌 쪽 & center도 아닌 쪽" 끝점 = L2 끝점으로 인식 가능.
        let centerPoint: { x: number; y: number } | null = null;
        if (draggingL1NodeId) {
          for (const el of elements) {
            const em = (el as { worksheetMeta?: { componentId?: string; mindMapParentId?: string; mindMapNodeId?: string } }).worksheetMeta;
            if (em?.componentId !== sameCompId) continue;
            if (em?.mindMapParentId === draggingL1NodeId && "x" in el && "y" in el && "w" in el && "h" in el) {
              const e = el as { x: number; y: number; w: number; h: number };
              l1ChildCenters.push({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
            }
            if (em?.mindMapNodeId === "center" && "x" in el && "y" in el && "w" in el && "h" in el) {
              const e = el as { x: number; y: number; w: number; h: number };
              centerPoint = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
            }
          }
        }

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
          // labelId 연동 (기존 로직)
          if (hasLabel && element.id === (targetElement as { labelId: string }).labelId && element.type === "text") {
            return {
              ...element,
              x: element.x + deltaX,
              y: element.y + deltaY,
            };
          }
          // 1차 노드 드래그: 이 L1에 속한 2차 노드 도형을 같은 delta로 이동
          if (
            draggingL1NodeId &&
            element.worksheetMeta?.componentId === sameCompId &&
            element.worksheetMeta?.mindMapParentId === draggingL1NodeId &&
            "x" in element && "y" in element
          ) {
            return {
              ...element,
              x: (element as { x: number }).x + deltaX,
              y: (element as { y: number }).y + deltaY,
            };
          }
          // 마인드맵 연결선 추종: 같은 컴포넌트의 line만 매칭 (인접 마인드맵 간 간섭 방지)
          if (hasMindMap && (element.type === "line" || element.type === "arrow") &&
            element.worksheetMeta?.componentId === targetElement.worksheetMeta?.componentId) {
            const line = element as { start: { x: number; y: number }; end: { x: number; y: number } };
            const oldCenterX = targetElement.x + targetElement.w / 2;
            const oldCenterY = targetElement.y + targetElement.h / 2;
            const tolerance = Math.max(targetElement.w, targetElement.h) / 2;
            const childTol = 6;
            const centerTol = 8;
            let changed = false;
            let newStart = line.start;
            let newEnd = line.end;
            const startOnThis = Math.abs(line.start.x - oldCenterX) < tolerance && Math.abs(line.start.y - oldCenterY) < tolerance;
            const endOnThis = Math.abs(line.end.x - oldCenterX) < tolerance && Math.abs(line.end.y - oldCenterY) < tolerance;
            if (startOnThis) { newStart = { x: nodeCenterX, y: nodeCenterY }; changed = true; }
            if (endOnThis) { newEnd = { x: nodeCenterX, y: nodeCenterY }; changed = true; }
            // 자식(L2) 끝점과 일치하면 delta만큼 함께 이동 (center→L1 라인에는 해당 없음)
            for (const c of l1ChildCenters) {
              if (!startOnThis && Math.abs(line.start.x - c.x) < childTol && Math.abs(line.start.y - c.y) < childTol) {
                newStart = { x: line.start.x + deltaX, y: line.start.y + deltaY };
                changed = true;
              }
              if (!endOnThis && Math.abs(line.end.x - c.x) < childTol && Math.abs(line.end.y - c.y) < childTol) {
                newEnd = { x: line.end.x + deltaX, y: line.end.y + deltaY };
                changed = true;
              }
            }
            // 컴팩트 모드(1차 7+): L2 도형 요소가 없어 l1ChildCenters가 비었을 수 있다.
            // "이 라인의 한쪽이 L1 중심에 붙어 있고 + 반대쪽은 center도 아닌 경우" → 반대쪽은 L2 가지선 끝.
            // 그 끝점을 delta만큼 이동시켜 가지선이 L1과 함께 이동하게 한다.
            if (draggingL1NodeId && centerPoint) {
              const otherEndIsCenter = (p: { x: number; y: number }) =>
                Math.abs(p.x - centerPoint!.x) < centerTol && Math.abs(p.y - centerPoint!.y) < centerTol;
              if (startOnThis && !endOnThis && !otherEndIsCenter(line.end)) {
                newEnd = { x: line.end.x + deltaX, y: line.end.y + deltaY };
                changed = true;
              }
              if (endOnThis && !startOnThis && !otherEndIsCenter(line.start)) {
                newStart = { x: line.start.x + deltaX, y: line.start.y + deltaY };
                changed = true;
              }
            }
            if (changed) return { ...element, start: newStart, end: newEnd };
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
      // 크롭 모드에서는 imageBox를 useRoundBoxInteraction이 직접 관리하므로
      // 여기서 imageBox를 리셋/스케일하지 않는다.
      if (activeInteraction.isCrop) {
        updateElement(elementId, {
          x: nextRect.x,
          y: nextRect.y,
          w: nextRect.width,
          h: nextRect.height,
        });
        setActivePreview({ id: elementId, rect: nextRect });
        return;
      }
      // 크롭 포인트 고정 + 요소 크기 비율대로 imageBox 스케일
      const startBox = activeInteraction.startImageBox ?? (targetElement as ShapeElement).imageBox;
      const startW = activeInteraction.startRect?.width ?? nextRect.width;
      const startH = activeInteraction.startRect?.height ?? nextRect.height;
      const scaleX = startW > 0 ? nextRect.width / startW : 1;
      const scaleY = startH > 0 ? nextRect.height / startH : 1;
      const imageBox = startBox
        ? { x: startBox.x * scaleX, y: startBox.y * scaleY, w: startBox.w * scaleX, h: startBox.h * scaleY }
        : { x: 0, y: 0, w: nextRect.width, h: nextRect.height };
      updateElement(elementId, {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
        imageBox,
      });
      setActivePreview({ id: elementId, rect: nextRect });
      return;
    }

    // 표/자유형처럼 x/y로 위치를 관리하는 요소는 드래그/리사이즈 중에도 실시간으로 좌표를 반영한다.
    if (targetElement?.type === "table" || targetElement?.type === "freeform") {
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
    context?: { type: "drag" | "resize"; handle?: ResizeHandle; isCrop?: boolean },
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
        isCrop: context?.isCrop ?? false,
        startRect,
        startFontSize:
          targetElement && targetElement.type === "text"
            ? targetElement.style.fontSize
            : undefined,
        handle,
        startImageBox:
          targetElement && isImageFillElement(targetElement)
            ? (targetElement as ShapeElement).imageBox
            : undefined,
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

      // 이미지 요소를 imageSlot 위에 드래그했으면 슬롯에 이미지 흡수
      if (
        context?.type === "drag" &&
        targetElement &&
        isImageFillElement(targetElement) &&
        (targetElement as ShapeElement).isStandaloneImage &&
        onElementsChange
      ) {
        const dragCenterX = finalRect.x + finalRect.width / 2;
        const dragCenterY = finalRect.y + finalRect.height / 2;
        const imageSlot = elements.find((el) => {
          if (el.id === elementId) return false;
          const isSlot =
            (el.type === "rect" ||
              el.type === "roundRect" ||
              el.type === "ellipse" ||
              el.type === "mosaic" ||
              el.type === "circleMosaic") &&
            (el as ShapeElement).subType === "imageSlot";
          if (!isSlot) return false;
          return (
            dragCenterX >= el.x &&
            dragCenterX <= el.x + el.w &&
            dragCenterY >= el.y &&
            dragCenterY <= el.y + el.h
          );
        });
        if (imageSlot) {
          const imgFill = (targetElement as ShapeElement).fill ?? "";
          const nextElements = elements
            .filter((el) => el.id !== elementId)
            .map((el) => {
              if (el.id !== imageSlot.id) return el;
              const slot = el as ShapeElement;
              return {
                ...slot,
                fill: imgFill,
                imageBox: { x: 0, y: 0, w: slot.w, h: slot.h },
                text: "",
              };
            });
          onElementsChange(nextElements);
          activeInteractionRef.current = null;
          setActivePreview(null);
          smartGuides.clear();
          onInteractionChange?.(false, context);
          return;
        }
      }

      if (
        targetElement &&
        isEmotionSlotShape(targetElement) &&
        (context?.type === "drag" || context?.type === "resize")
      ) {
        // handleRectChange에서 이동/리사이즈 중 이미 실시간 업데이트가 적용되므로
        // 종료 시점에서는 중복 호출하지 않고 정리만 수행한다.
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
          isResize &&
          !activeInteraction?.isCrop
        ) {
          const finalStartBox = activeInteraction?.startImageBox ?? (targetElement as ShapeElement).imageBox;
          const finalStartW = activeInteraction?.startRect?.width ?? finalRect.width;
          const finalStartH = activeInteraction?.startRect?.height ?? finalRect.height;
          const finalScaleX = finalStartW > 0 ? finalRect.width / finalStartW : 1;
          const finalScaleY = finalStartH > 0 ? finalRect.height / finalStartH : 1;
          updates.imageBox = finalStartBox
            ? { x: finalStartBox.x * finalScaleX, y: finalStartBox.y * finalScaleY, w: finalStartBox.w * finalScaleX, h: finalStartBox.h * finalScaleY }
            : { x: 0, y: 0, w: finalRect.width, h: finalRect.height };
        }
        const labelId =
          targetElement &&
          (targetElement.type === "rect" ||
            targetElement.type === "roundRect" ||
            targetElement.type === "ellipse" ||
            targetElement.type === "mosaic" ||
            targetElement.type === "circleMosaic")
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
                element.type === "ellipse" ||
                element.type === "mosaic" ||
                element.type === "circleMosaic"
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
