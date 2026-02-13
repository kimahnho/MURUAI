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
