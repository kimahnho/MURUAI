/**
 * 현재 선택 페이지와 활성 방향값을 계산해 캔버스 표시 상태를 제공하는 훅.
 */
import type { Page } from "../model/pageTypes";

type ActivePageStateParams = {
  pages: Page[];
  selectedPageId: string;
  fallbackOrientation: "horizontal" | "vertical";
};

export const useActivePageState = ({
  pages,
  selectedPageId,
  fallbackOrientation,
}: ActivePageStateParams) => {
  const selectedPage = pages.find((page) => page.id === selectedPageId);
  const activeOrientation = selectedPage?.orientation ?? fallbackOrientation;
  return { selectedPage, activeOrientation };
};
