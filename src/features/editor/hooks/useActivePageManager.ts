import {
  useCallback,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";

type ActivePageManagerParams = {
  pages: Page[];
  setSelectedPageId: Dispatch<SetStateAction<string>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setOrientation: Dispatch<SetStateAction<"horizontal" | "vertical">>;
  orientationRef: ReadonlyRef<"horizontal" | "vertical">;
  isSyncingOrientationRef: MutableRefObject<boolean>;
};

export const useActivePageManager = ({
  pages,
  setSelectedPageId,
  setSelectedIds,
  setEditingTextId,
  setOrientation,
  orientationRef,
  isSyncingOrientationRef,
}: ActivePageManagerParams) =>
  useCallback(
    (pageId: string, nextOrientation?: "horizontal" | "vertical") => {
      setSelectedPageId(pageId);
      setSelectedIds([]);
      setEditingTextId(null);
      const targetOrientation =
        nextOrientation ??
        pages.find((page) => page.id === pageId)?.orientation;
      if (targetOrientation && targetOrientation !== orientationRef.current) {
        isSyncingOrientationRef.current = true;
        setOrientation(targetOrientation);
      }
    },
    [
      pages,
      setSelectedPageId,
      setSelectedIds,
      setEditingTextId,
      setOrientation,
      orientationRef,
      isSyncingOrientationRef,
    ]
  );
