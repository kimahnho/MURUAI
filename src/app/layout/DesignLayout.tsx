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
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/shared/supabase/supabase";
import { useTemplateStore } from "@/features/editor/store/templateStore";
import { TEMPLATE_REGISTRY } from "@/features/editor/templates/templateRegistry";
import { useOrientationStore } from "@/features/editor/store/orientationStore";
import { useUnifiedHistoryStore } from "@/features/editor/store/unifiedHistoryStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import { images } from "@/shared/assets";
import ExportModal from "@/features/editor/ui/parts/ExportModal";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import {
  saveUserMadeVersion,
  updateUserMadeVersion,
} from "@/features/editor/utils/userMadeExport";

type TargetOption = {
  id: string;
  name: string;
};

const DesignLayout = () => {
  const orientation = useOrientationStore((state) => state.orientation);
  const setOrientation = useOrientationStore((state) => state.setOrientation);
  const navigate = useNavigate();
  const [zoom, setZoom] = useState<number>(100);
  const [docName, setDocName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNewDoc, setIsCreatingNewDoc] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "saving" | "saved" | "error" | null
  >(null);
  const retryAutoSaveRef = useRef<(() => void) | null>(null);
  const manualSaveRef = useRef<(() => void) | null>(null);
  const { docId } = useParams<{ docId?: string }>();
  const [loadedDocument, setLoadedDocument] = useState<CanvasDocument | null>(
    null,
  );
  const [loadedDocumentId, setLoadedDocumentId] = useState<string | null>(null);
  const [lastSavedUserMadeId, setLastSavedUserMadeId] = useState<string | null>(
    null,
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalKey, setExportModalKey] = useState(0);
  const [exportUserId, setExportUserId] = useState<string | null>(null);
  const [students, setStudents] = useState<TargetOption[]>([]);
  const [groups, setGroups] = useState<TargetOption[]>([]);
  // const [isMobile, setIsMobile] = useState(() =>
  //   typeof window !== "undefined"
  //     ? window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches
  //     : false,
  // );
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const canvasGetterRef = useRef<() => CanvasDocument>(() => ({ pages: [] }));
  const toastMessage = useToastStore((state) => state.message);
  const showToast = useToastStore((state) => state.showToast);
  const clearToast = useToastStore((state) => state.clearToast);
  const toastTimeoutRef = useRef<number | null>(null);
  const canUndo = useUnifiedHistoryStore((state) => state.canUndo);
  const canRedo = useUnifiedHistoryStore((state) => state.canRedo);
  const requestUndo = useUnifiedHistoryStore((state) => state.requestUndo);
  const requestRedo = useUnifiedHistoryStore((state) => state.requestRedo);
  const registerCanvasGetter = useCallback((getter: () => CanvasDocument) => {
    canvasGetterRef.current = getter;
  }, []);
  const clearLoadedDocument = useCallback(() => {
    setLoadedDocument(null);
  }, []);
  const getCanvasData = useCallback(() => canvasGetterRef.current(), []);
  const getName = useCallback(() => docName.trim() || "제목 없음", [docName]);

  const setRetryAutoSave = useCallback((retryFn: () => void) => {
    retryAutoSaveRef.current = retryFn;
  }, []);

  const setManualSave = useCallback((saveFn: () => void) => {
    manualSaveRef.current = saveFn;
  }, []);

  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const activeTemplate = selectedTemplate
    ? TEMPLATE_REGISTRY[selectedTemplate]
    : null;
  const isVerticalLocked = activeTemplate?.orientation === "vertical-only";
  const isHorizontalLocked = activeTemplate?.orientation === "horizontal-only";
  const effectiveOrientation = isVerticalLocked
    ? "vertical"
    : isHorizontalLocked
      ? "horizontal"
      : orientation;
  const isHorizontalDisabled = isVerticalLocked;
  const isVerticalDisabled = isHorizontalLocked;

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

  // useEffect(() => {
  //   const mediaQuery = window.matchMedia(
  //     "(max-width: 1024px), (pointer: coarse)",
  //   );
  //   const updateIsMobile = () => setIsMobile(mediaQuery.matches);
  //   updateIsMobile();
  //   if (mediaQuery.addEventListener) {
  //     mediaQuery.addEventListener("change", updateIsMobile);
  //   } else {
  //     mediaQuery.addListener(updateIsMobile);
  //   }
  //   return () => {
  //     if (mediaQuery.removeEventListener) {
  //       mediaQuery.removeEventListener("change", updateIsMobile);
  //     } else {
  //       mediaQuery.removeListener(updateIsMobile);
  //     }
  //   };
  // }, []);

  useEffect(() => {
    if (window.location.pathname === "/design" && !isCreatingNewDoc) {
      setIsCreatingNewDoc(true);
      const createNewDocument = async () => {
        try {
          const { data } = await supabase.auth.getUser();
          const user = data.user;
          if (!user) {
            showToast("로그인이 필요해요.");
            setIsCreatingNewDoc(false);
            return;
          }
          const { id } = await saveUserMadeVersion({
            userId: user.id,
            name: "제목 없음",
            canvasData: { pages: [] },
          });
          navigate(`/${id}/edit`, { replace: true });
        } catch {
          showToast("새 문서를 만들지 못했어요.");
          setIsCreatingNewDoc(false);
        }
      };
      createNewDocument();
    }
  }, [navigate, showToast, isCreatingNewDoc]);

  useEffect(() => {
    if (!docId) {
      setLoadedDocument(null);
      setLoadedDocumentId(null);
      return;
    }
    if (docId === loadedDocumentId) return;
    let isMounted = true;
    const loadUserMade = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        showToast("로그인이 필요해요.");
        return;
      }
      const { data: row, error } = await supabase
        .from("user_made_n")
        .select("id,name,canvas_data")
        .eq("id", docId)
        .single();
      if (!isMounted) return;
      if (error || !row) {
        showToast("학습자료를 불러오지 못했어요.");
        return;
      }
      let canvasData: unknown = row.canvas_data;
      if (typeof canvasData === "string") {
        try {
          canvasData = JSON.parse(canvasData);
        } catch {
          showToast("학습자료 형식이 올바르지 않아요.");
          return;
        }
      }
      if (!canvasData || !Array.isArray((canvasData as CanvasDocument).pages)) {
        showToast("학습자료 형식이 올바르지 않아요.");
        return;
      }
      setDocName(row.name ?? "");
      setLoadedDocument(canvasData as CanvasDocument);
      setLoadedDocumentId(row.id);
      setLastSavedUserMadeId(row.id);
      const initialOrientation = (canvasData as CanvasDocument).pages[0]
        ?.orientation;
      if (
        initialOrientation === "horizontal" ||
        initialOrientation === "vertical"
      ) {
        setOrientation(initialOrientation);
      }
    };
    loadUserMade();
    return () => {
      isMounted = false;
    };
  }, [loadedDocumentId, docId, showToast, setOrientation]);

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

  const handleOrientationChange = (next: "horizontal" | "vertical") => {
    if (next === "horizontal" && isVerticalLocked) {
      showToast("해당 템플릿은 세로 버전만 지원합니다.");
      return;
    }
    if (next === "vertical" && isHorizontalLocked) {
      showToast("해당 템플릿은 가로 버전만 지원합니다.");
      return;
    }
    setOrientation(next);
  };

  const handleSave = async () => {
    // manualSave가 설정되어 있으면 사용 (자동 저장 훅 활용)
    if (manualSaveRef.current) {
      manualSaveRef.current();
      return;
    }

    // 폴백: 기존 저장 로직
    setIsSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        showToast("로그인이 필요해요.");
        return;
      }
      if (docId) {
        await updateUserMadeVersion({
          docId,
          name: getName(),
          canvasData: getCanvasData(),
        });
        setLastSavedUserMadeId(docId);
        showToast("저장했습니다.");
      } else {
        const { id } = await saveUserMadeVersion({
          userId: user.id,
          name: getName(),
          canvasData: getCanvasData(),
        });
        setLastSavedUserMadeId(id);
        navigate(`/${id}/edit`, { replace: true });
        showToast("저장했습니다.");
      }
    } catch {
      showToast("저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenExportModal = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      showToast("로그인이 필요해요.");
      return;
    }
    setExportUserId(user.id);
    setIsExportModalOpen(true);
    setExportModalKey((prev) => prev + 1);
    setStudents([]);
    setGroups([]);
    setIsLoadingTargets(true);
    try {
      const [studentsResult, groupsResult] = await Promise.all([
        supabase.from("students_n").select("id,name").is("deleted_at", null),
        supabase.from("groups_n").select("id,name").is("deleted_at", null),
      ]);

      if (studentsResult.error) {
        showToast("아동 목록을 불러오지 못했어요.");
      }
      if (groupsResult.error) {
        showToast("그룹 목록을 불러오지 못했어요.");
      }

      setStudents((studentsResult.data as TargetOption[] | null) ?? []);
      setGroups((groupsResult.data as TargetOption[] | null) ?? []);
    } catch {
      showToast("대상을 불러오지 못했어요.");
    } finally {
      setIsLoadingTargets(false);
    }
  };

  // if (isMobile) {
  //   return (
  //     <div className="flex h-screen w-screen items-center justify-center bg-white-100">
  //       <div className="flex flex-col items-center gap-4">
  //         <img
  //           src={images.mainLogo}
  //           alt="Muruai logo"
  //           className="h-28 w-auto"
  //         />
  //         <p className="text-title-20-semibold text-black-80">
  //           PC에서 접속해주세요
  //         </p>
  //         <button
  //           type="button"
  //           onClick={() => navigate("/")}
  //           className="mt-2 rounded-full border border-black-30 bg-white-100 px-6 py-2 text-14-semibold text-black-80 transition hover:border-black-40 hover:bg-black-10"
  //         >
  //           홈으로 이동하기
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <header className="shrink-0 flex w-full h-14 px-3 items-center justify-center border-b border-b-black-25">
        <div className="flex w-full h-12 items-center justify-between">
          {/* 좌측 */}
          <div className="flex h-full items-center gap-2">
            <button
              type="button"
              onClick={() => window.open("/", "_blank")}
              className="flex h-full items-center justify-center px-3 cursor-pointer"
              aria-label="홈으로 이동"
            >
              <Home className="h-8 w-8 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/mydoc")}
              className="flex h-full items-center justify-center px-3 cursor-pointer border-black-30 border-2 rounded-xl"
              aria-label="MyDoc으로 이동"
            >
              <FolderOpen className="h-6 w-6 text-black-40" />
            </button>

            <div className="flex px-3 h-full items-center justify-center">
              <input
                placeholder="제목을 입력해주세요"
                value={docName}
                onChange={(event) => {
                  setDocName(event.target.value);
                }}
                className="flex w-72 h-10 border border-transparent rounded-xl px-2 placeholder:text-black-50 focus:border-[#5500ff] focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap"
              />
            </div>

            <div className="flex h-full items-center justify-center gap-2 pr-3">
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
                        onClick={() => {
                          retryAutoSaveRef.current?.();
                        }}
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

            <div className="h-8 w-px bg-black-25" />

            <div className="flex h-full items-center justify-center gap-2">
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

            <div className="h-8 w-px bg-black-25" />

            <div className="flex h-full items-center justify-center px-3">
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

            <div className="flex h-full items-center justify-center gap-2 px-3">
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

          <div className="flex h-full items-center gap-3 pr-3">
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
          }}
        />
      </main>
      <ExportModal
        key={exportModalKey}
        open={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
        }}
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
      />
    </div>
  );
};

export default DesignLayout;
