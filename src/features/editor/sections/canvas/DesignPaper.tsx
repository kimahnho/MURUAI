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
import { useImageFillStore } from "../../store/imageFillStore";

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
            backgroundSize: "100% 100%",
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
      className={`relative bg-white shrink-0 outline-none transition-all ${
        readOnly ? "overflow-hidden" : "overflow-visible"
      } ${showShadow ? "shadow-lg" : ""} ${className ?? ""} ${
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

        // 드롭 좌표 계산 (imageSlot 히트테스트 + 요소 삽입 공용)
        const scale = getContainerScale();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dropX = (event.clientX - rect.left) / scale;
        const dropY = (event.clientY - rect.top) / scale;

        // imageSlot/aacCard/emotionCard 히트테스트 (자식 요소 위 드롭도 허용)
        const hitSlot = elements.find((el) => {
          const isSlot =
            ((el.type === "rect" ||
              el.type === "roundRect" ||
              el.type === "ellipse" ||
              el.type === "mosaic" ||
              el.type === "circleMosaic") &&
              (el as { subType?: string }).subType === "imageSlot") ||
            el.type === "aacCard" ||
            el.type === "emotionCard";
          return (
            isSlot &&
            dropX >= el.x &&
            dropX <= el.x + el.w &&
            dropY >= el.y &&
            dropY <= el.y + el.h
          );
        });

        // 1. 앱 내부 사이드바 드래그 (전용 MIME으로 구분)
        const muruImage = event.dataTransfer.getData("application/x-muru-image");
        if (muruImage && hitSlot) {
          onSelectedIdsChange?.([hitSlot.id]);
          useImageFillStore
            .getState()
            .requestImageFill(muruImage, undefined, undefined, {
              forceInsert: true,
              source: "library",
            });
          return;
        }

        // 2. 파일 드롭 우선 (브라우저 이미지 드래그 / OS 파일 드롭 모두 해당)
        const file = event.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          if (hitSlot && onFileDropOnCanvas) {
            onFileDropOnCanvas(file, dropX, dropY);
            return;
          }
          // 빈 영역에 새 요소 생성
          if (event.target === event.currentTarget && onFileDropOnCanvas) {
            onFileDropOnCanvas(file, dropX, dropY);
            return;
          }
        }

        // 하위 요소(RoundBox 등) 위 드롭 시 imageSlot이 아니면 무시
        if (event.target !== event.currentTarget) return;

        // 3. 사이드바 이미지 드래그 → 빈 영역에 새 요소 생성
        if (muruImage) {
          const DEFAULT_SIZE = 200;
          const newElement: CanvasElement = {
            id: crypto.randomUUID(),
            type: "rect",
            x: Math.round(dropX - DEFAULT_SIZE / 2),
            y: Math.round(dropY - DEFAULT_SIZE / 2),
            w: DEFAULT_SIZE,
            h: DEFAULT_SIZE,
            fill: `url(${muruImage})`,
            imageBox: { x: 0, y: 0, w: DEFAULT_SIZE, h: DEFAULT_SIZE },
          };
          onElementsChange([...elements, newElement]);
        }
      }}
      onContextMenu={openCanvasContextMenu}
    >
      {!readOnly && (
        <WorksheetComponentOverlay elements={elements} selectedIds={selectedIds} />
      )}
      {elements.map((element) => renderElement(element))}
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
        onContextMenu={(event) => {
          const firstSelectedId = selectedIds[0];
          if (firstSelectedId) {
            openContextMenu(event, firstSelectedId);
          }
        }}
      />
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
