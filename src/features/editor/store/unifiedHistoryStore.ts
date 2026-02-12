import { create } from "zustand";
import type { Page } from "../model/pageTypes";

// History entry that stores complete page state (present only)
type HistoryEntry = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  timestamp: number;
  label?: string;
};

type PageDiff = {
  orderBefore: string[];
  orderAfter: string[];
  changedPages: Record<
    string,
    {
      before?: Page;
      after?: Page;
    }
  >;
};

type HistoryPatch = {
  diff: PageDiff;
  before: {
    selectedPageId: string;
    selectedIds: string[];
  };
  after: {
    selectedPageId: string;
    selectedIds: string[];
  };
  timestamp: number;
  label?: string;
};

interface UnifiedHistoryState {
  // History stacks
  past: HistoryPatch[];
  present: HistoryEntry | null;
  future: HistoryPatch[];

  // Transaction state
  transactionActive: boolean;
  transactionStartState: HistoryEntry | null;

  // UI state
  canUndo: boolean;
  canRedo: boolean;
  undoRequestId: number;
  redoRequestId: number;

  // Actions
  init: (pages: Page[], selectedPageId: string, selectedIds: string[]) => void;
  record: (pages: Page[], selectedPageId: string, selectedIds: string[], label?: string) => void;
  beginTransaction: (pages: Page[], selectedPageId: string, selectedIds: string[]) => void;
  commitTransaction: (pages: Page[], selectedPageId: string, selectedIds: string[], label?: string) => void;
  rollbackTransaction: () => void;
  requestUndo: () => void;
  requestRedo: () => void;
  clear: () => void;
}

// Helper to deep clone pages
const clonePages = (pages: Page[]): Page[] => {
  return JSON.parse(JSON.stringify(pages));
};

const clonePage = (page: Page): Page => JSON.parse(JSON.stringify(page));

const HISTORY_MERGE_WINDOW_MS = 500;
const MAX_HISTORY_ENTRIES = 50;

const pageHashCache = new WeakMap<Page, string>();

const getPageSignature = (page: Page): string => {
  if (page.rev != null) {
    return `${page.id}:${page.rev}`;
  }
  const cached = pageHashCache.get(page);
  if (cached) return cached;
  const hash = JSON.stringify(page);
  pageHashCache.set(page, hash);
  return hash;
};

const arePagesEqual = (a: Page[], b: Page[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
    if (getPageSignature(a[i]) !== getPageSignature(b[i])) return false;
  }
  return true;
};

const buildPageDiff = (beforePages: Page[], afterPages: Page[]): PageDiff => {
  const beforeMap = new Map(beforePages.map((page) => [page.id, page]));
  const afterMap = new Map(afterPages.map((page) => [page.id, page]));
  const beforeHash = new Map(
    beforePages.map((page) => [page.id, getPageSignature(page)]),
  );
  const afterHash = new Map(
    afterPages.map((page) => [page.id, getPageSignature(page)]),
  );
  const orderBefore = beforePages.map((page) => page.id);
  const orderAfter = afterPages.map((page) => page.id);
  const changedPages: PageDiff["changedPages"] = {};
  const allIds = new Set<string>([...orderBefore, ...orderAfter]);

  allIds.forEach((id) => {
    const before = beforeMap.get(id);
    const after = afterMap.get(id);
    if (!before && !after) return;
    if (!before || !after) {
      changedPages[id] = {
        before: before ? clonePage(before) : undefined,
        after: after ? clonePage(after) : undefined,
      };
      return;
    }
    if (beforeHash.get(id) !== afterHash.get(id)) {
      changedPages[id] = {
        before: clonePage(before),
        after: clonePage(after),
      };
    }
  });

  return { orderBefore, orderAfter, changedPages };
};

const applyPageDiff = (
  pages: Page[],
  diff: PageDiff,
  direction: "undo" | "redo",
): Page[] => {
  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const useBefore = direction === "undo";
  Object.entries(diff.changedPages).forEach(([id, change]) => {
    const next = useBefore ? change.before : change.after;
    if (!next) {
      pageMap.delete(id);
    } else {
      pageMap.set(id, clonePage(next));
    }
  });
  const order = useBefore ? diff.orderBefore : diff.orderAfter;
  return order
    .map((id) => pageMap.get(id))
    .filter((page): page is Page => Boolean(page));
};

export const useUnifiedHistoryStore = create<UnifiedHistoryState>((set, get) => ({
  past: [],
  present: null,
  future: [],
  transactionActive: false,
  transactionStartState: null,
  canUndo: false,
  canRedo: false,
  undoRequestId: 0,
  redoRequestId: 0,

  init: (pages, selectedPageId, selectedIds) => {
    set({
      past: [],
      present: {
        pages: clonePages(pages),
        selectedPageId,
        selectedIds: [...selectedIds],
        timestamp: Date.now(),
      },
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  record: (pages, selectedPageId, selectedIds, label) => {
    const state = get();

    if (state.transactionActive) return;
    if (state.present && arePagesEqual(state.present.pages, pages)) return;

    const now = Date.now();
    const newEntry: HistoryEntry = {
      pages: clonePages(pages),
      selectedPageId,
      selectedIds: [...selectedIds],
      timestamp: now,
      label,
    };

    const canMerge =
      !label &&
      state.present &&
      state.past.length > 0 &&
      now - state.present.timestamp < HISTORY_MERGE_WINDOW_MS;

    if (canMerge) {
      set({
        past: state.past,
        present: newEntry,
        future: [],
        canUndo: state.past.length > 0,
        canRedo: false,
      });
      return;
    }

    const nextPast = state.present
      ? [
          ...state.past,
          {
            diff: buildPageDiff(state.present.pages, pages),
            before: {
              selectedPageId: state.present.selectedPageId,
              selectedIds: [...state.present.selectedIds],
            },
            after: {
              selectedPageId,
              selectedIds: [...selectedIds],
            },
            timestamp: now,
            label,
          },
        ].slice(-MAX_HISTORY_ENTRIES)
      : state.past;

    set({
      past: nextPast,
      present: newEntry,
      future: [],
      canUndo: nextPast.length > 0,
      canRedo: false,
    });
  },

  beginTransaction: (pages, selectedPageId, selectedIds) => {
    const state = get();
    if (state.transactionActive) return;

    set({
      transactionActive: true,
      transactionStartState: {
        pages: clonePages(pages),
        selectedPageId,
        selectedIds: [...selectedIds],
        timestamp: Date.now(),
      },
    });
  },

  commitTransaction: (pages, selectedPageId, selectedIds, label) => {
    const state = get();
    if (!state.transactionActive) return;

    const startState = state.transactionStartState;
    if (startState && arePagesEqual(startState.pages, pages)) {
      set({
        transactionActive: false,
        transactionStartState: null,
      });
      return;
    }

    const now = Date.now();
    const newEntry: HistoryEntry = {
      pages: clonePages(pages),
      selectedPageId,
      selectedIds: [...selectedIds],
      timestamp: now,
      label,
    };

    const baseState = startState ?? state.present;
    const nextPast =
      baseState
        ? [
            ...state.past,
            {
              diff: buildPageDiff(baseState.pages, pages),
              before: {
                selectedPageId: baseState.selectedPageId,
                selectedIds: [...baseState.selectedIds],
              },
              after: {
                selectedPageId,
                selectedIds: [...selectedIds],
              },
              timestamp: now,
              label,
            },
          ].slice(-MAX_HISTORY_ENTRIES)
        : state.past;

    set({
      past: nextPast,
      present: newEntry,
      future: [],
      transactionActive: false,
      transactionStartState: null,
      canUndo: nextPast.length > 0,
      canRedo: false,
    });
  },

  rollbackTransaction: () => {
    set({
      transactionActive: false,
      transactionStartState: null,
    });
  },

  requestUndo: () => {
    const state = get();
    if (state.past.length === 0 || !state.present) return;

    const patch = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    const nextPages = applyPageDiff(state.present.pages, patch.diff, "undo");
    const newPresent: HistoryEntry = {
      pages: nextPages,
      selectedPageId: patch.before.selectedPageId,
      selectedIds: [...patch.before.selectedIds],
      timestamp: Date.now(),
      label: patch.label,
    };

    set({
      past: newPast,
      present: newPresent,
      future: [patch, ...state.future],
      canUndo: newPast.length > 0,
      canRedo: true,
      undoRequestId: state.undoRequestId + 1,
    });
  },

  requestRedo: () => {
    const state = get();
    if (state.future.length === 0 || !state.present) return;

    const patch = state.future[0];
    const newFuture = state.future.slice(1);
    const nextPages = applyPageDiff(state.present.pages, patch.diff, "redo");
    const newPresent: HistoryEntry = {
      pages: nextPages,
      selectedPageId: patch.after.selectedPageId,
      selectedIds: [...patch.after.selectedIds],
      timestamp: Date.now(),
      label: patch.label,
    };

    set({
      past: [...state.past, patch].slice(-MAX_HISTORY_ENTRIES),
      present: newPresent,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
      redoRequestId: state.redoRequestId + 1,
    });
  },

  clear: () => {
    set({
      past: [],
      present: null,
      future: [],
      transactionActive: false,
      transactionStartState: null,
      canUndo: false,
      canRedo: false,
    });
  },
}));
