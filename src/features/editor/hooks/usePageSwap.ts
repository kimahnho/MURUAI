import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../model/pageTypes";
import {
  savePageElementsBatch,
  loadPageElementsBatch,
} from "../utils/pageSwapStorage";
import { usePageSwapStore } from "../store/pageSwapStore";
import { measurePerf, logPerf } from "../utils/perfLogger";

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

      const batchTargets = targets.filter(
        (page) => !pendingRef.current.has(page.id),
      );
      if (batchTargets.length > 0) {
        batchTargets.forEach((page) => {
          pendingRef.current.add(page.id);
        });
        try {
          const targetIds = batchTargets.map((page) => page.id);
          const results = await measurePerf(
            "pageswap.loadBatch",
            () => loadPageElementsBatch(targetIds),
            { targetCount: targetIds.length, forceHydrate },
          );
          const hydratedMap = new Map<string, Page["elements"]>();
          results.forEach((elements, pageId) => {
            if (!elements) return;
            hydratedMap.set(pageId, elements);
          });
          if (hydratedMap.size > 0) {
            beginSwap();
            setPages((prev) =>
              prev.map((page) =>
                hydratedMap.has(page.id)
                  ? {
                      ...page,
                      elements: hydratedMap.get(page.id) ?? page.elements,
                      isSwapped: false,
                    }
                  : page,
              ),
            );
            endSwap();
          }
        } finally {
          batchTargets.forEach((page) => {
            pendingRef.current.delete(page.id);
          });
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

      const evictTargets = toEvict
        .map((pageId) => pages.find((page) => page.id === pageId))
        .filter((page): page is Page => Boolean(page && !page.isSwapped));
      if (evictTargets.length === 0) return;

      const batchEntries = evictTargets.map((page) => ({
        pageId: page.id,
        elements: page.elements,
      }));
      await measurePerf(
        "pageswap.saveBatch",
        () => savePageElementsBatch(batchEntries),
        { evictCount: batchEntries.length },
      );
      const evictedIds = new Set(
        evictTargets.map((page) => page.id),
      );
      if (evictedIds.size === 0) return;

      beginSwap();
      setPages((prev) =>
        prev.map((page) =>
          evictedIds.has(page.id)
            ? {
                ...page,
                elements: [],
                isSwapped: true,
              }
            : page,
        ),
      );
      endSwap();
    };

    void loadMissing().then(() => {
      if (!forceHydrate) {
        void evictIfNeeded();
      }
    });
    logPerf("pageswap.requiredSummary", {
      totalPages: pages.length,
      requiredCount: requiredSet.size,
      loadedCount: loadedPages.length,
      forceHydrate,
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
