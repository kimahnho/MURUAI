/**
 * 어휘 따라쓰기 페이지 생성 요청을 관리하는 스토어.
 * 어휘 학습 카드 페이지에서 버튼 클릭 시 모달을 열고,
 * 크기 선택 후 확정하면 요청을 발행한다.
 * useEditorSubscriptions에서 구독하여 실제 페이지 삽입을 수행한다.
 */
import { create } from "zustand";

import { mp } from "@/shared/utils/mixpanel";

import type { VocabCellSize } from "../utils/tracingGridUtils";

interface VocabTracingState {
  requestId: number;
  sourcePageId: string | null;
  cellSize: VocabCellSize;
  isModalOpen: boolean;
  pendingSourcePageId: string | null;
  openModal: (sourcePageId: string) => void;
  closeModal: () => void;
  setCellSize: (size: VocabCellSize) => void;
  confirmAndGenerate: () => void;
  /** @deprecated 기존 호환 — 모달 없이 직접 요청 */
  requestVocabTracing: (sourcePageId: string) => void;
  clearRequest: () => void;
}

export const useVocabTracingStore = create<VocabTracingState>((set) => ({
  requestId: 0,
  sourcePageId: null,
  cellSize: "medium",
  isModalOpen: false,
  pendingSourcePageId: null,

  openModal: (sourcePageId) => {
    set({ isModalOpen: true, pendingSourcePageId: sourcePageId });
  },

  closeModal: () => {
    set({ isModalOpen: false, pendingSourcePageId: null });
  },

  setCellSize: (size) => {
    set({ cellSize: size });
  },

  confirmAndGenerate: () => {
    mp.track("어휘 따라쓰기 생성");
    set((state) => ({
      requestId: state.requestId + 1,
      sourcePageId: state.pendingSourcePageId,
      isModalOpen: false,
      pendingSourcePageId: null,
    }));
  },

  requestVocabTracing: (sourcePageId) => {
    mp.track("어휘 따라쓰기 생성");
    set((state) => ({
      requestId: state.requestId + 1,
      sourcePageId,
    }));
  },

  clearRequest: () => {
    set({ sourcePageId: null });
  },
}));
