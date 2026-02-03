import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
  ResizeHandle,
} from "../../model/canvasTypes";
import SmartGuideOverlay from "./SmartGuideOverlay";
import {
  DesignPaperContextMenu,
  type ContextMenuState,
  type LayerDirection,
} from "./DesignPaperContextMenu";
import {
  GroupSelectionOverlay,
  SelectionRectOverlay,
} from "./DesignPaperOverlays";
import { useSmartGuides } from "../../model/useSmartGuides";
import Arrow from "./template_component/arrow/Arrow";
import CircleBox from "./template_component/circle/CircleBox";
import Line from "./template_component/line/Line";
import RoundBox from "./template_component/round_box/RoundBox";
import TextBox from "./template_component/text/TextBox";
import { stripStyleTags } from "./template_component/text/textContentUtils";
import { useSideBarStore } from "../../store/sideBarStore";
import { useFontStore } from "../../store/fontStore";
import { getFontLabel, normalizeFontWeight } from "../../utils/fontOptions";
import { useDesignPaperClipboard } from "./hooks/useDesignPaperClipboard";
import { useDesignPaperGroupDrag } from "./hooks/useDesignPaperGroupDrag";
import { useDesignPaperKeyboard } from "./hooks/useDesignPaperKeyboard";
import { useDesignPaperPaste } from "./hooks/useDesignPaperPaste";
import { useDesignPaperStageActions } from "./hooks/useDesignPaperStageActions";
import { useEmotionSlotBindings } from "./hooks/useEmotionSlotBindings";
import {
  DEFAULT_STROKE,
  getRectFromElement,
  isEditableTarget,
  isEmotionSlotShape,
  type SelectionRect,
  type Rect,
} from "../../utils/designPaperUtils";
import type { DesignPaperStageActions } from "../../types/stageActions";
import { getSelectionRenderState } from "../../utils/selectionState";

interface DesignPaperProps {
  pageId: string;
  orientation: "horizontal" | "vertical";
  elements: CanvasElement[];
  selectedIds?: string[];
  editingTextId?: string | null;
  selectionRect?: SelectionRect | null;
  previewSelectedIds?: string[] | null;
  stageActionsRef?: MutableRefObject<DesignPaperStageActions | null>;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  onInteractionChange?: (
    isActive: boolean,
    context?: { type: "drag" | "resize" },
  ) => void;
  readOnly?: boolean;
  className?: string;
  showShadow?: boolean;
}

type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};
type ShapeBorderPatch = Partial<ShapeElement["border"]>;
type ShapeElementPatch = Omit<Partial<ShapeElement>, "border"> & {
  border?: ShapeBorderPatch;
};
type LineStrokePatch = Partial<LineElement["stroke"]>;
type LineElementPatch = Omit<Partial<LineElement>, "stroke"> & {
  stroke?: LineStrokePatch;
};
type ElementPatch =
  | TextElementPatch
  | ShapeElementPatch
  | LineElementPatch
  | Partial<CanvasElement>;
type Point = LineElement["start"];

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;
const PAGE_WIDTH_PX = mmToPx(210);
const PAGE_HEIGHT_PX = mmToPx(297);
const GUIDE_THRESHOLD_PX = 6;
const SNAP_THRESHOLD_PX = 3;

const DesignPaper = ({
  pageId,
  orientation,
  elements,
  selectedIds = [],
  editingTextId = null,
  selectionRect = null,
  previewSelectedIds = null,
  stageActionsRef,
  onElementsChange,
  onSelectedIdsChange,
  onEditingTextIdChange,
  onInteractionChange,
  readOnly = false,
  className,
  showShadow = false,
}: DesignPaperProps) => {
  const setSideBarMenu = useSideBarStore((state) => state.setSelectedMenu);
  const setFontPanel = useFontStore((state) => state.setPanelFont);
  const [activePreview, setActivePreview] = useState<{
    id: string;
    rect: Rect;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingShapeTextId, setEditingShapeTextId] = useState<string | null>(
    null,
  );
  const [isRotating, setIsRotating] = useState(false);
  const [rotationBadge, setRotationBadge] = useState<{
    elementId: string;
    rotationDeg: number;
  } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const rotationStateRef = useRef<{
    elementId: string;
    startRotation: number;
    startPointerAngle: number;
  } | null>(null);
  const activeInteractionRef = useRef<{
    id: string;
    type: "drag" | "resize";
    startRect?: Rect;
    startFontSize?: number;
    handle?: ResizeHandle;
  } | null>(null);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontal = orientation === "horizontal";
  const pageWidth = isHorizontal ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
  const pageHeight = isHorizontal ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
  const smartGuides = useSmartGuides({
    canvasWidth: pageWidth,
    canvasHeight: pageHeight,
    threshold: GUIDE_THRESHOLD_PX,
    snapThreshold: SNAP_THRESHOLD_PX,
  });

  useLayoutEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (readOnly) return;
    if (editingTextId) return;
    if (selectedIds.length === 0) return;
    const frame = requestAnimationFrame(() => {
      containerRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [editingTextId, readOnly, selectedIds]);

  const clearContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);
  useDesignPaperStageActions({
    stageActionsRef,
    clearContextMenu,
    setEditingImageId,
    setEditingShapeTextId,
  });

  const getContainerScale = () => {
    const node = containerRef.current;
    if (!node) return 1;
    const rect = node.getBoundingClientRect();
    return node.offsetWidth ? rect.width / node.offsetWidth : 1;
  };

  const getPointerPosition = (
    event: PointerEvent | ReactPointerEvent<HTMLElement>,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = getContainerScale();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };

  const getRotatedCorners = (rect: Rect, rotationDeg: number) => {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];
    return corners.map((pt) => ({
      x: cx + pt.x * cos - pt.y * sin,
      y: cy + pt.x * sin + pt.y * cos,
    }));
  };

  const getBottomCenterAnchor = (
    rect: Rect,
    rotationDeg: number,
    offset: number,
  ) => {
    const corners = getRotatedCorners(rect, rotationDeg);
    const xs = corners.map((pt) => pt.x);
    const ys = corners.map((pt) => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: (minX + maxX) / 2,
      y: maxY + offset,
    };
  };

  const getRotatedLocalAnchor = (
    rect: Rect,
    rotationDeg: number,
    ax: number,
    ay: number,
  ) => {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + ax * cos - ay * sin,
      y: cy + ax * sin + ay * cos,
    };
  };

  const startShapeRotation = (
    event: ReactPointerEvent<HTMLButtonElement>,
    element: ShapeElement,
    rect: Rect,
  ) => {
    if (element.locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const pointer = getPointerPosition(event);
    const startPointerAngle = Math.atan2(
      pointer.y - center.y,
      pointer.x - center.x,
    );
    const startRotation = element.transform?.rotation ?? 0;
    rotationStateRef.current = {
      elementId: element.id,
      startRotation,
      startPointerAngle,
    };
    setIsRotating(true);
    setRotationBadge({
      elementId: element.id,
      rotationDeg: startRotation,
    });
    onInteractionChange?.(true, { type: "drag" });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!rotationStateRef.current) return;
      const currentPointer = getPointerPosition(moveEvent);
      const currentAngle = Math.atan2(
        currentPointer.y - center.y,
        currentPointer.x - center.x,
      );
      const deltaRad =
        currentAngle - rotationStateRef.current.startPointerAngle;
      const deltaDeg = (deltaRad * 180) / Math.PI;
      const nextRotation =
        (rotationStateRef.current.startRotation + deltaDeg + 360) % 360;
      updateElement(element.id, {
        transform: {
          ...(element.transform ?? {}),
          rotation: Math.round(nextRotation),
        },
      });
      setRotationBadge({
        elementId: element.id,
        rotationDeg: nextRotation,
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      rotationStateRef.current = null;
      setIsRotating(false);
      setRotationBadge(null);
      onInteractionChange?.(false, { type: "drag" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const updateElement = useCallback(
    (id: string, patch: ElementPatch) => {
      if (readOnly || !onElementsChange) return;
      const nextElements = elements.map((element): CanvasElement => {
        if (element.id !== id) return element;
        if (element.type === "text" && "style" in patch) {
          const nextStyle = {
            ...element.style,
            ...(patch as TextElementPatch).style,
          };
          return {
            ...element,
            ...patch,
            style: nextStyle,
          };
        }
        if (
          (element.type === "rect" ||
            element.type === "roundRect" ||
            element.type === "ellipse") &&
          "border" in patch
        ) {
          const baseBorder = element.border ?? {
            enabled: false,
            color: "#000000",
            width: 2,
            style: "solid",
          };
          const patchBorder = (patch as ShapeElementPatch).border;
          const nextBorder: ShapeElement["border"] = patchBorder
            ? {
                ...baseBorder,
                ...patchBorder,
              }
            : element.border;
          return {
            ...element,
            ...patch,
            border: nextBorder,
          };
        }
        if (
          (element.type === "line" || element.type === "arrow") &&
          "stroke" in patch
        ) {
          const baseStroke = element.stroke ?? DEFAULT_STROKE;
          const patchStroke = (patch as LineElementPatch).stroke;
          const nextStroke = patchStroke
            ? {
                ...baseStroke,
                ...patchStroke,
              }
            : baseStroke;
          return {
            ...element,
            ...patch,
            stroke: nextStroke,
          };
        }
        return { ...element, ...patch } as CanvasElement;
      });
      onElementsChange(nextElements);
    },
    [elements, onElementsChange, readOnly],
  );

  const {
    emotionSlotTextIds,
    findEmotionPlaceholderId,
    findEmotionLabelId,
    applyEmotionSlotRectUpdate,
    clearEmotionSlotImage,
  } = useEmotionSlotBindings({
    elements,
    readOnly,
    selectedIds,
    editingTextId,
    onElementsChange,
    onEditingTextIdChange,
    updateElement,
  });

  const { copySelectedElements, pasteElements, getClipboard } =
    useDesignPaperClipboard({
      pageId,
      elements,
      selectedIdsRef,
      onElementsChange,
      onSelectedIdsChange,
      readOnly,
      clearContextMenu,
    });

  const {
    groupDragRef,
    buildGroupDragState,
    getGroupBoundingBox,
    applyGroupDelta,
  } = useDesignPaperGroupDrag({
    elements,
    selectedIds,
    selectedIdsRef,
    readOnly,
    onElementsChange,
    findEmotionPlaceholderId,
    findEmotionLabelId,
  });

  useDesignPaperKeyboard({
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
  });

  useDesignPaperPaste({
    readOnly,
    elements,
    onElementsChange,
    selectedIdsRef,
    onSelectedIdsChange,
    onEditingTextIdChange,
    containerRef,
    lastPointerRef,
  });

  const getRenderableRect = (element: CanvasElement) => {
    if (activePreview?.id === element.id) return activePreview.rect;
    return getRectFromElement(element);
  };

  const getTargetRects = (activeId: string, excludeIds?: Set<string>) =>
    elements
      .filter(
        (element) =>
          element.id !== activeId &&
          element.visible !== false &&
          !element.locked &&
          !excludeIds?.has(element.id),
      )
      .map((element) => getRectFromElement(element))
      .filter((rect): rect is Rect => Boolean(rect));

  const getGroupDragBoundingBox = (elementId: string, nextRect: Rect) => {
    const groupDrag = groupDragRef.current;
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
      } else {
        const minX = Math.min(item.line.start.x, item.line.end.x) + delta.x;
        const minY = Math.min(item.line.start.y, item.line.end.y) + delta.y;
        const width = Math.max(
          Math.abs(item.line.end.x - item.line.start.x),
          1,
        );
        const height = Math.max(
          Math.abs(item.line.end.y - item.line.start.y),
          1,
        );
        rects.push({
          x: minX,
          y: minY,
          width,
          height,
        });
      }
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
        // 텍스트 자동 리사이즈 시 중심축을 유지하기 위해 x 좌표도 반영한다.
        updates.x = nextRect.x;
        updates.y = nextRect.y;
      }

      // 이미지가 있는 요소의 경우 imageBox 비율을 유지하며 업데이트
      if (
        targetElement &&
        (targetElement.type === "rect" ||
          targetElement.type === "roundRect" ||
          targetElement.type === "ellipse") &&
        targetElement.fill &&
        (targetElement.fill.startsWith("url(") ||
          targetElement.fill.startsWith("data:"))
      ) {
        const oldImageBox = targetElement.imageBox;
        if (oldImageBox) {
          // 기존 imageBox의 비율 유지
          const imageAspectRatio = oldImageBox.w / oldImageBox.h;
          const newElementAspectRatio = nextRect.width / nextRect.height;

          let newBoxW: number;
          let newBoxH: number;

          if (imageAspectRatio > newElementAspectRatio) {
            // 이미지가 더 넓음 - 높이를 맞추고 좌우 잘림
            newBoxH = nextRect.height;
            newBoxW = nextRect.height * imageAspectRatio;
          } else {
            // 이미지가 더 높음 - 너비를 맞추고 상하 잘림
            newBoxW = nextRect.width;
            newBoxH = nextRect.width / imageAspectRatio;
          }

          updates.imageBox = {
            x: (nextRect.width - newBoxW) / 2,
            y: (nextRect.height - newBoxH) / 2,
            w: newBoxW,
            h: newBoxH,
          };
        } else {
          // imageBox가 없으면 요소 크기로 초기화
          updates.imageBox = {
            x: 0,
            y: 0,
            w: nextRect.width,
            h: nextRect.height,
          };
        }
      }

      updateElement(elementId, updates);
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

    // Shape 요소의 resize 중 이미지가 있으면 실시간으로 imageBox 비율 유지하며 업데이트
    if (
      activeInteraction.type === "resize" &&
      targetElement &&
      (targetElement.type === "rect" ||
        targetElement.type === "roundRect" ||
        targetElement.type === "ellipse") &&
      targetElement.fill &&
      (targetElement.fill.startsWith("url(") ||
        targetElement.fill.startsWith("data:"))
    ) {
      const oldImageBox = targetElement.imageBox;
      let newImageBox: { x: number; y: number; w: number; h: number };

      if (oldImageBox) {
        // 기존 imageBox의 비율 유지
        const imageAspectRatio = oldImageBox.w / oldImageBox.h;
        const newElementAspectRatio = nextRect.width / nextRect.height;

        let newBoxW: number;
        let newBoxH: number;

        if (imageAspectRatio > newElementAspectRatio) {
          // 이미지가 더 넓음 - 높이를 맞추고 좌우 잘림
          newBoxH = nextRect.height;
          newBoxW = nextRect.height * imageAspectRatio;
        } else {
          // 이미지가 더 높음 - 너비를 맞추고 상하 잘림
          newBoxW = nextRect.width;
          newBoxH = nextRect.width / imageAspectRatio;
        }

        newImageBox = {
          x: (nextRect.width - newBoxW) / 2,
          y: (nextRect.height - newBoxH) / 2,
          w: newBoxW,
          h: newBoxH,
        };
      } else {
        // imageBox가 없으면 요소 크기로 초기화
        newImageBox = {
          x: 0,
          y: 0,
          w: nextRect.width,
          h: nextRect.height,
        };
      }

      updateElement(elementId, {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
        imageBox: newImageBox,
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
      onInteractionChange?.(true, context);
      return;
    }
    const hadGroupDrag = groupDragRef.current?.activeId === elementId;
    if (hadGroupDrag) {
      groupDragRef.current = null;
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

        // 이미지가 있는 요소의 경우 imageBox 비율을 유지하며 업데이트
        if (
          targetElement &&
          (targetElement.type === "rect" ||
            targetElement.type === "roundRect" ||
            targetElement.type === "ellipse") &&
          targetElement.fill &&
          (targetElement.fill.startsWith("url(") ||
            targetElement.fill.startsWith("data:")) &&
          isResize
        ) {
          const oldImageBox = targetElement.imageBox;
          if (oldImageBox) {
            // 기존 imageBox의 비율 유지
            const imageAspectRatio = oldImageBox.w / oldImageBox.h;
            const newElementAspectRatio = finalRect.width / finalRect.height;

            let newBoxW: number;
            let newBoxH: number;

            if (imageAspectRatio > newElementAspectRatio) {
              // 이미지가 더 넓음 - 높이를 맞추고 좌우 잘림
              newBoxH = finalRect.height;
              newBoxW = finalRect.height * imageAspectRatio;
            } else {
              // 이미지가 더 높음 - 너비를 맞추고 상하 잘림
              newBoxW = finalRect.width;
              newBoxH = finalRect.width / imageAspectRatio;
            }

            updates.imageBox = {
              x: (finalRect.width - newBoxW) / 2,
              y: (finalRect.height - newBoxH) / 2,
              w: newBoxW,
              h: newBoxH,
            };
          } else {
            // imageBox가 없으면 요소 크기로 초기화
            updates.imageBox = {
              x: 0,
              y: 0,
              w: finalRect.width,
              h: finalRect.height,
            };
          }
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

    // 스마트 가이드 적용
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
      // 리사이즈 시: 움직이는 끝점만 스냅
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
          groupDrag ? new Set(groupDrag.items.keys()) : undefined,
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
      // 드래그 시: 중앙점만 스냅
      const activeX = [centerX];
      const activeY = [centerY];

      const { snapOffset } = smartGuides.compute({
        activeRect: lineRect,
        otherRects: getTargetRects(
          elementId,
          groupDrag ? new Set(groupDrag.items.keys()) : undefined,
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

  const handleSelect = (
    elementId: string,
    options?: { keepContextMenu?: boolean; additive?: boolean },
  ) => {
    if (readOnly) return;
    const currentSelectedIds = selectedIdsRef.current;
    const selectedElement = elements.find(
      (element) => element.id === elementId,
    );
    if (
      !selectedElement ||
      selectedElement.selectable === false ||
      selectedElement.locked
    )
      return;
    const groupedIds =
      selectedElement.groupId != null
        ? elements
            .filter(
              (element) =>
                element.groupId === selectedElement.groupId &&
                element.selectable !== false,
            )
            .map((element) => element.id)
        : [elementId];
    const orderedGroupedIds =
      selectedElement?.groupId != null
        ? [elementId, ...groupedIds.filter((id) => id !== elementId)]
        : [elementId];
    const baseIds = options?.additive ? currentSelectedIds : [];
    const nextSelectedIds = [
      ...orderedGroupedIds,
      ...baseIds.filter((id) => !orderedGroupedIds.includes(id)),
    ];
    selectedIdsRef.current = nextSelectedIds;
    onSelectedIdsChange?.(nextSelectedIds);
    if (selectedElement && isEmotionSlotShape(selectedElement)) {
      setSideBarMenu("emotion");
    }
    if (editingImageId && editingImageId !== elementId) {
      setEditingImageId(null);
    }
    if (editingShapeTextId && editingShapeTextId !== elementId) {
      setEditingShapeTextId(null);
    }
    if (editingTextId && editingTextId !== elementId) {
      onEditingTextIdChange?.(null);
    }
    if (!options?.keepContextMenu) {
      setContextMenu(null);
    }
    // 키보드 조작을 위해 캔버스에 포커스를 준다.
    containerRef.current?.focus();
  };

  const openContextMenu = (
    event: ReactMouseEvent<HTMLElement>,
    elementId: string,
  ) => {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    const targetElement = elements.find((element) => element.id === elementId);
    if (!targetElement || targetElement.selectable === false) return;
    if (!selectedIdsRef.current.includes(elementId)) {
      handleSelect(elementId, { keepContextMenu: true });
    }
    const rect = containerRef.current?.getBoundingClientRect();
    const rawX = event.clientX - (rect?.left ?? 0);
    const rawY = event.clientY - (rect?.top ?? 0);
    const menuWidth = 220;
    const menuHeight = 4 * 36 + 8;
    const clampedX = Math.min(
      Math.max(rawX, 8),
      Math.max(8, pageWidth - menuWidth),
    );
    const clampedY = Math.min(
      Math.max(rawY, 8),
      Math.max(8, pageHeight - menuHeight),
    );
    setContextMenu({
      x: clampedX,
      y: clampedY,
      target: { type: "element", id: elementId },
    });
  };

  const openCanvasContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const rawX = event.clientX - (rect?.left ?? 0);
    const rawY = event.clientY - (rect?.top ?? 0);
    const menuWidth = 220;
    const menuHeight = 36 + 8;
    const clampedX = Math.min(
      Math.max(rawX, 8),
      Math.max(8, pageWidth - menuWidth),
    );
    const clampedY = Math.min(
      Math.max(rawY, 8),
      Math.max(8, pageHeight - menuHeight),
    );
    const scale = getContainerScale();
    const pastePosition = {
      x: rawX / scale,
      y: rawY / scale,
    };
    setContextMenu({
      x: clampedX,
      y: clampedY,
      target: { type: "canvas", pastePosition },
    });
  };

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

  // 연결된 labelId를 포함한 삭제 대상 ID 수집
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

  const {
    isGroupedSelection,
    canGroupSelection,
    canUngroupSelection,
    shouldShowIndividualBorder,
  } = getSelectionRenderState({
    elements,
    selectedIds,
    previewSelectedIds,
  });

  const handleSelectChange = (
    elementId: string,
    isSelected: boolean,
    options?: { keepContextMenu?: boolean; additive?: boolean },
  ) => {
    if (isSelected) {
      handleSelect(elementId, options);
    }
  };

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
      getGroupDragBoundingBox(elementId, nextRect) ??
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

  const renderTextElement = (element: TextElement) => {
    const showToolbar =
      selectedIds[0] === element.id && selectedIds.length === 1;
    const isEditing = editingTextId === element.id;
    const isEmotionSlotText = emotionSlotTextIds.has(element.id);
    const forceEditable = isEmotionSlotText && isEditing;
    const locked =
      readOnly ||
      (element.locked && !forceEditable) ||
      (isEmotionSlotText && !isEditing);
    const rect = getRenderableRect(element);
    if (!rect) return null;
    const minFontSize = 12;
    const maxFontSize = 120;
    const clampFontSize = (value: number) =>
      Math.min(maxFontSize, Math.max(minFontSize, value));
    const lineHeight = element.style.lineHeight ?? 1.3;
    const letterSpacing = element.style.letterSpacing ?? 0;
    const fontWeight = normalizeFontWeight(element.style.fontWeight);
    const minTextHeight = element.lockHeight ? rect.height : 1;
    return (
      <TextBox
        key={element.id}
        text={element.text}
        richText={element.richText}
        editable={!readOnly && (!element.locked || forceEditable)}
        rect={rect}
        minWidth={1}
        minHeight={minTextHeight}
        clipOverflow={readOnly && Boolean(element.lockHeight)}
        showChrome={!isEmotionSlotText}
        textClassName="text-headline-42-semibold"
        textStyle={{
          fontSize: `${element.style.fontSize}px`,
          fontWeight,
          fontFamily: element.style.fontFamily,
          fontStyle: element.style.italic ? "italic" : "normal",
          color: element.style.color,
          textDecoration:
            [
              element.style.underline ? "underline" : null,
              element.style.strikethrough ? "line-through" : null,
            ]
              .filter(Boolean)
              .join(" ") || "none",
          lineHeight,
          letterSpacing,
        }}
        textAlign={element.style.alignX}
        textAlignY={element.style.alignY}
        isSelected={shouldShowIndividualBorder(element.id)}
        isEditing={isEditing}
        locked={locked}
        showToolbar={showToolbar}
        widthMode={element.widthMode ?? "auto"}
        toolbar={{
          offset: mmToPx(4),
          minFontSize,
          maxFontSize,
          fontSize: element.style.fontSize,
          lineHeight,
          letterSpacing,
          color: element.style.color,
          isBold:
            element.style.fontWeight === "bold" ||
            (typeof element.style.fontWeight === "number" &&
              element.style.fontWeight >= 700),
          isUnderline: Boolean(element.style.underline),
          isItalic: Boolean(element.style.italic),
          isStrikethrough: Boolean(element.style.strikethrough),
          align: element.style.alignX,
          alignY: element.style.alignY,
          fontFamily: element.style.fontFamily ?? "Pretendard",
          fontLabel: getFontLabel(element.style.fontFamily ?? "Pretendard"),
          onFontFamilyClick: () => {
            setSideBarMenu("font");
            setFontPanel({
              fontFamily: element.style.fontFamily ?? "Pretendard",
              fontWeight: fontWeight,
            });
          },
          onFontSizeChange: (value) => {
            updateElement(element.id, {
              style: { fontSize: clampFontSize(value) },
            });
          },
          onFontSizeStep: (delta) => {
            updateElement(element.id, {
              style: {
                fontSize: clampFontSize(element.style.fontSize + delta),
              },
            });
          },
          onLineHeightChange: (value) => {
            updateElement(element.id, { style: { lineHeight: value } });
          },
          onLetterSpacingChange: (value) => {
            updateElement(element.id, {
              style: { letterSpacing: value },
            });
          },
          onColorChange: (color) => {
            updateElement(element.id, {
              style: { color },
              richText: element.richText
                ? stripStyleTags(element.richText, "color")
                : undefined,
            });
          },
          onToggleBold: () => {
            updateElement(element.id, {
              style: {
                fontWeight:
                  element.style.fontWeight === "bold" ? "normal" : "bold",
              },
              richText: element.richText
                ? stripStyleTags(element.richText, "bold")
                : undefined,
            });
          },
          onToggleUnderline: () => {
            updateElement(element.id, {
              style: { underline: !element.style.underline },
              richText: element.richText
                ? stripStyleTags(element.richText, "underline")
                : undefined,
            });
          },
          onToggleItalic: () => {
            updateElement(element.id, {
              style: { italic: !element.style.italic },
              richText: element.richText
                ? stripStyleTags(element.richText, "italic")
                : undefined,
            });
          },
          onToggleStrikethrough: () => {
            updateElement(element.id, {
              style: { strikethrough: !element.style.strikethrough },
              richText: element.richText
                ? stripStyleTags(element.richText, "strikethrough")
                : undefined,
            });
          },
          onAlignChange: (align) => {
            updateElement(element.id, { style: { alignX: align } });
          },
          onAlignYChange: (alignY) => {
            updateElement(element.id, { style: { alignY } });
          },
        }}
        onTextChange={(nextText, nextRichText) => {
          updateElement(element.id, { text: nextText, richText: nextRichText });
        }}
        onRectChange={
          isEmotionSlotText
            ? undefined
            : (nextRect) => {
                handleRectChange(element.id, nextRect);
              }
        }
        onWidthModeChange={(mode) => {
          updateElement(element.id, { widthMode: mode });
        }}
        onDragStateChange={(isDragging, finalRect, context) => {
          handleDragStateChange(element.id, isDragging, finalRect, context);
        }}
        onSelectChange={(isSelected, options) => {
          handleSelectChange(element.id, isSelected, options);
        }}
        onContextMenu={(event) => {
          openContextMenu(event, element.id);
        }}
        onStartEditing={() => onEditingTextIdChange?.(element.id)}
        onFinishEditing={() => onEditingTextIdChange?.(null)}
        onRequestDelete={() => {
          deleteElementById(element.id);
        }}
        transformRect={(nextRect, context) =>
          transformElementRect(element.id, nextRect, context)
        }
      />
    );
  };

  const renderShapeElement = (element: ShapeElement) => {
    const rect = getRenderableRect(element);
    if (!rect) return null;
    const isSelected = selectedIds.includes(element.id);
    const radius =
      element.type === "ellipse"
        ? Math.min(rect.width, rect.height) / 2
        : (element.radius ?? 0);
    const isImageFill =
      element.fill.startsWith("url(") || element.fill.startsWith("data:");
    const isImageEditing =
      isImageFill && editingImageId === element.id && isSelected;
    const imageBox = element.imageBox;

    const ShapeComponent = element.type === "ellipse" ? CircleBox : RoundBox;
    const handleImageBoxChange =
      readOnly || element.locked || !isImageFill
        ? undefined
        : (value: { x: number; y: number; w: number; h: number }) => {
            updateElement(element.id, { imageBox: value });
          };

    const isShapeTextEditing = editingShapeTextId === element.id;

    // Transform 핸들러
    const handleFlipX =
      readOnly || element.locked
        ? undefined
        : () => {
            const currentTransform = element.transform ?? {};
            updateElement(element.id, {
              transform: {
                ...currentTransform,
                flipX: !currentTransform.flipX,
              },
            });
          };

    const handleFlipY =
      readOnly || element.locked
        ? undefined
        : () => {
            const currentTransform = element.transform ?? {};
            updateElement(element.id, {
              transform: {
                ...currentTransform,
                flipY: !currentTransform.flipY,
              },
            });
          };

    const getLatestElement = () =>
      elements.find((el) => el.id === element.id) ?? element;

    const handleRotateCW =
      readOnly || element.locked
        ? undefined
        : () => {
            const latest = getLatestElement();
            const currentTransform =
              "transform" in latest ? (latest.transform ?? {}) : {};
            const currentRotation = currentTransform.rotation ?? 0;
            const newRotation = (currentRotation + 1) % 360;
            updateElement(element.id, {
              transform: { ...currentTransform, rotation: newRotation },
            });
          };

    const handleRotateCCW =
      readOnly || element.locked
        ? undefined
        : () => {
            const latest = getLatestElement();
            const currentTransform =
              "transform" in latest ? (latest.transform ?? {}) : {};
            const currentRotation = currentTransform.rotation ?? 0;
            const newRotation = (currentRotation - 1 + 360) % 360;
            updateElement(element.id, {
              transform: { ...currentTransform, rotation: newRotation },
            });
          };

    return (
      <ShapeComponent
        key={element.id}
        rect={rect}
        minWidth={1}
        minHeight={1}
        borderRadius={radius}
        fill={element.fill}
        imageBox={imageBox}
        border={element.border}
        text={element.text}
        textStyle={element.textStyle}
        isSelected={shouldShowIndividualBorder(element.id)}
        isImageEditing={isImageEditing}
        isTextEditing={isShapeTextEditing}
        locked={readOnly || element.locked}
        selectable={element.selectable !== false && !element.locked}
        onImageEditingChange={(isEditing: boolean) => {
          setEditingImageId(isEditing ? element.id : null);
        }}
        onTextEditingChange={(isEditing: boolean) => {
          setEditingShapeTextId(isEditing ? element.id : null);
        }}
        onTextChange={(text: string) => {
          updateElement(element.id, { text });
        }}
        onImageBoxChange={handleImageBoxChange}
        onImageDrop={
          readOnly || element.locked
            ? undefined
            : (imageUrl) => {
                updateElement(element.id, {
                  fill: imageUrl.startsWith("url(")
                    ? imageUrl
                    : `url(${imageUrl})`,
                  imageBox: {
                    x: 0,
                    y: 0,
                    w: rect.width,
                    h: rect.height,
                  },
                });
              }
        }
        onRectChange={(nextRect) => {
          handleRectChange(element.id, nextRect);
        }}
        onDragStateChange={(isDragging, finalRect, context) => {
          handleDragStateChange(element.id, isDragging, finalRect, context);
        }}
        onSelectChange={(isSelected, options) => {
          handleSelectChange(element.id, isSelected, options);
        }}
        onContextMenu={(event) => {
          openContextMenu(event, element.id);
        }}
        transformRect={(nextRect, context) =>
          transformElementRect(element.id, nextRect, context)
        }
        transform={element.transform}
        onFlipX={handleFlipX}
        onFlipY={handleFlipY}
        onRotateCW={handleRotateCW}
        onRotateCCW={handleRotateCCW}
        onRotationChange={undefined}
        showInlineMetrics={false}
      />
    );
  };

  const renderLineElement = (element: LineElement) => {
    const stroke = element.stroke ?? DEFAULT_STROKE;

    // Transform 핸들러
    const handleFlipX =
      readOnly || element.locked
        ? undefined
        : () => {
            const currentTransform = element.transform ?? {};
            updateElement(element.id, {
              transform: {
                ...currentTransform,
                flipX: !currentTransform.flipX,
              },
            });
          };

    const handleFlipY =
      readOnly || element.locked
        ? undefined
        : () => {
            const currentTransform = element.transform ?? {};
            updateElement(element.id, {
              transform: {
                ...currentTransform,
                flipY: !currentTransform.flipY,
              },
            });
          };

    const handleRotateCW =
      readOnly || element.locked
        ? undefined
        : () => {
            const currentTransform = element.transform ?? {};
            const currentRotation = currentTransform.rotation ?? 0;
            const newRotation = (currentRotation + 90) % 360;
            updateElement(element.id, {
              transform: { ...currentTransform, rotation: newRotation },
            });
          };

    const handleRotateCCW =
      readOnly || element.locked
        ? undefined
        : () => {
            const currentTransform = element.transform ?? {};
            const currentRotation = currentTransform.rotation ?? 0;
            const newRotation = (currentRotation - 90 + 360) % 360;
            updateElement(element.id, {
              transform: { ...currentTransform, rotation: newRotation },
            });
          };

    const sharedProps = {
      id: element.id,
      start: element.start,
      end: element.end,
      stroke,
      isSelected: shouldShowIndividualBorder(element.id),
      locked: readOnly || element.locked,
      onLineChange: (nextLine: { start: Point; end: Point }) => {
        handleLineChange(element.id, nextLine);
      },
      onDragStateChange: (
        isDragging: boolean,
        nextLine?: { start: Point; end: Point },
        context?: { type: "drag" | "resize" },
      ) => {
        handleLineDragStateChange(element.id, isDragging, nextLine, context);
      },
      onSelectChange: (
        isSelected: boolean,
        options?: { keepContextMenu?: boolean; additive?: boolean },
      ) => {
        handleSelectChange(element.id, isSelected, options);
      },
      onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
        openContextMenu(event, element.id);
      },
      transform: element.transform,
      onFlipX: handleFlipX,
      onFlipY: handleFlipY,
      onRotateCW: handleRotateCW,
      onRotateCCW: handleRotateCCW,
    };
    return element.type === "line" ? (
      <Line key={element.id} {...sharedProps} />
    ) : (
      <Arrow key={element.id} {...sharedProps} />
    );
  };

  const renderElement = (element: CanvasElement) => {
    if (element.visible === false) return null;
    switch (element.type) {
      case "text":
        return renderTextElement(element);
      case "rect":
      case "roundRect":
      case "ellipse":
        return renderShapeElement(element);
      case "line":
      case "arrow":
        return renderLineElement(element);
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={readOnly ? undefined : 0}
      className={`relative bg-white shrink-0 outline-none transition-all ${
        showShadow ? "shadow-lg" : ""
      } ${className ?? ""} ${
        isFocused && !readOnly ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{ width: pageWidth, height: pageHeight }}
      data-page-id={pageId}
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
      }}
      onKeyDown={(event) => {
        // 하단 바가 캔버스 키보드 이벤트를 처리하지 않도록 전파를 막는다.
        if (!readOnly) {
          event.stopPropagation();

          // 선택 요소 삭제 키 동작을 처리한다.
          if (
            (event.key === "Delete" || event.key === "Backspace") &&
            !editingTextId
          ) {
            // 입력 중인 텍스트 필드에서는 삭제하지 않는다.
            if (isEditableTarget(event.target)) {
              return;
            }

            const currentSelectedIds = selectedIdsRef.current;
            if (currentSelectedIds.length > 0 && onElementsChange) {
              event.preventDefault();
              onElementsChange(
                elements.filter(
                  (element) => !currentSelectedIds.includes(element.id),
                ),
              );
              selectedIdsRef.current = [];
              onSelectedIdsChange?.([]);
              onEditingTextIdChange?.(null);
            }
          }
        }
      }}
      onPointerDown={(event) => {
        if (!readOnly) {
          const container = containerRef.current;
          if (container && !isEditableTarget(event.target)) {
            container.focus();
          }
        }
      }}
      onPointerDownCapture={(event) => {
        if (!readOnly) {
          if (!isEditableTarget(event.target)) {
            containerRef.current?.focus();
          }
        }
        lastPointerRef.current = getPointerPosition(event);
      }}
      onPointerMoveCapture={(event) => {
        lastPointerRef.current = getPointerPosition(event);
      }}
      onContextMenu={openCanvasContextMenu}
    >
      {elements.map((element) => renderElement(element))}
      <SelectionRectOverlay selectionRect={selectionRect} />
      {(() => {
        if (selectedIds.length !== 1) return null;
        const element = elements.find((el) => el.id === selectedIds[0]);
        if (
          !element ||
          element.locked ||
          (element.type !== "rect" &&
            element.type !== "roundRect" &&
            element.type !== "ellipse")
        ) {
          return null;
        }
        const rect =
          activePreview?.id === element.id
            ? activePreview.rect
            : getRectFromElement(element);
        if (!rect) return null;
        const rotationDeg = element.transform?.rotation ?? 0;
        const showRotateHandle =
          !isRotating &&
          editingImageId !== element.id &&
          editingShapeTextId !== element.id;
        const showSizeLabel = !isRotating;
        const labelOffset = 16;
        const labelHeight = 20;
        const handleRadius = 10;
        const handleGap = 8;
        const rotateHandleOffset =
          labelOffset + labelHeight / 2 + handleRadius + handleGap;
        const rotatePos = getBottomCenterAnchor(
          rect,
          rotationDeg,
          rotateHandleOffset,
        );
        const labelPos = getBottomCenterAnchor(
          rect,
          rotationDeg,
          labelOffset,
        );

        return (
          <>
            {showRotateHandle && (
              <button
                type="button"
                className="absolute flex items-center justify-center rounded-full border-2 bg-white-100 cursor-grab active:cursor-grabbing z-50"
                style={{
                  left: rotatePos.x,
                  top: rotatePos.y,
                  width: 20,
                  height: 20,
                  borderColor: "var(--primary)",
                  transform: "translate(-50%, -50%)",
                }}
                onPointerDown={(event) => {
                  startShapeRotation(event, element, rect);
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            )}
            {showSizeLabel && (
              <div
                className="absolute rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
                style={{
                  left: labelPos.x,
                  top: labelPos.y,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              >
                가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
              </div>
            )}
          </>
        );
      })()}
      <GroupSelectionOverlay
        isGroupedSelection={isGroupedSelection}
        readOnly={readOnly}
        selectedIds={selectedIds}
        elements={elements}
      />
      <DesignPaperContextMenu
        contextMenu={contextMenu}
        elements={elements}
        canGroupSelection={canGroupSelection}
        canUngroupSelection={canUngroupSelection}
        isGroupedSelection={isGroupedSelection}
        canPaste={Boolean(getClipboard())}
        onCopy={copySelectedElements}
        onPaste={(position) => {
          pasteElements(position);
        }}
        onGroup={groupSelectedElements}
        onUngroup={ungroupSelectedElements}
        onDelete={deleteSelectedElements}
        onMoveLayer={moveElement}
        setContextMenu={setContextMenu}
      />
      <SmartGuideOverlay guides={smartGuides.guides} />
      {isRotating && rotationBadge && (() => {
        const element = elements.find((el) => el.id === rotationBadge.elementId);
        if (
          !element ||
          (element.type !== "rect" &&
            element.type !== "roundRect" &&
            element.type !== "ellipse")
        ) {
          return null;
        }
        const rect = getRectFromElement(element);
        if (!rect) return null;
        const rotationDeg = element.transform?.rotation ?? 0;
        const badgeOffset = 42;
        const badgePos = getRotatedLocalAnchor(
          rect,
          rotationDeg,
          0,
          rect.height / 2 + badgeOffset,
        );
        const angleValue = Math.round(rotationBadge.rotationDeg) % 360;
        const normalized = angleValue < 0 ? angleValue + 360 : angleValue;
        return (
          <div
            className="absolute rounded bg-black-90 px-2 py-1 text-12-medium text-white-100 shadow-lg z-[9999]"
            style={{
              left: badgePos.x,
              top: badgePos.y,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            {normalized}°
          </div>
        );
      })()}
    </div>
  );
};

export default DesignPaper;
