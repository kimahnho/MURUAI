/**
 * 사이드패널 전환 등 외부 조건에 따라 선택 상태를 정리하는 훅.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";

type SelectionClearerParams = {
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
};

export const useSelectionClearer = ({
  setSelectedIds,
  setEditingTextId,
}: SelectionClearerParams) =>
  useCallback(() => {
    setSelectedIds([]);
    setEditingTextId(null);
  }, [setSelectedIds, setEditingTextId]);
