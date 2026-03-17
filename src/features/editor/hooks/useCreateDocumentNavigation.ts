/**
 * 새 문서 생성 후 편집 페이지로 이동하는 저장+네비게이션 흐름을 담당하는 훅.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import type { Page } from "../model/pageTypes";
import { saveNewDocument } from "../utils/documentPersistence";

type CreateDocumentOptions = {
  replace?: boolean;
  pages?: Page[];
  onUnauthorized?: () => void;
  onError?: () => void;
};

export const useCreateDocumentNavigation = () => {
  const navigate = useNavigate();
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  const createAndOpenDocument = async ({
    replace = true,
    pages,
    onUnauthorized,
    onError,
  }: CreateDocumentOptions = {}) => {
    if (isCreatingDoc) return null;
    setIsCreatingDoc(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        onUnauthorized?.();
        return null;
      }
      const { id } = await saveNewDocument({
        userId: user.id,
        name: "제목 없음",
        pages: pages ?? [],
      });
      navigate(`/${id}/edit`, { replace });
      return id;
    } catch {
      onError?.();
      return null;
    } finally {
      setIsCreatingDoc(false);
    }
  };

  return {
    isCreatingDoc,
    createAndOpenDocument,
  };
};
