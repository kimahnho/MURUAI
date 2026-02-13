import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { saveNewDocument } from "../utils/documentPersistence";

type CreateDocumentOptions = {
  replace?: boolean;
  onUnauthorized?: () => void;
  onError?: () => void;
};

export const useCreateDocumentNavigation = () => {
  const navigate = useNavigate();
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  const createAndOpenDocument = async ({
    replace = true,
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
        pages: [],
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
