import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useHistorySync } from "./useHistorySync";
import { useTextEditTransaction } from "./useTextEditTransaction";

type EditorHistoryParams = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  editingTextId: string | null;
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  selectedIdsRef: ReadonlyRef<string[]>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedPageId: Dispatch<SetStateAction<string>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  isApplyingHistoryRef: MutableRefObject<boolean>;
  isApplyingTemplateRef: MutableRefObject<boolean>;
};

export const useEditorHistory = ({
  pages,
  selectedPageId,
  selectedIds,
  editingTextId,
  pagesRef,
  selectedPageIdRef,
  selectedIdsRef,
  setPages,
  setSelectedPageId,
  setSelectedIds,
  isApplyingHistoryRef,
  isApplyingTemplateRef,
}: EditorHistoryParams) => {
  const { beginTransaction, commitTransaction, recordHistory } = useHistorySync({
    pages,
    selectedPageId,
    selectedIds,
    pagesRef,
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
    setSelectedPageId,
    setSelectedIds,
    isApplyingHistoryRef,
    isApplyingTemplateRef,
  });

  useTextEditTransaction({
    editingTextId,
    beginTransaction,
    commitTransaction,
  });

  return { beginTransaction, commitTransaction, recordHistory };
};
