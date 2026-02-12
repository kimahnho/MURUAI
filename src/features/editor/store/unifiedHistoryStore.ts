import { create } from "zustand";
import type { Page } from "../model/pageTypes";

// History entry that stores complete page state
type HistoryEntry = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  timestamp: number;
  label?: string;
};

interface UnifiedHistoryState {
  // History stacks
  past: HistoryEntry[];
  present: HistoryEntry | null;
  future: HistoryEntry[];

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

const HISTORY_MERGE_WINDOW_MS = 500;
const MAX_HISTORY_ENTRIES = 50;

// Helper to check if two page arrays are equal
const arePagesEqual = (a: Page[], b: Page[]): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
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
      ? [...state.past, state.present].slice(-MAX_HISTORY_ENTRIES)
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

    const newEntry: HistoryEntry = {
      pages: clonePages(pages),
      selectedPageId,
      selectedIds: [...selectedIds],
      timestamp: Date.now(),
      label,
    };

    const nextPast = state.present
      ? [...state.past, state.present].slice(-MAX_HISTORY_ENTRIES)
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

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);

    set({
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
      canUndo: newPast.length > 0,
      canRedo: true,
      undoRequestId: state.undoRequestId + 1,
    });
  },

  requestRedo: () => {
    const state = get();
    if (state.future.length === 0 || !state.present) return;

    const next = state.future[0];
    const newFuture = state.future.slice(1);

    set({
      past: [...state.past, state.present],
      present: next,
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
