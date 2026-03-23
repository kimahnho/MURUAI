import {
  Home,
  FolderOpen,
  Save,
  Pencil,
  Undo,
  Redo,
  Monitor,
  Smartphone,
  Plus,
  Minus,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  SpellCheck,
  WifiOff,
} from "lucide-react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useUnifiedHistoryStore } from "@/features/editor/store/unifiedHistoryStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useSpellCheckStore, buildCorrectionKey } from "@/features/editor/store/spellCheckStore";
import PdfPreviewContainer from "@/features/editor/shared/PdfPreviewContainer";
import {
  usePageSwapStore,
  waitForForceHydrate,
} from "@/features/editor/store/pageSwapStore";
import {
  getAdaptiveCaptureScale,
  waitForPdfFonts,
  waitForPdfImages,
  waitForNextFrame,
  doubleRaf,
  resolvePageOrientation,
  assemblePdf,
  isLikelyBlankCapture,
} from "@/features/editor/utils/userMadeExport";
import type { PdfPageCapture } from "@/features/editor/utils/userMadeExport";
import { measurePerf } from "@/features/editor/utils/perfLogger";
import { useDocumentLoader } from "@/features/editor/hooks/useDocumentLoader";
import { useDocumentSave } from "@/features/editor/hooks/useDocumentSave";
import { useExportModal } from "@/features/editor/hooks/useExportModal";
import { useOrientationControl } from "@/features/editor/hooks/useOrientationControl";
import { extractTextsFromPages } from "@/features/editor/utils/spellCheckTextExtractor";
import { checkSpelling } from "@/features/editor/ai/checkSpelling";
import type { Page } from "@/features/editor/model/pageTypes";
import { mp } from "@/shared/utils/mixpanel";

const ExportModal = lazy(
  () => import("@/features/editor/shared/ExportModal"),
);
const CreditExhaustedModal = lazy(
  () => import("@/features/editor/shared/CreditExhaustedModal"),
);

const DesignLayout = () => {
  const navigate = useNavigate();
  const { docId } = useParams<{ docId?: string }>();
  const [zoom, setZoom] = useState<number>(100);
  const [pdfBatchPages, setPdfBatchPages] = useState<Page[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); };
    const handleOffline = () => { setIsOffline(true); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  const spellCheckResults = useSpellCheckStore((s) => s.results);
  const isSpellChecking = useSpellCheckStore((s) => s.isChecking);
  const setIsSpellChecking = useSpellCheckStore((s) => s.setIsChecking);
  const setSpellCheckResults = useSpellCheckStore((s) => s.setResults);
  const isPanelOpen = useSpellCheckStore((s) => s.isPanelOpen);
  const openSpellCheckPanel = useSpellCheckStore((s) => s.openPanel);
  const closeSpellCheckPanel = useSpellCheckStore((s) => s.closePanel);
  const showSpellCheckToast = useSpellCheckStore((s) => s.showToast);
  const spellCheckActionMap = useSpellCheckStore((s) => s.actionMap);
  const recheckRequested = useSpellCheckStore((s) => s.recheckRequested);
  const clearRecheckRequest = useSpellCheckStore((s) => s.clearRecheckRequest);

  const toastMessage = useToastStore((state) => state.message);
  const clearToast = useToastStore((state) => state.clearToast);
  const showToast = useToastStore((state) => state.showToast);
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

  // 맞춤법 검사 실행 (패널 열기 + API 호출)
  const runSpellCheck = async () => {
    setIsSpellChecking(true);
    openSpellCheckPanel();
    mp.track("맞춤법 검사 시작");
    try {
      const data = getCanvasData() as { pages?: Page[] } | null;
      const pages = Array.isArray(data?.pages) ? data.pages : [];
      const textItems = extractTextsFromPages(pages);

      if (textItems.length === 0) {
        showToast("검사할 텍스트가 없습니다.");
        setIsSpellChecking(false);
        closeSpellCheckPanel();
        return;
      }

      const results = await checkSpelling(textItems);
      setSpellCheckResults(results);

      const totalCount = results.reduce((sum, r) => sum + r.corrections.length, 0);
      if (totalCount > 0) {
        showSpellCheckToast();
      } else {
        showToast("맞춤법 오류가 없습니다.", "success");
        closeSpellCheckPanel();
      }
    } catch {
      showToast("맞춤법 검사에 실패했어요. 다시 시도해 주세요.");
      closeSpellCheckPanel();
    } finally {
      setIsSpellChecking(false);
    }
  };

  // 맞춤법 검사 버튼 클릭: 결과 있으면 패널 토글, 없으면 검사 실행
  const handleSpellCheckClick = () => {
    if (spellCheckResults) {
      if (isPanelOpen) {
        closeSpellCheckPanel();
      } else {
        openSpellCheckPanel();
      }
      return;
    }
    void runSpellCheck();
  };

  // 패널에서 재검사 요청 시 검사 재실행
  useEffect(() => {
    if (recheckRequested) {
      clearRecheckRequest();
      void runSpellCheck();
    }
  }, [recheckRequested]);

  const PDF_BATCH_SIZE = 5;

  // 전체 하이드레이션 → 배치별 렌더/캡처 → PDF 조립까지 수행하고 Blob을 반환한다.
  const generatePdf = useCallback(async ({
    quality = 2,
    pageIds,
    onProgress,
    signal,
  }: {
    quality?: number;
    pageIds?: string[];
    onProgress?: (progress: { current: number; total: number }) => void;
    signal?: AbortSignal;
  }): Promise<Blob> => {
    return measurePerf("pdf.generate.total", async () => {
      // Phase 1: 전체 페이지 하이드레이션 (스왑된 페이지를 IndexedDB에서 복원)
      usePageSwapStore.getState().setPdfPreviewActive(true);
      const forceId = usePageSwapStore.getState().requestForceHydrate();
      const allPages = (getCanvasData() as { pages?: Page[] }).pages ?? [];
      const dynamicTimeout = Math.max(10_000, 5_000 + allPages.length * 500);
      await waitForForceHydrate(forceId, dynamicTimeout);

      // Phase 2: 하이드레이션 후 최신 페이지 읽기 + 필터
      const hydratedPages = ((getCanvasData() as { pages?: Page[] }).pages ?? []).filter(
        (p) => !pageIds || pageIds.length === 0 || pageIds.includes(p.id),
      );
      if (hydratedPages.length === 0) {
        usePageSwapStore.getState().setPdfPreviewActive(false);
        throw new Error("No pages to export");
      }
      if (signal?.aborted) {
        usePageSwapStore.getState().setPdfPreviewActive(false);
        throw new DOMException("PDF generation aborted", "AbortError");
      }
      onProgress?.({ current: 0, total: hydratedPages.length });

      // Phase 3: 라이브러리 로드
      const [htmlToImage, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);

      // Phase 4: 배치별 렌더 + 캡처
      const captures: PdfPageCapture[] = [];
      let fontLoaded = false;

      try {
        for (let batchStart = 0; batchStart < hydratedPages.length; batchStart += PDF_BATCH_SIZE) {
          if (signal?.aborted) {
            throw new DOMException("PDF generation aborted", "AbortError");
          }

          const batch = hydratedPages.slice(batchStart, batchStart + PDF_BATCH_SIZE);

          // 배치 마운트
          flushSync(() => { setPdfBatchPages(batch); });
          await doubleRaf();

          const pageElements = Array.from(
            document.querySelectorAll<HTMLElement>(".pdf-page"),
          );

          // 첫 배치에서만 폰트 로드
          if (!fontLoaded && pageElements.length > 0) {
            await waitForPdfFonts(pageElements);
            fontLoaded = true;
          }

          for (const pageEl of pageElements) {
            if (signal?.aborted) {
              throw new DOMException("PDF generation aborted", "AbortError");
            }

            await waitForPdfImages(pageEl);
            await waitForNextFrame();

            const rect = pageEl.getBoundingClientRect();
            const width = Math.ceil(pageEl.offsetWidth || rect.width);
            const height = Math.ceil(pageEl.offsetHeight || rect.height);
            const adaptiveScale = getAdaptiveCaptureScale({
              requestedQuality: quality,
              width,
              height,
            });

            const dataUrl = await htmlToImage.toJpeg(pageEl, {
              pixelRatio: adaptiveScale,
              backgroundColor: "#ffffff",
              skipFonts: false,
              fetchRequestInit: { cache: "force-cache" },
            });

            if (isLikelyBlankCapture(dataUrl)) {
              console.warn(
                `[PDF] 빈 페이지 의심: pageId=${pageEl.dataset.pageId}, size=${dataUrl.length}`,
              );
            }

            const orientation = resolvePageOrientation(pageEl);
            captures.push({ dataUrl, orientation });
          }

          onProgress?.({
            current: Math.min(batchStart + batch.length, hydratedPages.length),
            total: hydratedPages.length,
          });

          // 배치 간 이벤트 루프 양보
          await new Promise<void>((r) => { setTimeout(r, 0); });
        }

        // Phase 5: PDF 조립
        return assemblePdf(captures, jsPDF);
      } finally {
        // Cleanup: 배치 페이지 언마운트 + PDF 프리뷰 비활성화
        flushSync(() => { setPdfBatchPages([]); });
        usePageSwapStore.getState().setPdfPreviewActive(false);
      }
    }, { quality, requestedPageCount: pageIds?.length ?? 0 });
  }, [getCanvasData]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <header className="shrink-0 flex w-full h-14 px-3 items-center justify-center border-b border-b-black-25 overflow-hidden">
        <div className="flex w-full h-12 items-center justify-between">
          {/* 좌측 */}
          <div className="flex h-full min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <button
              type="button"
              onClick={() => window.open("/", "_blank")}
              className="flex shrink-0 w-10 h-10 items-center justify-center rounded-lg cursor-pointer hover:bg-black-10 transition"
              aria-label="홈으로 이동"
            >
              <Home className="h-6 w-6 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/mydoc")}
              className="flex shrink-0 w-10 h-10 items-center justify-center rounded-lg cursor-pointer hover:bg-black-10 transition"
              aria-label="MyDoc으로 이동"
            >
              <FolderOpen className="h-6 w-6 text-black-70" />
            </button>

            <div className="group/title flex min-w-0 shrink h-full items-center px-1">
              <div className="relative flex items-center">
                <input
                  placeholder="제목을 입력해주세요"
                  value={docName}
                  onChange={(event) => {
                    setDocName(event.target.value);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-60 min-w-0 shrink h-9 rounded-xl bg-black-5 px-3 pr-9 text-14-semibold text-black-90 placeholder:text-black-40 border border-black-20 hover:bg-black-10 hover:border-black-30 focus:bg-white-100 focus:border-primary focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap transition"
                />
                <Pencil className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-black-30 opacity-0 group-hover/title:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex shrink-0 h-full items-center justify-center gap-2 pr-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex h-10 w-10 rounded-lg items-center justify-center transition hover:bg-black-10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="저장"
              >
                <Save className="w-5 h-5 text-black-60" />
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
            {/* 맞춤법 검사 버튼 */}
            <div className="relative flex h-full items-center justify-center">
              <button
                type="button"
                onClick={handleSpellCheckClick}
                disabled={isSpellChecking}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-14-semibold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isPanelOpen
                    ? "bg-primary text-white-100"
                    : "border border-primary bg-primary-100 text-primary hover:bg-primary-200"
                }`}
                aria-label="맞춤법 검사"
              >
                {isSpellChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>검사 중...</span>
                  </>
                ) : (
                  <>
                    <SpellCheck className="h-4 w-4" />
                    <span>맞춤법 검사</span>
                  </>
                )}
              </button>
              {/* 대기 중인 오류 건수 뱃지 */}
              {spellCheckResults && (() => {
                const count = spellCheckResults.reduce((sum, r) => {
                  return sum + r.corrections.filter((_, idx) => {
                    const key = buildCorrectionKey(r.elementId, r.field, idx);
                    return !spellCheckActionMap.has(key);
                  }).length;
                }, 0);
                return count > 0 ? (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-12-semibold text-white-100 shadow-sm" style={{ fontSize: "10px" }}>
                    {count}
                  </span>
                ) : null;
              })()}
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
          className={`fixed left-1/2 top-5 z-10000 -translate-x-1/2 rounded-full px-4 py-2 text-14-medium shadow-lg ${
            toastMessage ===
            "자료 제작을 위한 기본세트 페이지 3장이 적용되었습니다."
              ? "bg-primary text-white"
              : "bg-black-90 text-white-100"
          }`}
        >
          {toastMessage}
        </div>
      )}
      {isOffline && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 shrink-0">
          <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-13-semibold text-amber-700">
            인터넷 연결이 불안정해요. 연결 후 자동 저장됩니다.
          </span>
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
            onNetworkError: () => { setIsOffline(true); },
            setRetryAutoSave,
            setManualSave,
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
            generatePdf={generatePdf}
            onPdfExportStateChange={setPdfExporting}
          />
        </Suspense>
      )}
      {pdfBatchPages.length > 0 && (
        <PdfPreviewContainer
          pages={pdfBatchPages}
          fallbackOrientation={effectiveOrientation}
        />
      )}
      <CreditExhaustedModal />
    </div>
  );
};

export default DesignLayout;
