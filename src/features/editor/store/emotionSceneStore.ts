/**
 * 감정추론 AI 2단계 생성 플로우 상태를 관리하는 스토어.
 * Phase 1(텍스트 생성) 결과를 보관하고, Phase 2(이미지 생성/재생성) 상태를 추적한다.
 */
import { create } from "zustand";

import type { StoryItem } from "../ai/generateEmotionStory";

/** 배너 상태: 이미지 생성 전 / 생성 중 / 생성 완료 (재생성 가능) */
export type BannerPhase = "ready" | "generating" | "completed";

export interface PendingGeneration {
  stories: StoryItem[];
  storyPageIds: string[];
  bannerPhase: BannerPhase;
}

/** 페이지별 이미지 생성 메타데이터 — 재생성 시 레퍼런스/프롬프트 복원용 */
export interface PageGenerationMeta {
  pageIndex: number;
  originalPrompt: string;
  sceneGroup: number;
  isGroupFirst: boolean;
  groupFirstImageBase64: string | null;
  generatedImageUrl: string;
}

interface EmotionSceneState {
  pendingGeneration: PendingGeneration | null;
  generatingProgress: { current: number; total: number } | null;
  generationMeta: PageGenerationMeta[];

  heroImageRequest: {
    heroImageUrls: Map<string, string>;
    requestId: number;
  } | null;

  setPendingGeneration: (data: PendingGeneration | null) => void;
  setBannerPhase: (phase: BannerPhase) => void;
  setGeneratingProgress: (
    v: { current: number; total: number } | null,
  ) => void;
  setGenerationMeta: (meta: PageGenerationMeta[]) => void;
  requestHeroImagePatch: (urls: Map<string, string>) => void;
  clearHeroImageRequest: () => void;
}

export const useEmotionSceneStore = create<EmotionSceneState>((set) => ({
  pendingGeneration: null,
  generatingProgress: null,
  generationMeta: [],
  heroImageRequest: null,

  setPendingGeneration: (data) => {
    set({ pendingGeneration: data });
  },

  setBannerPhase: (phase) => {
    set((state) => {
      if (!state.pendingGeneration) return state;
      return {
        pendingGeneration: { ...state.pendingGeneration, bannerPhase: phase },
      };
    });
  },

  setGeneratingProgress: (v) => {
    set({ generatingProgress: v });
  },

  setGenerationMeta: (meta) => {
    set({ generationMeta: meta });
  },

  requestHeroImagePatch: (urls) => {
    set((state) => ({
      heroImageRequest: {
        heroImageUrls: urls,
        requestId: (state.heroImageRequest?.requestId ?? 0) + 1,
      },
    }));
  },

  clearHeroImageRequest: () => {
    set({ heroImageRequest: null });
  },
}));
