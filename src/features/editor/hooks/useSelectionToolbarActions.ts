import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import type { SideBarMenu } from "../store/sideBarStore";
import { bumpPageRevision } from "../utils/pageRevision";

type SelectionToolbarActionsParams = {
  activePage: Page | null;
  selectedPageId: string;
  selectedIds: string[];
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setFontPanel: (payload: { fontFamily: string; fontWeight: number }) => void;
  multiFontFamily: string;
  multiFontWeight: number;
};

export const useSelectionToolbarActions = ({
  activePage,
  selectedPageId,
  selectedIds,
  setPages,
  setSideBarMenu,
  setFontPanel,
  multiFontFamily,
  multiFontWeight,
}: SelectionToolbarActionsParams) => {
  const handleMultiColorChange = (nextColor: string) => {
    if (!activePage) return;
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === selectedPageId
          ? bumpPageRevision({
              ...page,
              elements: page.elements.map((el) => {
                if (!selectedIds.includes(el.id) || el.locked) {
                  return el;
                }
                if (el.type === "text") {
                  const textElement = el;
                  return {
                    ...textElement,
                    style: {
                      ...textElement.style,
                      color: nextColor,
                    },
                  };
                }
                if (
                  el.type === "rect" ||
                  el.type === "roundRect" ||
                  el.type === "ellipse"
                ) {
                  return {
                    ...el,
                    fill: nextColor,
                  };
                }
                return el;
              }),
            })
          : page
      )
    );
  };

  const handleOpenFontPanel = () => {
    setSideBarMenu("font");
    setFontPanel({
      fontFamily: multiFontFamily,
      fontWeight: multiFontWeight,
    });
  };

  return { handleMultiColorChange, handleOpenFontPanel };
};
