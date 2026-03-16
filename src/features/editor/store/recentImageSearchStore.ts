/**
 * 이미지 라이브러리에서 최근 검색한 키워드를 세션 동안 유지하는 스토어.
 * 검색 실행 시 addRecentSearch를 호출한다.
 */
import { create } from "zustand";

const MAX_RECENT_SEARCHES = 3;

interface RecentImageSearchStore {
  recentSearches: string[];
  addRecentSearch: (keyword: string) => void;
  removeRecentSearch: (keyword: string) => void;
  searchInput: string;
  selectedStyle: string;
  selectedTags: string[];
  setSearchInput: (value: string) => void;
  setSelectedStyle: (value: string) => void;
  setSelectedTags: (value: string[]) => void;
}

export const useRecentImageSearchStore = create<RecentImageSearchStore>((set) => ({
  recentSearches: [],
  addRecentSearch: (keyword) =>
    set((state) => {
      const trimmed = keyword.trim();
      if (!trimmed) return state;
      const filtered = state.recentSearches.filter((k) => k !== trimmed);
      return { recentSearches: [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES) };
    }),
  removeRecentSearch: (keyword) =>
    set((state) => ({
      recentSearches: state.recentSearches.filter((k) => k !== keyword),
    })),
  searchInput: "",
  selectedStyle: "",
  selectedTags: [],
  setSearchInput: (value) => set({ searchInput: value }),
  setSelectedStyle: (value) => set({ selectedStyle: value }),
  setSelectedTags: (value) => set({ selectedTags: value }),
}));
