import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
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
import { useSideBarStore } from "../../store/sideBarStore";
import { useFontStore } from "../../store/fontStore";
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
import { useGroupOverlayDrag } from "./hooks/useGroupOverlayDrag";
import { useDesignPaperElementRenderer } from "./hooks/useDesignPaperElementRenderer";
import { useSnapTransformRect } from "./hooks/useSnapTransformRect";
import {
  DEFAULT_STROKE,
  getRectFromElement,
  isEditableTarget,
  type SelectionRect,
  type Rect,
} from "../../utils/designPaperUtils";
import type { DesignPaperStageActions } from "../../model/stageActions";
import { getSelectionRenderState } from "../../utils/selectionState";
import {
  getBottomCenterAnchor,
  getTopCenterAnchor,
  getRotatedLocalAnchor,
} from "../../utils/rotationGeometry";
import RotationBadge from "./RotationBadge";
import SingleShapeTransformOverlay from "./SingleShapeTransformOverlay";

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

  const { handleGroupOverlayDragPointerDown } = useGroupOverlayDrag({
    readOnly,
    elements,
    selectedIdsRef,
    getPointerPosition,
    buildGroupDragState,
    groupDragRef,
    applyGroupDelta,
    onInteractionChange,
    handleSelectChange,
    smartGuides,
    getTargetRects,
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

  const { transformElementRect } = useSnapTransformRect({
    activeInteractionRef,
    groupDragRef,
    getGroupBoundingBox,
    getTargetRects,
    smartGuides,
  });

  const { renderElement } = useDesignPaperElementRenderer({
    elements,
    selectedIds,
    readOnly,
    editingTextId,
    editingImageId,
    editingShapeTextId,
    emotionSlotTextIds,
    shouldShowIndividualBorder,
    getRenderableRect,
    setSideBarMenu,
    setFontPanel,
    updateElement,
    handleRectChange,
    handleDragStateChange,
    handleLineChange,
    handleLineDragStateChange,
    handleSelectChange,
    openContextMenu,
    onEditingTextIdChange,
    deleteElementById,
    transformElementRect,
    setEditingImageId,
    setEditingShapeTextId,
    mmToPx,
  });

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
      <SingleShapeTransformOverlay
        selectedIds={selectedIds}
        elements={elements}
        activePreview={activePreview}
        isRotating={isRotating}
        editingImageId={editingImageId}
        editingShapeTextId={editingShapeTextId}
        updateElement={updateElement}
        startShapeRotation={startShapeRotation}
        getBottomCenterAnchor={getBottomCenterAnchor}
        getTopCenterAnchor={getTopCenterAnchor}
      />
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
