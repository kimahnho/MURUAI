/**
 * 스토리보드 생성 요청과 옵션 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";
import { mp } from "@/shared/utils/mixpanel";

interface StoryBoardStore {
  requestId: number;
  config: StorySequenceConfig | null;
  requestBoard: (config: StorySequenceConfig) => void;
}

export const useStoryBoardStore = create<StoryBoardStore>((set) => ({
  requestId: 0,
  config: null,
  requestBoard: (config) =>
    { mp.track("이야기순서 보드 생성", { count: config.count, direction: config.direction });
      set((state) => ({
      requestId: state.requestId + 1,
      config,
    })); },
}));
