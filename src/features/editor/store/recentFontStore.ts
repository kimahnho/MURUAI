/**
 * 최근 사용한 글꼴 목록을 세션 동안 유지하는 스토어.
 * 폰트 적용 시 addRecentFont를 호출한다.
 */
import { create } from "zustand";

const MAX_RECENT_FONTS = 5;

interface RecentFontStore {
  recentFonts: string[];
  addRecentFont: (family: string) => void;
}

export const useRecentFontStore = create<RecentFontStore>((set) => ({
  recentFonts: [],
  addRecentFont: (family) =>
    set((state) => {
      const filtered = state.recentFonts.filter((f) => f !== family);
      return { recentFonts: [family, ...filtered].slice(0, MAX_RECENT_FONTS) };
    }),
}));
