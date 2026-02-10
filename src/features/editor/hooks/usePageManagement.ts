import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useActivePageManager } from "./useActivePageManager";
import { usePageActions } from "./usePageActions";

type PageManagementParams = {
  pages: Page[];
  selectedPageId: string;
  orientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedPageId: Dispatch<SetStateAction<string>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setOrientation: Dispatch<SetStateAction<"horizontal" | "vertical">>;
  orientationRef: ReadonlyRef<"horizontal" | "vertical">;
  isSyncingOrientationRef: MutableRefObject<boolean>;
};

export const usePageManagement = ({
  pages,
  selectedPageId,
  orientation,
  setPages,
  setSelectedPageId,
  setSelectedIds,
  setEditingTextId,
  setOrientation,
  orientationRef,
  isSyncingOrientationRef,
}: PageManagementParams) => {
  const setActivePage = useActivePageManager({
    pages,
    setSelectedPageId,
    setSelectedIds,
    setEditingTextId,
    setOrientation,
    orientationRef,
    isSyncingOrientationRef,
  });

  const pageActions = usePageActions({
    pages,
    selectedPageId,
    orientation,
    setPages,
    setSelectedIds,
    setEditingTextId,
    setActivePage,
  });

  return { setActivePage, ...pageActions };
};
