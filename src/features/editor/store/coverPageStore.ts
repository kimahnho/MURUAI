/**
 * 표지 페이지 상태 관리 스토어.
 * pageSettingsStore와 동일한 패턴: sync + request + subscription.
 */
import { create } from "zustand";
import type { CoverData } from "../covers/coverTypes";

type CoverRequest =
  | { type: "insert"; coverData: CoverData }
  | { type: "update-title"; title: string }
  | { type: "change"; coverData: CoverData }
  | { type: "remove" };

interface CoverPageStore {
  hasCover: boolean;
  currentCoverData: CoverData | null;

  requestId: number;
  request: CoverRequest | null;

  syncCoverState: (hasCover: boolean, coverData: CoverData | null) => void;
  requestInsertCover: (coverData: CoverData) => void;
  requestChangeCover: (coverData: CoverData) => void;
  requestUpdateTitle: (title: string) => void;
  requestRemoveCover: () => void;
}

export const useCoverPageStore = create<CoverPageStore>((set) => ({
  hasCover: false,
  currentCoverData: null,
  requestId: 0,
  request: null,

  syncCoverState: (hasCover, coverData) =>
    set({ hasCover, currentCoverData: coverData }),

  requestInsertCover: (coverData) =>
    set((s) => ({ request: { type: "insert", coverData }, requestId: s.requestId + 1 })),

  requestChangeCover: (coverData) =>
    set((s) => ({ request: { type: "change", coverData }, requestId: s.requestId + 1 })),

  requestUpdateTitle: (title) =>
    set((s) => ({ request: { type: "update-title", title }, requestId: s.requestId + 1 })),

  requestRemoveCover: () =>
    set((s) => ({ request: { type: "remove" }, requestId: s.requestId + 1 })),
}));
