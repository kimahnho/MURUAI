/**
 * 최근 사용한 색상 목록을 세션 동안 유지하는 스토어.
 * ColorPickerPopover에서 색상 확정 시 addRecentColor를 호출한다.
 */
import { create } from "zustand";

const MAX_RECENT_COLORS = 5;

interface RecentColorStore {
  recentColors: string[];
  addRecentColor: (color: string) => void;
}

export const useRecentColorStore = create<RecentColorStore>((set) => ({
  recentColors: [],
  addRecentColor: (color) =>
    set((state) => {
      const upper = color.toUpperCase();
      const filtered = state.recentColors.filter((c) => c !== upper);
      return { recentColors: [upper, ...filtered].slice(0, MAX_RECENT_COLORS) };
    }),
}));
