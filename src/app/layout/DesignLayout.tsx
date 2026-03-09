import {
  Home,
  FolderOpen,
  Save,
  Undo,
  Redo,
  Monitor,
  Smartphone,
  Printer,
  Plus,
  Minus,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useUnifiedHistoryStore } from "@/features/editor/store/unifiedHistoryStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import PdfPreviewContainer from "@/features/editor/shared/PdfPreviewContainer";
import {
  usePageSwapStore,
  waitForHydration,
} from "@/features/editor/store/pageSwapStore";
import { useDocumentLoader } from "@/features/editor/hooks/useDocumentLoader";
import { useDocumentSave } from "@/features/editor/hooks/useDocumentSave";
import { useExportModal } from "@/features/editor/hooks/useExportModal";
import { useOrientationControl } from "@/features/editor/hooks/useOrientationControl";

const ExportModal = lazy(
  () => import("@/features/editor/shared/ExportModal"),
);

const DesignLayout = () => {
  const navigate = useNavigate();
  const { docId } = useParams<{ docId?: string }>();
  const [zoom, setZoom] = useState<number>(100);
  const [isPdfPreviewActive, setIsPdfPreviewActive] = useState(false);

  const { docName, setDocName, loadedDocument, loadedDocumentId, clearLoadedDocument } =
    useDocumentLoader({ docId });

  const {
    isSaving,
    autoSaveState,
    setAutoSaveState,
    lastSavedUserMadeId,
    setLastSavedUserMadeId,
    handleSave,
    registerCanvasGetter,
    getCanvasData,
    getName,
    setRetryAutoSave,
    setManualSave,
    retryAutoSave,
    registerSpellCheckApplier,
    applySpellCorrections,
  } = useDocumentSave({ docId, docName });

  const {
    isExportModalOpen,
    exportModalKey,
    exportUserId,
    students,
    groups,
    isLoadingTargets,
    handleOpenExportModal,
    closeExportModal,
  } = useExportModal();

  const {
    effectiveOrientation,
    setOrientation,
    isHorizontalDisabled,
    isVerticalDisabled,
    handleOrientationChange,
  } = useOrientationControl();

  const toastMessage = useToastStore((state) => state.message);
  const clearToast = useToastStore((state) => state.clearToast);
  const toastTimeoutRef = useRef<number | null>(null);
  const canUndo = useUnifiedHistoryStore((state) => state.canUndo);
  const canRedo = useUnifiedHistoryStore((state) => state.canRedo);
  const requestUndo = useUnifiedHistoryStore((state) => state.requestUndo);
  const requestRedo = useUnifiedHistoryStore((state) => state.requestRedo);
  const setPdfExporting = usePageSwapStore((state) => state.setPdfExporting);

  useEffect(() => {
    if (!toastMessage) return;
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      clearToast();
      toastTimeoutRef.current = null;
    }, 2000);
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [toastMessage, clearToast]);

  const handleZoomIn = () => {
    if (zoom < 200) {
      setZoom(zoom + 10);
    }
  };

  const handleZoomOut = () => {
    if (zoom > 10) {
      setZoom(zoom - 10);
    }
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const preparePdfPages = async () => {
    // pdfPreviewActive를 먼저 true로 설정해 React가 렌더하고
    // usePageSwap의 requiredPageIds가 모든 페이지를 포함하도록 만든다.
    setIsPdfPreviewActive(true);
    usePageSwapStore.getState().setPdfPreviewActive(true);

    // React 렌더 사이클이 완료되어 requiredPageIds가 전체 페이지로 확장될 때까지 대기한다.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    // requiredPageIds가 모든 페이지를 포함한 상태에서 hydration을 요청한다.
    const requestId = usePageSwapStore.getState().requestHydration();
    await waitForHydration(requestId);

    // 레이아웃 안정화를 위한 추가 RAF
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  };

  const cleanupPdfPages = () => {
    setIsPdfPreviewActive(false);
    usePageSwapStore.getState().setPdfPreviewActive(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <header className="shrink-0 flex w-full h-14 px-3 items-center justify-center border-b border-b-black-25 overflow-hidden">
        <div className="flex w-full h-12 items-center justify-between">
          {/* 좌측 */}
          <div className="flex h-full min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <button
              type="button"
              onClick={() => window.open("/", "_blank")}
              className="flex shrink-0 h-full items-center justify-center px-3 cursor-pointer"
              aria-label="홈으로 이동"
            >
              <Home className="h-8 w-8 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/mydoc")}
              className="flex shrink-0 h-full items-center justify-center px-3 cursor-pointer border-black-30 border-2 rounded-xl"
              aria-label="MyDoc으로 이동"
            >
              <FolderOpen className="h-6 w-6 text-black-40" />
            </button>

            <div className="flex min-w-0 shrink px-3 h-full items-center justify-center">
              <input
                placeholder="제목을 입력해주세요"
                value={docName}
                onChange={(event) => {
                  setDocName(event.target.value);
                }}
                className="flex w-72 min-w-0 shrink h-10 border border-transparent rounded-xl px-2 placeholder:text-black-50 focus:border-[#5500ff] focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap"
              />
            </div>

            <div className="flex shrink-0 h-full items-center justify-center gap-2 pr-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex h-10 w-10 rounded-xl items-center justify-center bg-black-20 transition hover:bg-black-30 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="저장"
              >
                <Save className="w-6 h-6 text-black-60" />
              </button>
              {docId && autoSaveState && (
                <div className="flex items-center gap-2">
                  {autoSaveState === "saving" && (
                    <div className="flex items-center gap-1.5 text-12-regular text-black-60">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>저장 중...</span>
                    </div>
                  )}
                  {autoSaveState === "saved" && (
                    <div className="flex items-center gap-1.5 text-12-regular text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>저장됨</span>
                    </div>
                  )}
                  {autoSaveState === "error" && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-12-regular text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>저장 안 됨</span>
                      </div>
                      <button
                        type="button"
                        onClick={retryAutoSave}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-12-regular text-red-600 transition hover:bg-red-100"
                        aria-label="재시도"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>재시도</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 h-8 w-px bg-black-25" />

            <div className="flex shrink-0 h-full items-center justify-center gap-2">
              <button
                type="button"
                onClick={canUndo ? requestUndo : undefined}
                className={`flex h-10 w-10 rounded-xl items-center justify-center transition ${
                  canUndo
                    ? "cursor-pointer hover:bg-black-20"
                    : "cursor-not-allowed opacity-40"
                }`}
                aria-label="뒤로가기"
                aria-disabled={!canUndo}
              >
                <Undo className="w-5 h-5 text-black-60" />
              </button>
              <button
                type="button"
                onClick={canRedo ? requestRedo : undefined}
                className={`flex h-10 w-10 rounded-xl items-center justify-center transition ${
                  canRedo
                    ? "cursor-pointer hover:bg-black-20"
                    : "cursor-not-allowed opacity-40"
                }`}
                aria-label="앞으로가기"
                aria-disabled={!canRedo}
              >
                <Redo className="w-5 h-5 text-black-60" />
              </button>
            </div>

            <div className="shrink-0 h-8 w-px bg-black-25" />

            <div className="flex shrink-0 h-full items-center justify-center px-3">
              <div className="flex h-10 rounded-xl bg-black-10 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    handleOrientationChange("horizontal");
                  }}
                  className={`flex h-8 px-3 rounded-lg items-center justify-center gap-1.5 transition ${
                    effectiveOrientation === "horizontal"
                      ? "bg-white-100 shadow-sm cursor-pointer"
                      : isHorizontalDisabled
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:bg-black-20"
                  }`}
                  aria-disabled={isHorizontalDisabled}
                  aria-label="가로 모드"
                >
                  <Monitor
                    className={`w-4 h-4 ${
                      effectiveOrientation === "horizontal"
                        ? "text-primary"
                        : isHorizontalDisabled
                          ? "text-black-40"
                          : "text-black-60"
                    }`}
                  />
                  <span
                    className={`text-12-medium ${
                      effectiveOrientation === "horizontal"
                        ? "text-primary"
                        : isHorizontalDisabled
                          ? "text-black-40"
                          : "text-black-60"
                    }`}
                  >
                    가로
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOrientationChange("vertical");
                  }}
                  className={`flex h-8 px-3 rounded-lg items-center justify-center gap-1.5 transition ${
                    effectiveOrientation === "vertical"
                      ? "bg-white-100 shadow-sm cursor-pointer"
                      : isVerticalDisabled
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:bg-black-20"
                  }`}
                  aria-disabled={isVerticalDisabled}
                  aria-label="세로 모드"
                >
                  <Smartphone
                    className={`w-4 h-4 ${
                      effectiveOrientation === "vertical"
                        ? "text-primary"
                        : isVerticalDisabled
                          ? "text-black-40"
                          : "text-black-60"
                    }`}
                  />
                  <span
                    className={`text-12-medium ${
                      effectiveOrientation === "vertical"
                        ? "text-primary"
                        : isVerticalDisabled
                          ? "text-black-40"
                          : "text-black-60"
                    }`}
                  >
                    세로
                  </span>
                </button>
              </div>
            </div>

            <div className="flex shrink-0 h-full items-center justify-center gap-2 px-3">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 10}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black-10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="축소"
              >
                <Minus className="w-4 h-4 text-black-60" />
              </button>
              <span className="text-14-medium text-black-80 min-w-12 text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black-10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="확대"
              >
                <Plus className="w-4 h-4 text-black-60" />
              </button>
              <button
                onClick={handleResetZoom}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black-10 transition cursor-pointer"
                aria-label="원래 크기로"
              >
                <RotateCcw className="w-4 h-4 text-black-60" />
              </button>
            </div>
          </div>

          <div className="flex h-full shrink-0 items-center gap-3 pr-3">
            <div className="flex h-full items-center justify-center">
              <button
                type="button"
                className="flex h-10 w-10 rounded-xl items-center justify-center bg-black-20 transition hover:bg-black-30"
                aria-label="프린트"
              >
                <Printer className="w-6 h-6 text-black-60" />
              </button>
            </div>
            <div className="flex h-full items-center justify-center">
              <button
                type="button"
                onClick={handleOpenExportModal}
                className="flex items-center rounded-xl border border-black-25 bg-white-100 px-3 py-2 text-14-semibold text-black-80 transition hover:border-black-40 hover:bg-black-10"
                aria-label="내보내기"
              >
                <span>내보내기</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      {toastMessage && (
        <div
          className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-14-medium shadow-lg ${
            toastMessage ===
            "자료 제작을 위한 기본세트 페이지 3장이 적용되었습니다."
              ? "bg-primary text-white"
              : "bg-black-90 text-white-100"
          }`}
        >
          {toastMessage}
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        <Outlet
          context={{
            zoom,
            setZoom,
            orientation: effectiveOrientation,
            setOrientation,
            registerCanvasGetter,
            loadedDocument,
            clearLoadedDocument,
            loadedDocumentId,
            docId,
            docName,
            setAutoSaveState,
            setRetryAutoSave,
            setManualSave,
            registerSpellCheckApplier,
          }}
        />
      </main>
      {isExportModalOpen && (
        <Suspense fallback={null}>
          <ExportModal
            key={exportModalKey}
            open={isExportModalOpen}
            onClose={closeExportModal}
            userId={exportUserId}
            documentId={docId}
            autoSaveOnDownload
            getCanvasData={getCanvasData}
            getName={getName}
            lastSavedUserMadeId={lastSavedUserMadeId}
            onSavedUserMadeId={setLastSavedUserMadeId}
            students={students}
            groups={groups}
            isLoadingTargets={isLoadingTargets}
            preparePdfPages={preparePdfPages}
            cleanupPdfPages={cleanupPdfPages}
            onPdfExportStateChange={setPdfExporting}
            onApplySpellCorrections={applySpellCorrections}
          />
        </Suspense>
      )}
      {isPdfPreviewActive && (
        <PdfPreviewContainer
          pages={getCanvasData().pages ?? []}
          fallbackOrientation={effectiveOrientation}
        />
      )}
    </div>
  );
};

export default DesignLayout;
