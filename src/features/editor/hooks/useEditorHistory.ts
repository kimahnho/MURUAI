/**
 * 히스토리 동기화와 텍스트 편집 트랜잭션을 묶어 undo/redo 경계를 관리하는 훅.
 */
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
  // 페이지/선택 스냅샷 기반 히스토리 동기화는 useHistorySync가 담당한다.
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
    // 텍스트 편집 시작/종료를 트랜잭션 경계로 연결해 입력 중간 상태가 히스토리에 과도하게 쌓이지 않게 한다.
    editingTextId,
    beginTransaction,
    commitTransaction,
  });

  return { beginTransaction, commitTransaction, recordHistory };
};
