/**
 * 문서 내보내기 옵션 선택과 실행 상태를 처리하는 모달 컴포넌트.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BaseModal from "@/shared/ui/BaseModal";
import { useToastStore } from "../store/toastStore";
import {
  assignUserMadeToTarget,
  downloadBlob,
  generatePdfFromDomPages,
  saveUserMadeVersion,
} from "../utils/userMadeExport";
import { trackDownloadEvent } from "@/shared/utils/trackEvents";
import { mp } from "@/shared/utils/mixpanel";

type TargetType = "child" | "group";

type TargetOption = {
  id: string;
  name: string;
};

type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  getCanvasData: () => unknown;
  getName: () => string;
  lastSavedUserMadeId?: string | null;
  documentId?: string | null;
  autoSaveOnDownload?: boolean;
  onSavedUserMadeId: (id: string) => void;
  students: TargetOption[];
  groups: TargetOption[];
  isLoadingTargets: boolean;
  preparePdfPages?: () => Promise<void>;
  cleanupPdfPages?: () => void;
  onPdfExportStateChange?: (active: boolean) => void;
};

const parsePageRangeInput = (value: string, maxPageNumber: number) => {
  const sanitized = value.replace(/\s+/g, "");
  if (!sanitized) return [];
  const tokens = sanitized.split(",");
  const pages = new Set<number>();
  tokens.forEach((token) => {
    if (!token) return;
    const rangeDelimiter = token.includes("~")
      ? "~"
      : token.includes("-")
        ? "-"
        : null;
    if (rangeDelimiter) {
      const [startRaw, endRaw] = token.split(rangeDelimiter);
      if (!startRaw || !endRaw) return;
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return;
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      for (let i = from; i <= to; i += 1) {
        if (i < 1 || i > maxPageNumber) continue;
        pages.add(i);
      }
      return;
    }
    const num = Number(token);
    if (!Number.isFinite(num)) return;
    if (num < 1 || num > maxPageNumber) return;
    pages.add(num);
  });
  return Array.from(pages).sort((a, b) => a - b);
};

const ExportModal = ({
  open,
  onClose,
  userId,
  getCanvasData,
  getName,
  lastSavedUserMadeId = null,
  documentId = null,
  autoSaveOnDownload = false,
  onSavedUserMadeId,
  students,
  groups,
  isLoadingTargets,
  preparePdfPages,
  cleanupPdfPages,
  onPdfExportStateChange,
}: ExportModalProps) => {
  const showToast = useToastStore((state) => state.showToast);
  const [targetType, setTargetType] = useState<TargetType>("child");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pdfPageMode, setPdfPageMode] = useState<"all" | "selected">("all");
  const [pdfPageRangeInput, setPdfPageRangeInput] = useState("");

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      onPdfExportStateChange?.(false);
      cleanupPdfPages?.();
    };
  }, [cleanupPdfPages, onPdfExportStateChange]);

  const targets = targetType === "child" ? students : groups;
  const name = getName().trim() || "제목 없음";
  const canvasData = getCanvasData() as {
    pages?: Array<{ id?: unknown; pageNumber?: number }>;
  } | null;
  const canvasPages = Array.isArray(canvasData?.pages) ? canvasData.pages : [];
  const pageOptions = canvasPages
    .map((page, index) => ({
      id: typeof page?.id === "string" ? page.id : null,
      pageNumber:
        typeof page?.pageNumber === "number" ? page.pageNumber : index + 1,
    }))
    .filter((page): page is { id: string; pageNumber: number } => !!page.id);
  const maxPageNumber = pageOptions.reduce(
    (max, page) => Math.max(max, page.pageNumber),
    0
  );
  const minPageNumber = pageOptions.reduce(
    (min, page) => Math.min(min, page.pageNumber),
    maxPageNumber
  );
  const parsedPageNumbers = parsePageRangeInput(
    pdfPageRangeInput,
    maxPageNumber
  );
  const parsedPageIds = (() => {
    if (parsedPageNumbers.length === 0) return [];
    const map = new Map(
      pageOptions.map((page) => [page.pageNumber, page.id])
    );
    return parsedPageNumbers
      .map((pageNumber) => map.get(pageNumber))
      .filter((id): id is string => Boolean(id));
  })();
  const fullRangeLabel =
    minPageNumber > 0 ? `${minPageNumber}~${maxPageNumber}` : "";

  const handleSaveToTarget = async () => {
    if (!userId) {
      showToast("로그인이 필요해요.");
      return;
    }
    if (!targetId) {
      showToast("대상을 선택해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      let userMadeId = lastSavedUserMadeId;
      if (!userMadeId) {
        const { id } = await saveUserMadeVersion({
          userId,
          name,
          canvasData: getCanvasData(),
        });
        userMadeId = id;
        onSavedUserMadeId(id);
      }
      await assignUserMadeToTarget({
        userMadeId,
        targetType,
        targetId,
      });
      mp.track("대상에 저장", { target_type: targetType });
      showToast("저장했습니다.");
      onClose();
    } catch {
      showToast("저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfPageMode === "selected" && parsedPageIds.length === 0) {
      showToast("내보낼 페이지를 선택해주세요.");
      return;
    }
    setIsDownloading(true);
    onPdfExportStateChange?.(true);
    try {
      abortControllerRef.current = new AbortController();
      let userMadeId = lastSavedUserMadeId ?? documentId ?? null;
      if (preparePdfPages) {
        await preparePdfPages();
      }
      if (autoSaveOnDownload && !userMadeId) {
        if (!userId) {
          showToast("로그인이 필요해요.");
          return;
        }
        const { id } = await saveUserMadeVersion({
          userId,
          name,
          canvasData: getCanvasData(),
        });
        userMadeId = id;
        onSavedUserMadeId(id);
      }
      const pageIds = pdfPageMode === "selected" ? parsedPageIds : undefined;
      const blob = await generatePdfFromDomPages({
        quality: 2,
        pageIds,
        signal: abortControllerRef.current.signal,
        onProgress: setPdfProgress,
      });
      void trackDownloadEvent(userId, userMadeId);
      mp.track("PDF 다운로드", { page_mode: pdfPageMode });
      downloadBlob(blob, `${name}.pdf`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showToast("PDF 생성을 취소했어요.");
        return;
      }
      console.error("[PDF Export] 실패:", error);
      showToast("PDF를 만들지 못했어요.");
    } finally {
      abortControllerRef.current = null;
      setPdfProgress(null);
      onPdfExportStateChange?.(false);
      cleanupPdfPages?.();
      setIsDownloading(false);
    }
  };
  const handleCancelPdf = () => {
    abortControllerRef.current?.abort();
  };
  const handleSelectAllPdfPages = () => {
    setPdfPageRangeInput(fullRangeLabel);
  };

  const handleClearPdfPages = () => {
    setPdfPageRangeInput("");
  };

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      title="내보내기"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">저장 대상</span>
          <div className="flex gap-2">
            {(["child", "group"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTargetType(type);
                  setTargetId(null);
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-14-semibold transition ${
                  targetType === type
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-black-25 text-black-70 hover:border-black-40"
                }`}
              >
                {type === "child" ? "아동" : "그룹"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">
            {targetType === "child" ? "아동 선택" : "그룹 선택"}
          </span>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-black-25 p-2">
            {isLoadingTargets ? (
              <div className="flex items-center justify-center py-6 text-14-regular text-black-50">
                불러오는 중입니다.
              </div>
            ) : targets.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-14-regular text-black-50">
                선택할 수 있는 대상이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {targets.map((target) => {
                  const isSelected = targetId === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => { setTargetId(target.id); }}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-14-regular transition ${
                        isSelected
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      <span>{target.name}</span>
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-black-30"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">PDF 페이지</span>
          <div className="flex gap-2">
            {(["all", "selected"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setPdfPageMode(mode); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-14-semibold transition ${
                  pdfPageMode === mode
                    ? "border-primary bg-primary-50 text-primary"
                    : "border-black-25 text-black-70 hover:border-black-40"
                }`}
              >
                {mode === "all" ? "전체" : "선택"}
              </button>
            ))}
          </div>
          {pdfPageMode === "selected" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-12-regular text-black-60">
                  내보낼 페이지 선택
                </span>
                <div className="flex gap-2 text-12-regular">
                  <button
                    type="button"
                    onClick={handleSelectAllPdfPages}
                    className="text-black-60 hover:text-black-90"
                  >
                    전체 입력
                  </button>
                  <button
                    type="button"
                    onClick={handleClearPdfPages}
                    className="text-black-60 hover:text-black-90"
                  >
                    선택 해제
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={pdfPageRangeInput}
                  onChange={(event) => { setPdfPageRangeInput(event.target.value); }}
                  placeholder="예) 1,2 or 1~3"
                  className="w-full rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-90 placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors"
                />
                <div className="text-12-regular text-black-60">
                  {parsedPageNumbers.length > 0
                    ? `선택된 페이지: ${parsedPageNumbers.join(", ")}`
                    : "선택된 페이지가 없습니다."}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isDownloading && (
            <div className="rounded-lg border border-black-25 bg-black-5 px-3 py-2">
              <div className="flex items-center gap-2 text-13-bold text-black-80">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  PDF 생성 중
                  {pdfProgress ? ` (${pdfProgress.current}/${pdfProgress.total})` : ""}
                </span>
              </div>
              <p className="mt-1 text-12-regular text-black-60">
                페이지 수가 많으면 시간이 걸릴 수 있어요.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveToTarget}
            disabled={isSaving || !targetId || isLoadingTargets}
            className="w-full rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "대상에 저장"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full rounded-lg border border-black-25 py-3 text-14-semibold text-black-90 transition hover:border-black-40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading ? "PDF 생성 중..." : "PDF 다운로드"}
          </button>
          {isDownloading && (
            <button
              type="button"
              onClick={handleCancelPdf}
              className="w-full rounded-lg border border-red-200 py-3 text-14-semibold text-red-600 transition hover:bg-red-50"
            >
              PDF 생성 취소
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default ExportModal;
