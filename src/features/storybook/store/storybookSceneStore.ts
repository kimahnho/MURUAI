/**
 * 스토리북 생성 상황판(배너) 상태를 관리하는 스토어.
 * - 여러 세트를 동시에 추적(한 문서에 스토리북이 여러 번 들어갈 수 있음)
 * - Phase 1(생성 중) / Phase 2(완료 후 페이지별 재생성 가능) 통합 관리
 * - `emotionSceneStore` 패턴을 그대로 본딴다.
 */
import { create } from "zustand";

import type { ArtStyleId, ManualSubCharacter, PageLayout } from "../model/storybookTypes";

/** 배너 상태: 생성 준비 / 생성 중 / 전부 실패 / 완료(부분 성공 포함) */
export type StorybookBannerPhase = "ready" | "generating" | "failed" | "completed";

/** 하나의 스토리북 세트(= 한 번의 생성 요청 단위) */
export interface StorybookPendingGeneration {
  /** 세트 고유 식별자 — 생성 시작 시 UUID 발급, 이후 불변 */
  setKey: string;
  /** 이 세트에 속한 페이지 id 목록. 생성 완료 후 채워짐 */
  storyPageIds: string[];
  bannerPhase: StorybookBannerPhase;
  /** UI 표시용 */
  bookTitle: string;
  /** 주인공 썸네일 표시용. Cloudinary URL 또는 `data:image/...;base64,...` */
  characterImageUrl: string;
  /** AI 호출용 base64 (선택) — 페이지별 재생성 시 Gemini에 전달 */
  characterImageBase64?: string;
  /** 스타일/레이아웃 — 페이지별 재생성 시 동일 스타일 유지 */
  artStyleId: ArtStyleId;
  customPromptTemplate?: string;
  layout: PageLayout;
  /** 서브 캐릭터 (수동) */
  subCharacters?: ManualSubCharacter[];
}

/** 페이지별 메타 — 재생성 시 sceneGroup 앵커·프롬프트 복원용 */
export interface StorybookPageMeta {
  pageId: string;
  pageIndex: number; // 0-indexed
  sceneDescription: string;
  text: string;
  sceneGroup: number;
  isGroupFirst: boolean;
  groupAnchorBase64: string | null;
  generatedImageUrl: string;
}

interface StorybookSceneState {
  pendingGenerations: StorybookPendingGeneration[];
  /** 진행률 표시 — 세트와 무관하게 현재 진행 중인 단일 카운터 */
  generatingProgress: { current: number; total: number } | null;
  /** 세트별 페이지 메타 (키 = storyPageIds[0]) */
  pageMetaBySet: Record<string, StorybookPageMeta[]>;
  /** 이미지 패치 요청 — useEditorSubscriptions가 구독 */
  imagePatchRequest: {
    urlByPageId: Record<string, string>;
    requestId: number;
  } | null;

  addPendingGeneration: (data: StorybookPendingGeneration) => void;
  removePendingGeneration: (setKey: string) => void;
  setBannerPhase: (setKey: string, phase: StorybookBannerPhase) => void;
  setStoryPageIds: (setKey: string, pageIds: string[]) => void;
  setGeneratingProgress: (v: { current: number; total: number } | null) => void;
  setPageMetaForSet: (setKey: string, meta: StorybookPageMeta[]) => void;
  updatePageMeta: (setKey: string, pageId: string, patch: Partial<StorybookPageMeta>) => void;
  requestImagePatch: (urlByPageId: Record<string, string>) => void;
  clearImagePatchRequest: () => void;
}

export const useStorybookSceneStore = create<StorybookSceneState>((set) => ({
  pendingGenerations: [],
  generatingProgress: null,
  pageMetaBySet: {},
  imagePatchRequest: null,

  addPendingGeneration: (data) => {
    set((state) => ({
      pendingGenerations: [...state.pendingGenerations, data],
    }));
  },

  removePendingGeneration: (setKey) => {
    set((state) => {
      const { [setKey]: _removed, ...restMeta } = state.pageMetaBySet;
      return {
        pendingGenerations: state.pendingGenerations.filter((pg) => pg.setKey !== setKey),
        pageMetaBySet: restMeta,
      };
    });
  },

  setBannerPhase: (setKey, phase) => {
    set((state) => ({
      pendingGenerations: state.pendingGenerations.map((pg) =>
        pg.setKey === setKey ? { ...pg, bannerPhase: phase } : pg,
      ),
    }));
  },

  setStoryPageIds: (setKey, pageIds) => {
    set((state) => ({
      pendingGenerations: state.pendingGenerations.map((pg) =>
        pg.setKey === setKey ? { ...pg, storyPageIds: pageIds } : pg,
      ),
    }));
  },

  setGeneratingProgress: (v) => {
    set({ generatingProgress: v });
  },

  setPageMetaForSet: (setKey, meta) => {
    set((state) => ({
      pageMetaBySet: { ...state.pageMetaBySet, [setKey]: meta },
    }));
  },

  updatePageMeta: (setKey, pageId, patch) => {
    set((state) => {
      const existing = state.pageMetaBySet[setKey];
      if (!existing) return state;
      return {
        pageMetaBySet: {
          ...state.pageMetaBySet,
          [setKey]: existing.map((m) => (m.pageId === pageId ? { ...m, ...patch } : m)),
        },
      };
    });
  },

  requestImagePatch: (urlByPageId) => {
    set((state) => ({
      imagePatchRequest: {
        urlByPageId,
        requestId: (state.imagePatchRequest?.requestId ?? 0) + 1,
      },
    }));
  },

  clearImagePatchRequest: () => {
    set({ imagePatchRequest: null });
  },
}));
