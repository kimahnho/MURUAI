/**
 * 수동 저장 시 사용자 문서 payload를 구성하고 저장 결과 UI 상태를 관리하는 훅.
 */
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
import { useToastStore } from "../store/toastStore";
import { measurePerf } from "../utils/perfLogger";
import type { CanvasDocument } from "../model/pageTypes";
import {
  buildPersistPayload,
  saveExistingDocument,
  saveNewDocument,
} from "../utils/documentPersistence";

type DocumentSaveParams = {
  docId?: string;
  docName: string;
};

export const useDocumentSave = ({ docId, docName }: DocumentSaveParams) => {
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);

  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "saving" | "saved" | "error" | null
  >(null);
  const [lastSavedUserMadeId, setLastSavedUserMadeId] = useState<
    string | null
  >(null);

  const canvasGetterRef = useRef<() => CanvasDocument>(() => ({ pages: [] }));
  const retryAutoSaveRef = useRef<(() => void) | null>(null);
  const manualSaveRef = useRef<(() => void) | null>(null);

  // 외부에서 최신 캔버스 조회 함수를 등록해 저장 시 오래된 스냅샷 사용을 피한다.
  const registerCanvasGetter = useCallback((getter: () => CanvasDocument) => {
    canvasGetterRef.current = getter;
  }, []);

  const getCanvasData = useCallback(() => canvasGetterRef.current(), []);
  const getName = useCallback(() => docName.trim() || "제목 없음", [docName]);

  const setRetryAutoSave = useCallback((retryFn: () => void) => {
    retryAutoSaveRef.current = retryFn;
  }, []);

  const setManualSave = useCallback((saveFn: () => void) => {
    manualSaveRef.current = saveFn;
  }, []);

  const retryAutoSave = useCallback(() => {
    retryAutoSaveRef.current?.();
  }, []);

  const handleSave = useCallback(async () => {
    // 자동저장 훅이 수동 저장 함수를 등록한 경우 저장 경로를 일원화한다.
    if (manualSaveRef.current) {
      manualSaveRef.current();
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        showToast("로그인이 필요해요.");
        return;
      }
      const currentPages = getCanvasData().pages;
      const canvasData = await measurePerf(
        "manualsave.resolvePagesForPersistence",
        () => buildPersistPayload(currentPages),
        {
          totalPages: currentPages.length,
          swappedPages: currentPages.filter((page) => page.isSwapped).length,
          hasDocId: Boolean(docId),
        },
      );
      if (docId) {
        await measurePerf(
          "manualsave.updateUserMadeVersion",
          () =>
            saveExistingDocument({
              docId,
              name: getName(),
              pages: canvasData.pages,
            }),
          { totalPages: canvasData.pages.length },
        );
        setLastSavedUserMadeId(docId);
        showToast("저장했습니다.");
      } else {
        const { id } = await measurePerf(
          "manualsave.saveUserMadeVersion",
          () =>
            saveNewDocument({
              userId: user.id,
              name: getName(),
              pages: canvasData.pages,
            }),
          { totalPages: canvasData.pages.length },
        );
        setLastSavedUserMadeId(id);
        navigate(`/${id}/edit`, { replace: true });
        showToast("저장했습니다.");
      }
    } catch (error) {
      captureSentryError(error, "수동 저장");
      showToast("저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }, [docId, getName, getCanvasData, navigate, showToast]);

  return {
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
  };
};
