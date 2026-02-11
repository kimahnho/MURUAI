import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { useOrientationStore } from "../store/orientationStore";
import { useToastStore } from "../store/toastStore";
import { saveUserMadeVersion } from "../utils/userMadeExport";
import type { CanvasDocument } from "../model/pageTypes";

type DocumentLoaderParams = {
  docId?: string;
};

export const useDocumentLoader = ({ docId }: DocumentLoaderParams) => {
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.showToast);
  const setOrientation = useOrientationStore((state) => state.setOrientation);

  const [docName, setDocName] = useState("");
  const [loadedDocument, setLoadedDocument] = useState<CanvasDocument | null>(
    null,
  );
  const [loadedDocumentId, setLoadedDocumentId] = useState<string | null>(null);
  const [isCreatingNewDoc, setIsCreatingNewDoc] = useState(false);

  const clearLoadedDocument = useCallback(() => {
    setLoadedDocument(null);
  }, []);

  // /design 경로에서 새 문서 생성 후 /{id}/edit으로 리디렉트
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

  // docId로 기존 문서 로딩
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

  return {
    docName,
    setDocName,
    loadedDocument,
    loadedDocumentId,
    clearLoadedDocument,
  };
};
