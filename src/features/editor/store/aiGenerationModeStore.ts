/**
 * AI 감정추론 생성 포커스 모드 상태를 관리하는 스토어.
 * 랜딩 페이지에서 진입 시 에디터 UI를 단계별 집중 모드로 전환한다.
 * 확정 후에만 에디터 전체 기능이 복원된다.
 */
import { create } from "zustand";

import type { Dispatch, SetStateAction } from "react";

import type { StoryItem } from "../ai/generateEmotionStory";
import type { Page } from "../model/pageTypes";

export type FocusedAiStep = "text-review" | "image-generating" | "completed";

export type EmotionImageStyle = "photo-boy" | "photo-girl" | "emoji";

/** canvas_data에 직렬화되는 포커스 모드 메타데이터 */
export interface FocusedAiModeMeta {
  step: "text-review" | "completed";
  storyPageIds: string[];
  stories: StoryItem[];
  imageStyle: EmotionImageStyle;
  cardStyle: EmotionImageStyle;
  source: "landing";
}

/** MainSection에서 등록하는 페이지 접근자 — 사이드바 패널이 페이지를 읽고 수정할 수 있도록 한다 */
interface PageAccessors {
  getPages: () => Page[];
  setPages: Dispatch<SetStateAction<Page[]>>;
  getSelectedPageId: () => string;
  setSelectedPageId: (id: string) => void;
  setZoom: Dispatch<SetStateAction<number>>;
}

interface AiGenerationModeState {
  isActive: boolean;
  step: FocusedAiStep;
  storyPageIds: string[];
  stories: StoryItem[];
  imageStyle: EmotionImageStyle;
  cardStyle: EmotionImageStyle;
  completedPageIds: Set<string>;
  previousZoom: number;
  pageAccessors: PageAccessors | null;

  enterFocusedMode: (data: {
    stories: StoryItem[];
    storyPageIds: string[];
    previousZoom?: number;
  }) => void;
  setStep: (step: FocusedAiStep) => void;
  setImageStyle: (style: EmotionImageStyle) => void;
  setCardStyle: (style: EmotionImageStyle) => void;
  setStories: (stories: StoryItem[]) => void;
  markPageCompleted: (pageId: string) => void;
  registerPageAccessors: (accessors: PageAccessors) => void;
  restore: (meta: FocusedAiModeMeta) => void;
  exitFocusedMode: () => void;
}

export const useAiGenerationModeStore = create<AiGenerationModeState>(
  (set) => ({
    isActive: false,
    step: "text-review",
    storyPageIds: [],
    stories: [],
    imageStyle: "photo-boy",
    cardStyle: "photo-boy",
    completedPageIds: new Set(),
    previousZoom: 100,
    pageAccessors: null,

    enterFocusedMode: (data) => {
      set({
        isActive: true,
        step: "text-review",
        storyPageIds: data.storyPageIds,
        stories: data.stories,
        imageStyle: "photo-boy",
        cardStyle: "photo-boy",
        completedPageIds: new Set(),
        previousZoom: data.previousZoom ?? 100,
      });
    },

    setStep: (step) => {
      set({ step });
    },

    setImageStyle: (style) => {
      set({ imageStyle: style });
    },

    setCardStyle: (style) => {
      set({ cardStyle: style });
    },

    setStories: (stories) => {
      set({ stories });
    },

    markPageCompleted: (pageId) => {
      set((state) => {
        const next = new Set(state.completedPageIds);
        next.add(pageId);
        return { completedPageIds: next };
      });
    },

    registerPageAccessors: (accessors) => {
      set({ pageAccessors: accessors });
    },

    restore: (meta) => {
      set({
        isActive: true,
        step: meta.step,
        storyPageIds: meta.storyPageIds,
        stories: meta.stories,
        imageStyle: meta.imageStyle,
        cardStyle: meta.cardStyle,
        completedPageIds: new Set(),
      });
    },

    exitFocusedMode: () => {
      set({
        isActive: false,
        step: "text-review",
        storyPageIds: [],
        stories: [],
        imageStyle: "photo-boy",
        cardStyle: "photo-boy",
        completedPageIds: new Set(),
        previousZoom: 100,
      });
    },
  }),
);
