/**
 * 맞춤법 검사 상태를 관리하는 스토어.
 * 헤더 버튼(뱃지), 오른쪽 패널, 토스트에서 공유한다.
 */
import { create } from "zustand";
import type { SpellCheckResult } from "../ai/checkSpelling";

interface SpellCheckStore {
  results: SpellCheckResult[] | null;
  setResults: (results: SpellCheckResult[] | null) => void;

  isChecking: boolean;
  setIsChecking: (v: boolean) => void;

  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;

  // 개별 교정 상태 추적 (키: `${elementId}::${field}::${correctionIdx}`)
  actionMap: Map<string, "applied" | "ignored">;
  applyAction: (keys: string[], action: "applied" | "ignored") => void;

  // MainSection에서 등록하는 교정 적용 함수
  applier: ((corrections: SpellCheckResult[]) => void) | null;
  setApplier: (fn: (corrections: SpellCheckResult[]) => void) => void;

  // 토스트 표시 여부
  isToastVisible: boolean;
  showToast: () => void;
  hideToast: () => void;

  // 패널에서 재검사를 요청하면 DesignLayout이 구독해 검사 실행
  recheckRequested: boolean;
  requestRecheck: () => void;
  clearRecheckRequest: () => void;

  reset: () => void;
}

// correction 키 생성 유틸
export const buildCorrectionKey = (
  elementId: string,
  field: string,
  correctionIdx: number,
) => `${elementId}::${field}::${correctionIdx}`;

export const useSpellCheckStore = create<SpellCheckStore>((set) => ({
  results: null,
  setResults: (results) => {
    set({ results, actionMap: new Map() });
  },

  isChecking: false,
  setIsChecking: (isChecking) => {
    set({ isChecking });
  },

  isPanelOpen: false,
  openPanel: () => {
    set({ isPanelOpen: true });
  },
  closePanel: () => {
    set({ isPanelOpen: false });
  },

  actionMap: new Map(),
  applyAction: (keys, action) => {
    set((state) => {
      const next = new Map(state.actionMap);
      for (const key of keys) {
        next.set(key, action);
      }
      return { actionMap: next };
    });
  },

  applier: null,
  setApplier: (fn) => {
    set({ applier: fn });
  },

  isToastVisible: false,
  showToast: () => {
    set({ isToastVisible: true });
  },
  hideToast: () => {
    set({ isToastVisible: false });
  },

  recheckRequested: false,
  requestRecheck: () => {
    set({ recheckRequested: true, results: null, actionMap: new Map() });
  },
  clearRecheckRequest: () => {
    set({ recheckRequested: false });
  },

  reset: () => {
    set({
      results: null,
      isChecking: false,
      isPanelOpen: false,
      actionMap: new Map(),
      isToastVisible: false,
      recheckRequested: false,
    });
  },
}));
