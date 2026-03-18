/**
 * 페이지 스왑 인/아웃 상태와 동기화 신호를 관리하는 스토어.
 */
import { create } from "zustand";

type PageSwapState = {
  visiblePageIds: string[];
  pdfPreviewActive: boolean;
  pdfExporting: boolean;
  hydrationRequestId: number;
  hydrationReadyId: number;
  swapInFlight: number;
  forceHydrate: boolean;
  forceHydrateRequestId: number;
  forceHydrateReadyId: number;
  setVisiblePageIds: (ids: string[]) => void;
  setPdfPreviewActive: (active: boolean) => void;
  setPdfExporting: (active: boolean) => void;
  requestHydration: () => number;
  setHydrationReady: (requestId: number) => void;
  beginSwap: () => void;
  endSwap: () => void;
  setForceHydrate: (active: boolean) => void;
  requestForceHydrate: () => number;
  setForceHydrateReady: (requestId: number) => void;
};

export const usePageSwapStore = create<PageSwapState>((set, get) => ({
  visiblePageIds: [],
  pdfPreviewActive: false,
  pdfExporting: false,
  hydrationRequestId: 0,
  hydrationReadyId: 0,
  swapInFlight: 0,
  forceHydrate: false,
  forceHydrateRequestId: 0,
  forceHydrateReadyId: 0,
  setVisiblePageIds: (ids) => set({ visiblePageIds: ids }),
  setPdfPreviewActive: (active) => set({ pdfPreviewActive: active }),
  setPdfExporting: (active) => set({ pdfExporting: active }),
  requestHydration: () => {
    // requestId를 단조 증가시켜 비동기 hydration 응답의 최신성 비교 기준으로 사용한다.
    const next = get().hydrationRequestId + 1;
    set({ hydrationRequestId: next });
    return next;
  },
  setHydrationReady: (requestId) =>
    set((state) =>
      requestId > state.hydrationReadyId
        ? { hydrationReadyId: requestId }
        : state,
    ),
  beginSwap: () =>
    set((state) => ({ swapInFlight: state.swapInFlight + 1 })),
  endSwap: () =>
    set((state) => ({
      swapInFlight: Math.max(0, state.swapInFlight - 1),
    })),
  setForceHydrate: (active) => set({ forceHydrate: active }),
  requestForceHydrate: () => {
    // 강제 hydrate는 별도 requestId를 사용해 일반 hydration 신호와 충돌하지 않게 분리한다.
    const next = get().forceHydrateRequestId + 1;
    set({ forceHydrateRequestId: next, forceHydrate: true });
    return next;
  },
  setForceHydrateReady: (requestId) =>
    set((state) =>
      requestId > state.forceHydrateReadyId
        ? { forceHydrateReadyId: requestId }
        : state,
    ),
}));

// 조건 미충족 시 구독이 영원히 유지되는 것을 방지하기 위한 안전 타임아웃
const HYDRATION_TIMEOUT_MS = 10_000;

export const waitForForceHydrate = (requestId: number, timeoutMs = HYDRATION_TIMEOUT_MS) =>
  new Promise<void>((resolve) => {
    const current = usePageSwapStore.getState().forceHydrateReadyId;
    if (current >= requestId) {
      resolve();
      return;
    }
    let settled = false;
    let timedOut = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (timedOut) {
        console.warn(`[pageSwapStore] waitForForceHydrate timed out (requestId=${requestId})`);
      }
      resolve();
    };
    const timer = setTimeout(() => { timedOut = true; settle(); }, timeoutMs);
    const unsubscribe = usePageSwapStore.subscribe((state) => {
      if (state.forceHydrateReadyId >= requestId) {
        settle();
      }
    });
  });

export const waitForHydration = (requestId: number, timeoutMs = HYDRATION_TIMEOUT_MS) =>
  new Promise<void>((resolve) => {
    const current = usePageSwapStore.getState().hydrationReadyId;
    if (current >= requestId) {
      resolve();
      return;
    }
    let settled = false;
    let timedOut = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (timedOut) {
        console.warn(`[pageSwapStore] waitForHydration timed out (requestId=${requestId})`);
      }
      resolve();
    };
    const timer = setTimeout(() => { timedOut = true; settle(); }, timeoutMs);
    const unsubscribe = usePageSwapStore.subscribe((state) => {
      if (state.hydrationReadyId >= requestId) {
        settle();
      }
    });
  });
