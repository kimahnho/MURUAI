/**
 * 캔버스 한 페이지의 핵심 편집 표면 컴포넌트.
 * 요소 렌더링과 선택/드래그/리사이즈/컨텍스트 메뉴 상호작용을 담당한다.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  CanvasElement,
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
import { useElementPatchUpdater } from "./hooks/useElementPatchUpdater";
import { usePaperRects } from "./hooks/usePaperRects";
import {
  isEditableTarget,
  type SelectionRect,
  type Rect,
} from "../../utils/designPaperUtils";
import type { DesignPaperStageActions } from "../../model/stageActions";
import type { PageBackground, PageNumbering } from "../../model/pageTypes";
import { getSelectionRenderState } from "../../utils/selectionState";
import {
  getBottomCenterAnchor,
  getTopCenterAnchor,
  getRotatedLocalAnchor,
} from "../../utils/rotationGeometry";
import {
  formatPageNumberLabel,
  getPageNumberPositionStyle,
  resolvePageBackground,
  resolvePageNumbering,
} from "../../utils/pagePresentation";
import RotationBadge from "./RotationBadge";
import SingleShapeTransformOverlay from "./SingleShapeTransformOverlay";

interface DesignPaperProps {
  pageId: string;
  orientation: "horizontal" | "vertical";
  elements: CanvasElement[];
  selectedIds?: string[];
  editingTextId?: string | null;
  pageNumber?: number;
  background?: PageBackground;
  numbering?: PageNumbering;
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
  pageNumber = 1,
  background,
  numbering,
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
  const resolvedBackground = resolvePageBackground(background);
  const resolvedNumbering = resolvePageNumbering(numbering);
  const paperBackgroundStyle =
    resolvedBackground.type === "color"
      ? { backgroundColor: resolvedBackground.color }
      : resolvedBackground.type === "image" && resolvedBackground.imageUrl
        ? {
            backgroundColor: "#ffffff",
            backgroundImage: `url(${resolvedBackground.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }
        : { backgroundColor: "#ffffff" };
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

  const { updateElement } = useElementPatchUpdater({
    elements,
    readOnly,
    onElementsChange,
  });

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

  const { getRenderableRect, getTargetRects } = usePaperRects({
    elements,
    activePreview,
  });

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
      className={`relative overflow-hidden bg-white shrink-0 outline-none transition-all ${
        showShadow ? "shadow-lg" : ""
      } ${className ?? ""} ${
        isFocused && !readOnly ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{ width: pageWidth, height: pageHeight, ...paperBackgroundStyle }}
      data-page-id={pageId}
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
      }}
      onKeyDown={(event) => {
        handleDeleteSelectionKeyDown(event);
      }}
      onPointerDown={(event) => {
        // 내부 텍스트 편집 노드가 활성화된 상태가 아닐 때는 컨테이너 포커스를 유지해
        // 키보드 단축키가 끊기지 않도록 한다.
        if (!readOnly) {
          const container = containerRef.current;
          if (container && !isEditableTarget(event.target)) {
            container.focus();
          }
        }
      }}
      onPointerDownCapture={(event) => {
        // 하위 요소 핸들러가 선택/드래그 상태를 바꾸기 전에 포인터 좌표를 먼저 저장해
        // 스테이지 공통 동작이 동일한 기준 좌표를 사용하도록 한다.
        if (!readOnly) {
          if (!isEditableTarget(event.target)) {
            containerRef.current?.focus();
          }
        }
        lastPointerRef.current = getPointerPosition(event);
      }}
      onPointerMoveCapture={(event) => {
        // 붙여넣기/컨텍스트 메뉴가 마지막 포인터 위치를 참조하므로
        // 스테이지 상대 좌표 캐시를 이동 중에도 계속 최신화한다.
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
      {resolvedNumbering.enabled && (
        <div
          style={getPageNumberPositionStyle(resolvedNumbering.position)}
          className="text-16-medium text-black-70"
          aria-hidden="true"
        >
          {formatPageNumberLabel(pageNumber, resolvedNumbering.format)}
        </div>
      )}
    </div>
  );
};

export default DesignPaper;
