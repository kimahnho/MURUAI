/**
 * 선택 툴바 액션(정렬/레이어/삭제 등)을 페이지 패치와 연결하는 훅.
 */
import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../../../model/pageTypes";
import type { SideBarMenu } from "../../../store/sideBarStore";
import { updateElementsByPageId } from "../../../utils/pageMutation";

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
    // 다중 선택 색상 변경은 텍스트/도형 타입을 함께 처리해
    // 툴바 입력 한 번으로 혼합 선택의 색을 통일한다.
    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => {
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
      ),
    );
  };

  const handleOpenFontPanel = () => {
    // 다중 선택의 대표 폰트 값을 먼저 패널에 주입해
    // 사용자가 즉시 현재 상태를 인지하고 수정할 수 있게 한다.
    setSideBarMenu("font");
    setFontPanel({
      fontFamily: multiFontFamily,
      fontWeight: multiFontWeight,
    });
  };

  return { handleMultiColorChange, handleOpenFontPanel };
};
