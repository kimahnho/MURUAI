import { create } from "zustand";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";
import { mp } from "@/shared/lib/mixpanel";

interface StoryBoardStore {
  requestId: number;
  config: StorySequenceConfig | null;
  requestBoard: (config: StorySequenceConfig) => void;
}

export const useStoryBoardStore = create<StoryBoardStore>((set) => ({
  requestId: 0,
  config: null,
  requestBoard: (config) =>
    { mp.track("story_board_created", { count: config.count, direction: config.direction });
      set((state) => ({
      requestId: state.requestId + 1,
      config,
    })); },
}));
