/**
 * 폴더 상태 관리. 폴더 목록 + 선택된 폴더 + 로딩 상태.
 * sessionStorage로 마지막 선택 폴더 유지.
 */
import { create } from "zustand";

import type { FolderNode } from "../model/folderTypes";

export type FolderFilter =
  | { type: "all" }
  | { type: "folder"; folderId: string }
  | { type: "unfiled" };

const FILTER_STORAGE_KEY = "mydoc-folder-filter";

const readSavedFilter = (): FolderFilter => {
  try {
    const saved = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (!saved) return { type: "all" };
    const parsed = JSON.parse(saved) as FolderFilter;
    if (parsed.type === "folder" && parsed.folderId) return parsed;
    if (parsed.type === "unfiled") return parsed;
    return { type: "all" };
  } catch {
    return { type: "all" };
  }
};

interface FolderState {
  folders: FolderNode[];
  setFolders: (folders: FolderNode[]) => void;

  unfiledCount: number;
  setUnfiledCount: (count: number) => void;

  filter: FolderFilter;
  setFilter: (filter: FolderFilter) => void;

  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  isFolderSectionOpen: boolean;
  toggleFolderSection: () => void;
}

export const useFolderStore = create<FolderState>((set) => ({
  folders: [],
  setFolders: (folders) => set({ folders }),

  unfiledCount: 0,
  setUnfiledCount: (count) => set({ unfiledCount: count }),

  filter: readSavedFilter(),
  setFilter: (filter) => {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
    set({ filter });
  },

  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),

  isFolderSectionOpen: true,
  toggleFolderSection: () =>
    set((s) => ({ isFolderSectionOpen: !s.isFolderSectionOpen })),
}));
