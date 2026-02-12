import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { useToastStore } from "../store/toastStore";
import {
  saveUserMadeVersion,
  updateUserMadeVersion,
} from "../utils/userMadeExport";
import {
  usePageSwapStore,
  waitForForceHydrate,
} from "../store/pageSwapStore";
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
      if (docId) {
        const requestId = usePageSwapStore
          .getState()
          .requestForceHydrate();
        await waitForForceHydrate(requestId);
        await updateUserMadeVersion({
          docId,
          name: getName(),
          canvasData: getCanvasData(),
        });
        setLastSavedUserMadeId(docId);
        showToast("저장했습니다.");
      } else {
        const requestId = usePageSwapStore
          .getState()
          .requestForceHydrate();
        await waitForForceHydrate(requestId);
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
