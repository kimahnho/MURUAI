import type { Dispatch, SetStateAction } from "react";
import { useAacBoardStore } from "../store/aacBoardStore";
import { useStoryBoardStore } from "../store/storyBoardStore";
import type { SideBarMenu } from "../store/sideBarStore";
import type { Page } from "../model/pageTypes";
import type { AacBoardConfig } from "../utils/aacBoardUtils";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";

type AddAacBoardPage = (args: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical"; firstElementId?: string };

type AddStoryBoardPage = (args: {
  config: StorySequenceConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type BoardSubscriptionsParams = {
  setPages: Dispatch<SetStateAction<Page[]>>;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical"
  ) => void;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  addAacBoardPage: AddAacBoardPage;
  addStoryBoardPage: AddStoryBoardPage;
};

export const useBoardSubscriptions = ({
  setPages,
  setActivePage,
  setSideBarMenu,
  setSelectedIds,
  setEditingTextId,
  addAacBoardPage,
  addStoryBoardPage,
}: BoardSubscriptionsParams) => {
  useStoreSubscription({
    subscribe: useAacBoardStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.config),
    onChange: (state) => {
      if (!state.config) return;
      // AAC 보드는 생성 직후 첫 요소를 바로 선택해
      // 사용자가 추가 클릭 없이 텍스트 편집 흐름으로 진입하게 한다.
      const newPage = addAacBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
      setSideBarMenu("aac");
      if (newPage.firstElementId) {
        setSelectedIds([newPage.firstElementId]);
        setEditingTextId(null);
      }
    },
    deps: [
      addAacBoardPage,
      setActivePage,
      setEditingTextId,
      setPages,
      setSelectedIds,
      setSideBarMenu,
    ],
  });

  useStoreSubscription({
    subscribe: useStoryBoardStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.config),
    onChange: (state) => {
      if (!state.config) return;
      // 스토리보드는 페이지 생성과 포커스 전환만 수행하고
      // 세부 편집 상태는 각 섹션 훅에서 이어서 관리한다.
      const newPage = addStoryBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
    },
    deps: [addStoryBoardPage, setActivePage, setPages],
  });
};
