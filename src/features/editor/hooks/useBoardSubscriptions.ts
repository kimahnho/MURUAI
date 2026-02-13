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
      const newPage = addStoryBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
    },
    deps: [addStoryBoardPage, setActivePage, setPages],
  });
};
