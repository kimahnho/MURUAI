import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { useToastStore } from "../store/toastStore";
import {
  saveUserMadeVersion,
  updateUserMadeVersion,
} from "../utils/userMadeExport";
import { resolvePagesForPersistence } from "../utils/persistPages";
import { measurePerf } from "../utils/perfLogger";
import type { CanvasDocument } from "../model/pageTypes";

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
      const pagesToPersist = await measurePerf(
        "manualsave.resolvePagesForPersistence",
        () => resolvePagesForPersistence(currentPages),
        {
          totalPages: currentPages.length,
          swappedPages: currentPages.filter((page) => page.isSwapped).length,
          hasDocId: Boolean(docId),
        },
      );
      const canvasData = { pages: pagesToPersist };
      if (docId) {
        await measurePerf(
          "manualsave.updateUserMadeVersion",
          () =>
            updateUserMadeVersion({
              docId,
              name: getName(),
              canvasData,
            }),
          { totalPages: pagesToPersist.length },
        );
        setLastSavedUserMadeId(docId);
        showToast("저장했습니다.");
      } else {
        const { id } = await measurePerf(
          "manualsave.saveUserMadeVersion",
          () =>
            saveUserMadeVersion({
              userId: user.id,
              name: getName(),
              canvasData,
            }),
          { totalPages: pagesToPersist.length },
        );
        setLastSavedUserMadeId(id);
        navigate(`/${id}/edit`, { replace: true });
        showToast("저장했습니다.");
      }
    } catch {
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
