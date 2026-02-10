import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import BottomBar from "./BottomBar";
import type { CanvasDocument } from "../model/pageTypes";
import MultiSelectionToolbar from "./MultiSelectionToolbar";
import ElementToolbars from "./ElementToolbars";
import CanvasStage from "./CanvasStage";
import TemplateChoiceDialog from "./TemplateChoiceDialog";
import PdfPreviewContainer from "./PdfPreviewContainer";
import { useCopyPaste } from "../hooks/useCopyPaste";
import { useCanvasZoom } from "../hooks/useCanvasZoom";
import { useTemplateStore } from "../store/templateStore";
import { useSideBarStore } from "../store/sideBarStore";
import { useFontStore } from "../store/fontStore";
import { useHistorySync } from "../hooks/useHistorySync";
import { useImageFillSubscription } from "../hooks/useImageFillSubscription";
import { useTemplateSubscription } from "../hooks/useTemplateSubscription";
import { useFontSubscription } from "../hooks/useFontSubscription";
import { useElementSubscription } from "../hooks/useElementSubscription";
import { useOrientationSubscription } from "../hooks/useOrientationSubscription";
import { useBoardSubscriptions } from "../hooks/useBoardSubscriptions";
import { useSelectionState } from "../hooks/useSelectionState";
import { useSelectionToolbarActions } from "../hooks/useSelectionToolbarActions";
import { useTemplateApplyActions } from "../hooks/useTemplateApplyActions";
import { useActivePageManager } from "../hooks/useActivePageManager";
import { useCanvasStageHandlers } from "../hooks/useCanvasStageHandlers";
import { useSelectionClearer } from "../hooks/useSelectionClearer";
import { useTemplateNotifications } from "../hooks/useTemplateNotifications";
import { useActivePageState } from "../hooks/useActivePageState";
import { useInitialPageState } from "../hooks/useInitialPageState";
import { useSyncedRef } from "../hooks/useSyncedRef";
import { useTextEditTransaction } from "../hooks/useTextEditTransaction";
import { usePageActions } from "../hooks/usePageActions";
import { useAutoSave } from "../hooks/useAutoSave";
import { useCanvasGetter } from "../hooks/useCanvasGetter";
import { useCanvasWheelZoom } from "../hooks/useCanvasWheelZoom";
import {
  applyTemplateToCurrentPage,
  addTemplatePage,
  addSelectedTemplatePages,
  addAacBoardPage,
  addStoryBoardPage,
  addShapeElement,
  addTextElement,
  addLineElement,
} from "../utils/pageFactory";
import { type TemplateId } from "../templates/templateRegistry";

export interface OutletContext {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  orientation: "horizontal" | "vertical";
  setOrientation: Dispatch<SetStateAction<"horizontal" | "vertical">>;
  registerCanvasGetter: (getter: () => CanvasDocument) => void;
  loadedDocument: CanvasDocument | null;
  clearLoadedDocument: () => void;
  loadedDocumentId: string | null;
  docId?: string;
  docName: string;
  setAutoSaveState: (state: "saving" | "saved" | "error" | null) => void;
  setRetryAutoSave: (retryFn: () => void) => void;
  setManualSave: (saveFn: () => void) => void;
}

const MainSection = () => {
  const location = useLocation();
  const {
    zoom,
    setZoom,
    orientation,
    setOrientation,
    registerCanvasGetter,
    loadedDocument,
    docId,
    docName,
    setAutoSaveState,
    setRetryAutoSave,
    setManualSave,
  } = useOutletContext<OutletContext>();

  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useTemplateStore(
    (state) => state.setSelectedTemplate,
  );
  const setSideBarMenu = useSideBarStore((state) => state.setSelectedMenu);
  const setFontPanel = useFontStore((state) => state.setPanelFont);
  const { pages, setPages, selectedPageId, setSelectedPageId } =
    useInitialPageState({ loadedDocument, orientation });
  const selectedPageIdRef = useRef(selectedPageId);
  const pagesRef = useRef(pages);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const orientationRef = useRef(orientation);
  const isSyncingOrientationRef = useRef(false);
  const isApplyingHistoryRef = useRef(false);
  const isApplyingTemplateRef = useRef(false);
  const { beginTransaction, commitTransaction, recordHistory } = useHistorySync(
    {
      pages,
      selectedPageId,
      selectedIds,
      pagesRef,
      selectedPageIdRef,
      selectedIdsRef,
      setPages,
      setSelectedPageId,
      setSelectedIds,
      isApplyingHistoryRef,
      isApplyingTemplateRef,
    },
  );
  useImageFillSubscription({
    pagesRef,
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
    setSelectedIds,
    setEditingTextId,
  });
  const [templateChoiceDialog, setTemplateChoiceDialog] = useState<{
    templateId: TemplateId;
  } | null>(null);
  const { showEmotionInferenceToast } = useTemplateNotifications();

  useSyncedRef(orientationRef, orientation);
  useSyncedRef(pagesRef, pages);
  useSyncedRef(selectedPageIdRef, selectedPageId);
  useSyncedRef(selectedIdsRef, selectedIds);

  // 데이터 로딩 완료 여부:
  // 1) docId가 없는 신규 문서이거나
  // 2) docId가 있고 loadedDocument가 처리되었고 pages가 실제로 존재함
  const isDataLoaded = !docId || (loadedDocument !== null && pages.length > 0);

  const { retrySave, manualSave } = useAutoSave({
    pages,
    docId,
    docName,
    onSaveStateChange: setAutoSaveState,
    isDataLoaded,
  });

  useEffect(() => {
    setRetryAutoSave(retrySave);
  }, [retrySave, setRetryAutoSave]);

  useEffect(() => {
    setManualSave(manualSave);
  }, [manualSave, setManualSave]);
  useCanvasGetter({ registerCanvasGetter, pagesRef });

  const setActivePage = useActivePageManager({
    pages,
    setSelectedPageId,
    setSelectedIds,
    setEditingTextId,
    setOrientation,
    orientationRef,
    isSyncingOrientationRef,
  });

  const {
    handleAddPage,
    handleAddPageAtIndex,
    handleSelectPage,
    handleReorderPages,
    handleDuplicatePage,
    handleCopyPage,
    handlePastePage,
    handleDeletePage,
    handleDeleteElements,
    handleClearPage,
    handleMovePage,
  } = usePageActions({
    pages,
    selectedPageId,
    orientation,
    setPages,
    setSelectedIds,
    setEditingTextId,
    setActivePage,
  });

  useTextEditTransaction({
    editingTextId,
    beginTransaction,
    commitTransaction,
  });

  useTemplateSubscription({
    pages,
    selectedPageId,
    selectedTemplate,
    setSelectedTemplate,
    pagesRef,
    selectedPageIdRef,
    orientationRef,
    setTemplateChoiceDialog,
    setPages,
    setActivePage,
    showEmotionInferenceToast,
    isApplyingTemplateRef,
    recordHistory,
    addTemplatePage,
    addSelectedTemplatePages,
  });
  useFontSubscription({
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
  });
  useElementSubscription({
    pagesRef,
    selectedPageIdRef,
    setPages,
    setSelectedIds,
    setEditingTextId,
    addTextElement,
    addShapeElement,
    addLineElement,
  });
  useOrientationSubscription({
    selectedPageIdRef,
    isSyncingOrientationRef,
    setPages,
  });
  useBoardSubscriptions({
    setPages,
    setActivePage,
    setSideBarMenu,
    setSelectedIds,
    setEditingTextId,
    addAacBoardPage,
    addStoryBoardPage,
  });

  // 복사/붙여넣기/삭제 기능 활성화
  useCopyPaste({
    selectedPageId,
    pages,
    selectedIds,
    onDeleteElements: handleDeleteElements,
    onDuplicatePage: handleDuplicatePage,
    onPastePage: handlePastePage,
    onDeletePage: handleDeletePage,
    onClearPage: handleClearPage,
  });

  const { selectedPage, activeOrientation } = useActivePageState({
    pages,
    selectedPageId,
    fallbackOrientation: orientation,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas 확대/축소 훅 사용
  const { canvasRef, scale, padding, paperWidth, paperHeight } = useCanvasZoom({
    zoom,
    pageId: selectedPageId,
    containerRef,
    orientation: activeOrientation,
  });

  useCanvasWheelZoom({ containerRef, setZoom });

  const {
    activePage,
    isMultiColorSelection,
    multiColorValue,
    hasMultiFontTargets,
    multiFontFamily,
    multiFontLabel,
    multiFontWeight,
    multiFontSizeInput,
    hasMultiBorderTargets,
    multiBorderEnabled,
    multiBorderColor,
    multiBorderWidth,
    activeBorderStyle,
    borderStyleOptions,
    clampBorderWidth,
    applyMultiBorderPatch,
    lineToolbarData,
    shapeToolbarData,
    aacToolbarData,
    applyAacLabelPosition,
    canDistribute,
    distributeHorizontal,
    distributeVertical,
  } = useSelectionState({
    pages,
    selectedPageId,
    selectedIds,
    setPages,
  });

  const { handleMultiColorChange, handleOpenFontPanel } =
    useSelectionToolbarActions({
      activePage,
      selectedPageId,
      selectedIds,
      setPages,
      setSideBarMenu,
      setFontPanel,
      multiFontFamily,
      multiFontWeight,
    });

  const { handleApplyTemplateToCurrent, handleApplyTemplateToNew } =
    useTemplateApplyActions({
      templateChoiceDialog,
      setTemplateChoiceDialog,
      setPages,
      setActivePage,
      orientationRef,
      selectedPageIdRef,
      isApplyingTemplateRef,
      recordHistory,
      showEmotionInferenceToast,
      applyTemplateToCurrentPage,
      addTemplatePage,
    });

  const handleClearSelection = useSelectionClearer({
    setSelectedIds,
    setEditingTextId,
  });

  const { handleElementsChange, handleInteractionChange } =
    useCanvasStageHandlers({
      selectedPageId,
      setPages,
      beginTransaction,
      commitTransaction,
    });

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-black-20">
      <div
        id="text-toolbar-root"
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none"
      />
      <MultiSelectionToolbar
        isVisible={isMultiColorSelection}
        multiColorValue={multiColorValue}
        onMultiColorChange={handleMultiColorChange}
        hasMultiFontTargets={hasMultiFontTargets}
        onOpenFontPanel={handleOpenFontPanel}
        multiFontFamily={multiFontFamily}
        multiFontLabel={multiFontLabel}
        multiFontSizeInput={multiFontSizeInput}
        hasMultiBorderTargets={hasMultiBorderTargets}
        multiBorderEnabled={multiBorderEnabled}
        multiBorderColor={multiBorderColor}
        multiBorderWidth={multiBorderWidth}
        activeBorderStyle={activeBorderStyle}
        borderStyleOptions={borderStyleOptions}
        clampBorderWidth={clampBorderWidth}
        applyMultiBorderPatch={applyMultiBorderPatch}
        canDistribute={canDistribute}
        onDistributeHorizontal={distributeHorizontal}
        onDistributeVertical={distributeVertical}
      />
      <ElementToolbars
        shapeToolbarData={shapeToolbarData}
        lineToolbarData={lineToolbarData}
        aacToolbarData={aacToolbarData}
        selectedIds={selectedIds}
        selectedPageId={selectedPageId}
        setPages={setPages}
        onAacLabelPositionChange={applyAacLabelPosition}
      />

      <CanvasStage
        containerRef={containerRef}
        canvasRef={canvasRef}
        padding={padding}
        paperWidth={paperWidth}
        paperHeight={paperHeight}
        scale={scale}
        selectedPage={selectedPage}
        activeOrientation={activeOrientation}
        selectedIds={selectedIds}
        editingTextId={editingTextId}
        onClearSelection={handleClearSelection}
        onSelectedIdsChange={setSelectedIds}
        onEditingTextIdChange={setEditingTextId}
        onElementsChange={handleElementsChange}
        onInteractionChange={handleInteractionChange}
        aiTipKey={location.key}
      />
      <BottomBar
        pages={pages}
        selectedPageId={selectedPageId}
        onAddPage={handleAddPage}
        onSelectPage={handleSelectPage}
        onCopyPage={handleCopyPage}
        onPastePage={handlePastePage}
        onReorderPages={handleReorderPages}
        onDeletePage={handleDeletePage}
        onAddPageAtIndex={handleAddPageAtIndex}
        onMovePage={handleMovePage}
        onDuplicatePage={handleDuplicatePage}
      />
      <PdfPreviewContainer pages={pages} fallbackOrientation={orientation} />

      <TemplateChoiceDialog
        open={!!templateChoiceDialog}
        onClose={() => {
          setTemplateChoiceDialog(null);
        }}
        onApplyCurrent={handleApplyTemplateToCurrent}
        onApplyNew={handleApplyTemplateToNew}
      />
    </div>
  );
};

export default MainSection;
