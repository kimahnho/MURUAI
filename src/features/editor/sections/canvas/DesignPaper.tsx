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
import type { CanvasElement } from "../../model/canvasTypes";
import SmartGuideOverlay from "./SmartGuideOverlay";
import WorksheetComponentOverlay, { getComponentBounds } from "./WorksheetComponentOverlay";
import { useWorksheetElementStore } from "../../store/worksheetElementStore";
import {
  DesignPaperContextMenu,
  type ContextMenuState,
  type TableContextMenuActions,
} from "./DesignPaperContextMenu";
import { extractImageSrc, removeImageBackground } from "../../utils/removeBackground";
import { useToastStore } from "../../store/toastStore";
import { useTableStore } from "../../store/tableStore";
import {
  insertRowAt,
  insertColAt,
  deleteRowAt,
  deleteColAt,
  adjustCellsAfterInsertRow,
  adjustCellsAfterInsertCol,
  adjustCellsAfterDeleteRow,
  adjustCellsAfterDeleteCol,
} from "../../utils/tableMutation";
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
import { useFreeformDrawing } from "./hooks/useFreeformDrawing";
import { useDrawingModeStore } from "../../store/drawingModeStore";
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

// 자유형 도형 생성 직후 "매끈하게 다듬기" 1회성 팝업
const SmoothPromptPopup = ({
  element,
  onAccept,
  onDismiss,
}: {
  element: { id: string; x: number; y: number; w: number; h: number };
  onAccept: () => void;
  onDismiss: () => void;
}) => (
  <div
    className="absolute flex items-center gap-2 pointer-events-auto"
    style={{
      left: element.x + element.w / 2,
      top: element.y - 52,
      transform: "translate(-50%, -100%)",
      zIndex: 50,
    }}
  >
    <div className="flex items-center gap-1.5 rounded-lg bg-white-100 border border-black-25 shadow-lg px-3 py-2">
      <button
        type="button"
        onPointerDown={(e) => { e.stopPropagation(); onAccept(); }}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-12-semibold text-white-100 hover:bg-primary-700 transition-colors whitespace-nowrap"
      >
        ✨ 매끈하게 다듬기
      </button>
      <button
        type="button"
        onPointerDown={(e) => { e.stopPropagation(); onDismiss(); }}
        className="rounded-md px-2 py-1.5 text-12-semibold text-black-60 hover:bg-black-5 transition-colors whitespace-nowrap"
      >
        유지
      </button>
    </div>
  </div>
);

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
  onFileDropOnCanvas?: (file: File, x: number, y: number) => void;
  onDeleteElements?: (ids: string[]) => void;
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
  onFileDropOnCanvas,
  onDeleteElements,
}: DesignPaperProps) => {
  const setSideBarMenu = useSideBarStore((state) => state.setSelectedMenu);
  const setFontPanel = useFontStore((state) => state.setPanelFont);
  const isDraggingWorksheet = useWorksheetElementStore((s) => s.isDraggingWorksheet);
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
            backgroundSize: `${(resolvedBackground.scale ?? 1) * 100}%`,
            backgroundPosition: `calc(50% + ${resolvedBackground.offsetX ?? 0}px) calc(50% + ${resolvedBackground.offsetY ?? 0}px)`,
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

  const [isRemovingBackground, setIsRemovingBackground] = useState(false);

  const handleRemoveBackground = async (elementId: string) => {
    const element = elements.find((el) => el.id === elementId);
    if (!element || !("fill" in element) || typeof element.fill !== "string") return;

    const imageSrc = extractImageSrc(element.fill);
    if (!imageSrc) return;

    setIsRemovingBackground(true);
    useToastStore.getState().showToast("배경을 제거하고 있어요...", "primary");

    try {
      const newFill = await removeImageBackground(imageSrc);
      if (onElementsChange) {
        const nextElements = elements.map((el) =>
          el.id === elementId && "fill" in el
            ? { ...el, fill: newFill }
            : el,
        );
        onElementsChange(nextElements);
      }
      useToastStore.getState().showToast("배경이 제거되었어요!", "success");
    } catch (err) {
      console.error("[배경제거 실패]", err);
      useToastStore.getState().showToast("배경 제거에 실패했어요.");
    } finally {
      setIsRemovingBackground(false);
      setContextMenu(null);
    }
  };

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
    onDeleteElements,
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
    deleteSelectedElements,
    onDeleteElements,
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
    pasteElements,
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

  // 자유형: 매끈하게 팝업 대상 요소
  const smoothPromptElementId = useDrawingModeStore((s) => s.smoothPromptElementId);
  // 선택 해제되면 팝업 자동 닫기
  useEffect(() => {
    if (smoothPromptElementId && !selectedIds.includes(smoothPromptElementId)) {
      useDrawingModeStore.getState().setSmoothPromptElementId(null);
    }
  }, [selectedIds, smoothPromptElementId]);
  // 좌측 패널에서 smooth 토글하면 팝업 자동 닫기
  const smoothPromptRawElement = smoothPromptElementId
    ? (elements.find((e) => e.id === smoothPromptElementId && e.type === "freeform") as import("../../model/canvasTypes").FreeformElement | undefined) ?? null
    : null;
  useEffect(() => {
    if (smoothPromptRawElement?.smooth) {
      useDrawingModeStore.getState().setSmoothPromptElementId(null);
    }
  }, [smoothPromptRawElement?.smooth]);
  const smoothPromptElement = smoothPromptRawElement?.smooth ? null : smoothPromptRawElement;

  // 자유형 그리기 모드
  const { isDrawing: isFreeformDrawing, previewPoints: freeformPreviewPoints, handleDrawingPointerDown } = useFreeformDrawing({
    elements,
    readOnly,
    onElementsChange,
    onSelectedIdsChange,
    getPointerPosition,
  });

  // 테이블 셀 기준 행/열 삽입·삭제 핸들러 — 클로저에서 snapshot을 캡처해 클릭 시점의 stale 방지
  const buildTableContext = (): TableContextMenuActions | undefined => {
    const { selectedTable, selectedCells, updateTable, setSelectedCells } =
      useTableStore.getState();
    if (!selectedTable || !updateTable || selectedCells.length === 0)
      return undefined;

    // snapshot을 클로저에 캡처 — 클릭 시 getState()가 이미 초기화된 경우를 방지
    const table = selectedTable;
    const cells = selectedCells;
    const update = updateTable;
    const setCells = setSelectedCells;

    return {
      hasSelectedCells: true,
      rows: table.rows,
      cols: table.cols,
      onInsertRowAbove: () => {
        const r = cells[0].row;
        update(insertRowAt(table, r));
        setCells(adjustCellsAfterInsertRow(cells, r, "above"));
        setContextMenu(null);
      },
      onInsertRowBelow: () => {
        const r = cells[0].row;
        update(insertRowAt(table, r + 1));
        setCells(adjustCellsAfterInsertRow(cells, r, "below"));
        setContextMenu(null);
      },
      onInsertColLeft: () => {
        const c = cells[0].col;
        update(insertColAt(table, c));
        setCells(adjustCellsAfterInsertCol(cells, c, "left"));
        setContextMenu(null);
      },
      onInsertColRight: () => {
        const c = cells[0].col;
        update(insertColAt(table, c + 1));
        setCells(adjustCellsAfterInsertCol(cells, c, "right"));
        setContextMenu(null);
      },
      onDeleteRow: () => {
        const r = cells[0].row;
        const patch = deleteRowAt(table, r);
        if (!patch) return;
        update(patch);
        setCells(adjustCellsAfterDeleteRow(cells, r, table.rows - 1));
        setContextMenu(null);
      },
      onDeleteCol: () => {
        const c = cells[0].col;
        const patch = deleteColAt(table, c);
        if (!patch) return;
        update(patch);
        setCells(adjustCellsAfterDeleteCol(cells, c, table.cols - 1));
        setContextMenu(null);
      },
    };
  };

  // contextMenu가 열릴 때 snapshot — 렌더 시 계산하므로 최신 상태 반영
  const tableContext = contextMenu ? buildTableContext() : undefined;

  return (
    <div
      ref={containerRef}
      tabIndex={readOnly ? undefined : 0}
      className={`relative bg-white shrink-0 outline-none transition-shadow ${
        readOnly ? "overflow-hidden" : "overflow-visible"
      } ${showShadow ? "shadow-lg" : ""} ${className ?? ""} ${
        isFocused && !readOnly ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{ width: pageWidth, height: pageHeight, ...paperBackgroundStyle, cursor: isFreeformDrawing ? "crosshair" : undefined }}
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
          const target = event.target as HTMLElement | null;
          const isToolbarTarget = Boolean(
            target?.closest("[data-textbox-toolbar]") ||
              target?.closest("[data-text-props-panel]"),
          );
          if (container && !isEditableTarget(event.target) && !isToolbarTarget) {
            container.focus();
          }
        }
      }}
      onPointerDownCapture={(event) => {
        // 자유형 그리기 모드: 하위 요소 핸들러가 실행되지 않도록 이벤트를 캡처 단계에서 가로챈다.
        // 이렇게 하면 다른 요소 위에서도 자유형 도형을 그릴 수 있다.
        if (isFreeformDrawing && event.button === 0) {
          event.stopPropagation();
          lastPointerRef.current = getPointerPosition(event);
          handleDrawingPointerDown(event);
          return;
        }
        // 하위 요소 핸들러가 선택/드래그 상태를 바꾸기 전에 포인터 좌표를 먼저 저장해
        // 스테이지 공통 동작이 동일한 기준 좌표를 사용하도록 한다.
        if (!readOnly) {
          const target = event.target as HTMLElement | null;
          const isToolbarTarget = Boolean(
            target?.closest("[data-textbox-toolbar]") ||
              target?.closest("[data-text-props-panel]"),
          );
          if (!isEditableTarget(event.target) && !isToolbarTarget) {
            containerRef.current?.focus();
          }
        }
        lastPointerRef.current = getPointerPosition(event);
      }}
      onPointerMoveCapture={(event) => {
        lastPointerRef.current = getPointerPosition(event);

        // 워크시트 컴포넌트 hover 감지 (좌표 기반)
        if (!readOnly) {
          const pos = getPointerPosition(event);
          const wsStore = useWorksheetElementStore.getState();
          const comps = wsStore.insertedComponents;
          let foundId: string | null = null;
          for (const comp of comps) {
            const bounds = getComponentBounds(elements, comp.elementIds);
            if (bounds && pos.x >= bounds.x - 4 && pos.x <= bounds.x + bounds.w + 4 && pos.y >= bounds.y - 4 && pos.y <= bounds.y + bounds.h + 4) {
              foundId = comp.id;
              break;
            }
          }
          if (foundId !== wsStore.hoveredComponentId) {
            wsStore.setHoveredComponentId(foundId);
          }
        }
      }}
      onPointerLeave={() => {
        const wsStore = useWorksheetElementStore.getState();
        if (wsStore.hoveredComponentId) {
          wsStore.setHoveredComponentId(null);
        }
      }}
      onDragOver={(event) => {
        if (readOnly) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        if (readOnly || !onElementsChange) return;
        event.preventDefault();
        event.stopPropagation();
        // 하위 요소(RoundBox 등)가 이미 드롭을 처리했으면 중복 삽입하지 않는다.
        if (event.target !== event.currentTarget) return;

        // 1. 사이드바 이미지 드래그 경로
        const imageUrl =
          event.dataTransfer.getData("application/x-muru-image") ||
          event.dataTransfer.getData("text/plain");
        if (imageUrl) {
          const scale = getContainerScale();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const DEFAULT_SIZE = 200;
          const dropX = (event.clientX - rect.left) / scale;
          const dropY = (event.clientY - rect.top) / scale;
          const newElement: CanvasElement = {
            id: `element-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: "rect",
            x: Math.round(dropX - DEFAULT_SIZE / 2),
            y: Math.round(dropY - DEFAULT_SIZE / 2),
            w: DEFAULT_SIZE,
            h: DEFAULT_SIZE,
            fill: imageUrl.startsWith("url(") ? imageUrl : `url(${imageUrl})`,
            imageBox: { x: 0, y: 0, w: DEFAULT_SIZE, h: DEFAULT_SIZE },
          };
          onElementsChange([...elements, newElement]);
          return;
        }

        // 2. OS 파일 드롭 경로
        const file = event.dataTransfer.files?.[0];
        if (file && onFileDropOnCanvas) {
          const scale = getContainerScale();
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const dropX = (event.clientX - rect.left) / scale;
          const dropY = (event.clientY - rect.top) / scale;
          onFileDropOnCanvas(file, dropX, dropY);
        }
      }}
      onContextMenu={openCanvasContextMenu}
    >
      {!readOnly && (
        <WorksheetComponentOverlay elements={elements} selectedIds={selectedIds} />
      )}
      {elements.map((element) => renderElement(element))}
      {/* 자유형 그리기 모드: 모든 기존 요소 위에 투명 오버레이를 덮어 hover/pointerEnter를 차단 */}
      {isFreeformDrawing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            cursor: "crosshair",
          }}
        />
      )}
      {/* 페이지 영역 바깥의 요소 부분을 반투명 화이트 오버레이로 덮어 경계 밖임을 시각적으로 표현한다. */}
      {!readOnly && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 5,
            boxShadow: "0 0 0 9999px rgba(255, 255, 255, 0.65)",
          }}
        />
      )}
      {/* 이미지 크롭 편집 모드: 모든 요소(z-index 없음) 위에 딤(z-10)을 올려 전체를 어둡게 처리한다.
          편집 중인 요소는 z-20으로 딤 위에 노출되어 해당 도형만 밝게 보인다. */}
      {editingImageId && (() => {
        const el = elements.find((e) => e.id === editingImageId);
        if (!el || (el.type !== "rect" && el.type !== "roundRect" && el.type !== "ellipse" && el.type !== "mosaic" && el.type !== "circleMosaic" && el.type !== "aacCard" && el.type !== "emotionCard")) return null;
        return (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: el.x,
              top: el.y,
              width: el.w,
              height: el.h,
              borderRadius: el.type === "ellipse" ? "50%" : ((el as { radius?: number }).radius ?? 0),
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
            }}
          />
        );
      })()}
      {/* 자유형 그리기 라이브 프리뷰 */}
      {freeformPreviewPoints && freeformPreviewPoints.length > 1 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: pageWidth, height: pageHeight, zIndex: 30 }}
        >
          <polyline
            points={freeformPreviewPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#7C3AED"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
          {/* 시작점 표시 */}
          <circle
            cx={freeformPreviewPoints[0].x}
            cy={freeformPreviewPoints[0].y}
            r={5}
            fill="#7C3AED"
            opacity={0.6}
          />
        </svg>
      )}
      {/* 자유형 도형 생성 직후 "매끈하게" 팝업 */}
      {smoothPromptElement && (
        <SmoothPromptPopup
          element={smoothPromptElement}
          onAccept={() => {
            updateElement(smoothPromptElement.id, { smooth: true });
            useDrawingModeStore.getState().setSmoothPromptElementId(null);
          }}
          onDismiss={() => {
            useDrawingModeStore.getState().setSmoothPromptElementId(null);
          }}
        />
      )}
      <SelectionRectOverlay selectionRect={selectionRect} />
      {/* 자유형 그리기 모드에서는 선택/변형 오버레이를 숨겨 hover UI가 표시되지 않게 한다 */}
      {!isFreeformDrawing && (
        <>
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
            onContextMenu={(event) => {
              const firstSelectedId = selectedIds[0];
              if (firstSelectedId) {
                openContextMenu(event, firstSelectedId);
              }
            }}
          />
        </>
      )}
      <DesignPaperContextMenu
        contextMenu={contextMenu}
        elements={elements}
        canGroupSelection={canGroupSelection}
        canUngroupSelection={canUngroupSelection}
        isGroupedSelection={isGroupedSelection}
        canPaste={Boolean(getClipboard())}
        tableContext={tableContext}
        onCopy={copySelectedElements}
        onPaste={(position) => {
          pasteElements(position);
        }}
        onGroup={groupSelectedElements}
        onUngroup={ungroupSelectedElements}
        onDelete={deleteSelectedElements}
        onMoveLayer={moveElement}
        onRemoveBackground={(id) => { void handleRemoveBackground(id); }}
        isRemovingBackground={isRemovingBackground}
        setContextMenu={setContextMenu}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 20 }}>
        <SmartGuideOverlay guides={isDraggingWorksheet ? [] : smartGuides.guides} />
      </div>
      {isRotating && rotationBadge && (
        <RotationBadge
          elements={elements}
          rotationBadge={rotationBadge}
          getRotatedLocalAnchor={getRotatedLocalAnchor}
        />
      )}
      {resolvedNumbering.enabled && pageNumber >= (resolvedNumbering.startPage ?? 1) && (
        <div
          style={getPageNumberPositionStyle(resolvedNumbering.position)}
          className="text-16-medium text-black-70"
          aria-hidden="true"
        >
          {formatPageNumberLabel(
            pageNumber - (resolvedNumbering.startPage ?? 1) + 1,
            resolvedNumbering.format,
          )}
        </div>
      )}
    </div>
  );
};

export default DesignPaper;
