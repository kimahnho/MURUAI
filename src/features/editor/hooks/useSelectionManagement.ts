import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import type { SideBarMenu } from "../store/sideBarStore";
import { useSelectionState } from "../sections/canvas/hooks/useSelectionState";
import { useSelectionToolbarActions } from "../sections/canvas/hooks/useSelectionToolbarActions";
import { useSelectionClearer } from "../sections/canvas/hooks/useSelectionClearer";

type SelectionManagementParams = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setFontPanel: (payload: { fontFamily: string; fontWeight: number }) => void;
};

export const useSelectionManagement = ({
  pages,
  selectedPageId,
  selectedIds,
  setPages,
  setSelectedIds,
  setEditingTextId,
  setSideBarMenu,
  setFontPanel,
}: SelectionManagementParams) => {
  const selectionState = useSelectionState({
    pages,
    selectedPageId,
    selectedIds,
    setPages,
  });

  const { handleMultiColorChange, handleOpenFontPanel } =
    useSelectionToolbarActions({
      activePage: selectionState.activePage,
      selectedPageId,
      selectedIds,
      setPages,
      setSideBarMenu,
      setFontPanel,
      multiFontFamily: selectionState.multiFontFamily,
      multiFontWeight: selectionState.multiFontWeight,
    });

  const handleClearSelection = useSelectionClearer({
    setSelectedIds,
    setEditingTextId,
  });

  return {
    ...selectionState,
    handleMultiColorChange,
    handleOpenFontPanel,
    handleClearSelection,
  };
};
