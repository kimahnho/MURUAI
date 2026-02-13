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

export const waitForForceHydrate = (requestId: number) =>
  new Promise<void>((resolve) => {
    const current = usePageSwapStore.getState().forceHydrateReadyId;
    if (current >= requestId) {
      resolve();
      return;
    }
    const unsubscribe = usePageSwapStore.subscribe((state) => {
      // 준비 완료 id가 요청 id 이상이 되는 순간 대기 해제한다.
      if (state.forceHydrateReadyId >= requestId) {
        unsubscribe();
        resolve();
      }
    });
  });

export const waitForHydration = (requestId: number) =>
  new Promise<void>((resolve) => {
    const current = usePageSwapStore.getState().hydrationReadyId;
    if (current >= requestId) {
      resolve();
      return;
    }
    const unsubscribe = usePageSwapStore.subscribe((state) => {
      if (state.hydrationReadyId >= requestId) {
        unsubscribe();
        resolve();
      }
    });
  });
