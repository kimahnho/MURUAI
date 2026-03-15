/**
 * 어휘 따라쓰기 페이지 생성 요청을 관리하는 스토어.
 * 어휘 학습 카드 페이지에서 버튼 클릭 시 요청을 발행하고,
 * useEditorSubscriptions에서 구독하여 실제 페이지 삽입을 수행한다.
 */
import { create } from "zustand";

import { mp } from "@/shared/utils/mixpanel";

interface VocabTracingState {
  requestId: number;
  sourcePageId: string | null;
  requestVocabTracing: (sourcePageId: string) => void;
  clearRequest: () => void;
}

export const useVocabTracingStore = create<VocabTracingState>((set) => ({
  requestId: 0,
  sourcePageId: null,

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
