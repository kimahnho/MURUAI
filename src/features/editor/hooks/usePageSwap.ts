import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import { savePageElements, loadPageElements } from "../utils/pageSwapStorage";
import { usePageSwapStore } from "../store/pageSwapStore";

type UsePageSwapParams = {
  pages: Page[];
  setPages: Dispatch<SetStateAction<Page[]>>;
  requiredPageIds: string[];
  maxActivePages: number;
};

export const usePageSwap = ({
  pages,
  setPages,
  requiredPageIds,
  maxActivePages,
}: UsePageSwapParams) => {
  const lruRef = useRef<string[]>([]);
  const pendingRef = useRef(new Set<string>());
  const hydrationRequestId = usePageSwapStore(
    (state) => state.hydrationRequestId,
  );
  const setHydrationReady = usePageSwapStore(
    (state) => state.setHydrationReady,
  );
  const forceHydrate = usePageSwapStore((state) => state.forceHydrate);
  const forceHydrateRequestId = usePageSwapStore(
    (state) => state.forceHydrateRequestId,
  );
  const setForceHydrateReady = usePageSwapStore(
    (state) => state.setForceHydrateReady,
  );
  const beginSwap = usePageSwapStore((state) => state.beginSwap);
  const endSwap = usePageSwapStore((state) => state.endSwap);

  useEffect(() => {
    const requiredSet = forceHydrate
      ? new Set(pages.map((page) => page.id))
      : new Set(requiredPageIds);
    const loadedPages = pages.filter((page) => !page.isSwapped);

    const updateLru = (id: string) => {
      lruRef.current = [
        ...lruRef.current.filter((entry) => entry !== id),
        id,
      ];
    };

    requiredSet.forEach(updateLru);

    const loadMissing = async () => {
      const targets = pages.filter(
        (page) => requiredSet.has(page.id) && page.isSwapped,
      );
      if (targets.length === 0) {
        if (forceHydrate) {
          setForceHydrateReady(forceHydrateRequestId);
          usePageSwapStore.getState().setForceHydrate(false);
        }
        setHydrationReady(hydrationRequestId);
        return;
      }

      for (const page of targets) {
        if (pendingRef.current.has(page.id)) continue;
        pendingRef.current.add(page.id);
        try {
          const elements = await loadPageElements(page.id);
          if (!elements) continue;
          beginSwap();
          setPages((prev) =>
            prev.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    elements,
                    isSwapped: false,
                  }
                : p,
            ),
          );
          endSwap();
        } finally {
          pendingRef.current.delete(page.id);
        }
      }

      if (forceHydrate) {
        setForceHydrateReady(forceHydrateRequestId);
        usePageSwapStore.getState().setForceHydrate(false);
      }
      setHydrationReady(hydrationRequestId);
    };

    const evictIfNeeded = async () => {
      const activeIds = new Set(requiredSet);
      const loadedCount = loadedPages.length;
      if (loadedCount <= maxActivePages) return;
      const candidates = lruRef.current.filter(
        (id) => !activeIds.has(id),
      );
      const toEvict = candidates.slice(0, loadedCount - maxActivePages);
      if (toEvict.length === 0) return;

      for (const pageId of toEvict) {
        const page = pages.find((p) => p.id === pageId);
        if (!page || page.isSwapped) continue;
        await savePageElements(page.id, page.elements);
        beginSwap();
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  elements: [],
                  isSwapped: true,
                }
              : p,
          ),
        );
        endSwap();
      }
    };

    void loadMissing().then(() => {
      if (!forceHydrate) {
        void evictIfNeeded();
      }
    });
  }, [
    pages,
    requiredPageIds,
    maxActivePages,
    setPages,
    hydrationRequestId,
    setHydrationReady,
    forceHydrate,
    forceHydrateRequestId,
    setForceHydrateReady,
  ]);
};
