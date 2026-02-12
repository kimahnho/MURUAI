import { create } from "zustand";

type PageSwapState = {
  visiblePageIds: string[];
  pdfPreviewActive: boolean;
  hydrationRequestId: number;
  hydrationReadyId: number;
  swapInFlight: number;
  forceHydrate: boolean;
  forceHydrateRequestId: number;
  forceHydrateReadyId: number;
  setVisiblePageIds: (ids: string[]) => void;
  setPdfPreviewActive: (active: boolean) => void;
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
  hydrationRequestId: 0,
  hydrationReadyId: 0,
  swapInFlight: 0,
  forceHydrate: false,
  forceHydrateRequestId: 0,
  forceHydrateReadyId: 0,
  setVisiblePageIds: (ids) => set({ visiblePageIds: ids }),
  setPdfPreviewActive: (active) => set({ pdfPreviewActive: active }),
  requestHydration: () => {
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
