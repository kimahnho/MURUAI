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
} from "./DesignPaperContextMenu";
import {
  GroupSelectionOverlay,
  SelectionRectOverlay,
} from "./DesignPaperOverlays";
import { useSmartGuides } from "../../model/useSmartGuides";
import Arrow from "./elements/arrow/Arrow";
import CircleBox from "./elements/circle/CircleBox";
import Line from "./elements/line/Line";
import RoundBox from "./elements/round_box/RoundBox";
import TextBox from "./elements/text/TextBox";
import { stripStyleTags } from "./elements/text/textContentUtils";
import { useSideBarStore } from "../../store/sideBarStore";
import { useFontStore } from "../../store/fontStore";
import { getFontLabel, normalizeFontWeight } from "../../utils/fontOptions";
import { useDesignPaperActions } from "./hooks/useDesignPaperActions";
import { useDesignPaperClipboard } from "./hooks/useDesignPaperClipboard";
import { useDesignPaperInteraction } from "./hooks/useDesignPaperInteraction";
import { useDesignPaperGroupDrag } from "./hooks/useDesignPaperGroupDrag";
import { useDesignPaperKeyboard } from "./hooks/useDesignPaperKeyboard";
import { useDesignPaperPaste } from "./hooks/useDesignPaperPaste";
import { useDesignPaperStageActions } from "./hooks/useDesignPaperStageActions";
import { useEmotionSlotBindings } from "./hooks/useEmotionSlotBindings";
import { useDesignPaperRotation } from "./hooks/useDesignPaperRotation";
import { useDesignPaperSelectionContextMenu } from "./hooks/useDesignPaperSelectionContextMenu";
import { usePointerDragSession } from "./hooks/usePointerDragSession";
import {
  DEFAULT_STROKE,
  getRectFromElement,
  isEditableTarget,
  type SelectionRect,
  type Rect,
} from "../../utils/designPaperUtils";
import type { DesignPaperStageActions } from "../../model/stageActions";
import {
  createFlipXHandler,
  createFlipYHandler,
  createRotateCWHandler,
  createRotateCCWHandler,
} from "../../utils/elementTransforms";
import { getSelectionRenderState } from "../../utils/selectionState";
import {
  getBottomCenterAnchor,
  getTopCenterAnchor,
  getRotatedLocalAnchor,
} from "../../utils/rotationGeometry";
import ShapeTransformBar from "./ShapeTransformBar";
import RotationBadge from "./RotationBadge";

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
  const [isFocused, setIsFocused] = useState(false);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const { startPointerDragSession } = usePointerDragSession();
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

  const {
    clearContextMenu,
    handleSelect,
    handleSelectChange,
    openContextMenu,
    openCanvasContextMenu,
  } = useDesignPaperSelectionContextMenu({
    readOnly,
    elements,
    pageWidth,
    pageHeight,
    selectedIdsRef,
    containerRef,
    editingImageId,
    editingShapeTextId,
    editingTextId,
    onSelectedIdsChange,
    onEditingTextIdChange,
    setEditingImageId,
    setEditingShapeTextId,
    setSideBarMenu,
    setContextMenu,
    getContainerScale,
  });

  useDesignPaperStageActions({
    stageActionsRef,
    clearContextMenu,
    setEditingImageId,
    setEditingShapeTextId,
  });

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

  const {
    activeInteractionRef,
    handleGroupResizePointerDown,
    handleRectChange,
    handleDragStateChange,
    handleLineChange,
    handleLineDragStateChange,
  } = useDesignPaperInteraction({
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
  });

  const { isRotating, rotationBadge, startShapeRotation } =
    useDesignPaperRotation({
      readOnly,
      getPointerPosition,
      updateElement,
      onInteractionChange,
    });

  const {
    moveElement,
    groupSelectedElements,
    ungroupSelectedElements,
    deleteElementById,
    deleteSelectedElements,
    handleDeleteSelectionKeyDown,
  } = useDesignPaperActions({
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
  });

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

  const handleGroupOverlayDragPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    groupRect: Rect,
  ) => {
    if (readOnly) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const pointer = getPointerPosition(event);
    const hitSelectedElement = [...elements]
      .reverse()
      .find((element) => {
        if (!selectedIdsRef.current.includes(element.id)) return false;
        if (element.visible === false || element.selectable === false || element.locked) {
          return false;
        }
        const rect = getRectFromElement(element);
        if (!rect) return false;
        return (
          pointer.x >= rect.x &&
          pointer.x <= rect.x + rect.width &&
          pointer.y >= rect.y &&
          pointer.y <= rect.y + rect.height
        );
      });
    const shouldSelectSingleOnClick = Boolean(hitSelectedElement && !event.shiftKey);
    const activeId = selectedIdsRef.current[0];
    if (!activeId) return;
    const snapshot = buildGroupDragState(activeId);
    if (!snapshot || snapshot.items.size <= 1) {
      if (shouldSelectSingleOnClick && hitSelectedElement) {
        handleSelect(hitSelectedElement.id);
      }
      return;
    }
    const startPointer = getPointerPosition(event);
    const selectedItemIds = new Set(snapshot.items.keys() as Iterable<string>);
    const DRAG_THRESHOLD_PX = 3;
    let dragStarted = false;

    const startDrag = () => {
      if (dragStarted) return;
      dragStarted = true;
      groupDragRef.current = snapshot;
      onInteractionChange?.(true, { type: "drag" });
    };

    startPointerDragSession({
      thresholdPx: DRAG_THRESHOLD_PX,
      startContext: undefined,
      createMoveContext: (moveEvent) => {
        const currentPointer = getPointerPosition(moveEvent);
        const delta = {
          x: currentPointer.x - startPointer.x,
          y: currentPointer.y - startPointer.y,
        };
        return {
          distance: Math.hypot(delta.x, delta.y),
          context: delta,
        };
      },
      onStart: () => {
        startDrag();
      },
      onMove: (delta) => {
        const movingRect = {
          x: groupRect.x + delta.x,
          y: groupRect.y + delta.y,
          width: groupRect.width,
          height: groupRect.height,
        };
        const { snapOffset } = smartGuides.compute({
          activeRect: movingRect,
          otherRects: getTargetRects(activeId, selectedItemIds),
        });
        applyGroupDelta({
          x: delta.x + snapOffset.x,
          y: delta.y + snapOffset.y,
        });
      },
      onEnd: (moved) => {
        if (!moved && shouldSelectSingleOnClick && hitSelectedElement) {
          handleSelect(hitSelectedElement.id);
          return;
        }
        if (dragStarted) {
          groupDragRef.current = null;
          onInteractionChange?.(false, { type: "drag" });
          smartGuides.clear();
        }
      },
    });
  };

  const buildTextToolbarConfig = (
    element: TextElement,
    fontWeight: number,
    lineHeight: number,
    letterSpacing: number,
    clampFontSize: (v: number) => number,
  ) => ({
    offset: mmToPx(4),
    minFontSize: 12,
    maxFontSize: 120,
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
    onFontSizeChange: (value: number) => {
      updateElement(element.id, {
        style: { fontSize: clampFontSize(value) },
      });
    },
    onFontSizeStep: (delta: number) => {
      updateElement(element.id, {
        style: {
          fontSize: clampFontSize(element.style.fontSize + delta),
        },
      });
    },
    onLineHeightChange: (value: number) => {
      updateElement(element.id, { style: { lineHeight: value } });
    },
    onLetterSpacingChange: (value: number) => {
      updateElement(element.id, { style: { letterSpacing: value } });
    },
    onColorChange: (color: string) => {
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
    onAlignChange: (align: "left" | "center" | "right") => {
      updateElement(element.id, { style: { alignX: align } });
    },
    onAlignYChange: (alignY: "top" | "middle" | "bottom") => {
      updateElement(element.id, { style: { alignY } });
    },
  });

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
        selectionCount={selectedIds.length}
        isEditing={isEditing}
        locked={locked}
        showToolbar={showToolbar}
        widthMode={element.widthMode ?? "auto"}
        toolbar={buildTextToolbarConfig(element, fontWeight, lineHeight, letterSpacing, clampFontSize)}
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

    const getLatestTransform = () => {
      const latest = elements.find((el) => el.id === element.id) ?? element;
      return "transform" in latest ? (latest.transform ?? {}) : {};
    };
    const transformCtx = {
      elementId: element.id,
      readOnly: !!readOnly,
      locked: !!element.locked,
      getTransform: getLatestTransform,
      updateElement,
    };
    const handleFlipX = createFlipXHandler(transformCtx);
    const handleFlipY = createFlipYHandler(transformCtx);
    const handleRotateCW = createRotateCWHandler(transformCtx);
    const handleRotateCCW = createRotateCCWHandler(transformCtx);

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
        selectionCount={selectedIds.length}
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

    const lineTransformCtx = {
      elementId: element.id,
      readOnly: !!readOnly,
      locked: !!element.locked,
      getTransform: () => element.transform ?? {},
      updateElement,
    };
    const handleFlipX = createFlipXHandler(lineTransformCtx);
    const handleFlipY = createFlipYHandler(lineTransformCtx);
    const handleRotateCW = createRotateCWHandler(lineTransformCtx);
    const handleRotateCCW = createRotateCCWHandler(lineTransformCtx);

    const sharedProps = {
      id: element.id,
      start: element.start,
      end: element.end,
      stroke,
      isSelected: shouldShowIndividualBorder(element.id),
      selectionCount: selectedIds.length,
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
        handleDeleteSelectionKeyDown(event);
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
        return (
          <ShapeTransformBar
            element={element}
            rect={rect}
            isRotating={isRotating}
            editingImageId={editingImageId}
            editingShapeTextId={editingShapeTextId}
            updateElement={updateElement}
            startShapeRotation={startShapeRotation}
            getBottomCenterAnchor={getBottomCenterAnchor}
            getTopCenterAnchor={getTopCenterAnchor}
          />
        );
      })()}
      <GroupSelectionOverlay
        isGroupedSelection={isGroupedSelection || selectedIds.length > 1}
        readOnly={readOnly}
        selectedIds={selectedIds}
        elements={elements}
        showHandles
        onResizeHandlePointerDown={handleGroupResizePointerDown}
        onDragPointerDown={handleGroupOverlayDragPointerDown}
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
      {isRotating && rotationBadge && (
        <RotationBadge
          elements={elements}
          rotationBadge={rotationBadge}
          getRotatedLocalAnchor={getRotatedLocalAnchor}
        />
      )}
    </div>
  );
};

export default DesignPaper;
