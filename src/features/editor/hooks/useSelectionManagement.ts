/**
 * 선택 상태 계산, 선택 해제, 선택 툴바 액션을 통합 관리하는 훅.
 */
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
  // 선택 파생값 계산과 액션 핸들러를 분리 훅으로 결합해 DesignPaper 의존 로직을 한 지점에서 묶는다.
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
