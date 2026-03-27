/**
 * 최근 사용한 이미지 목록을 sessionStorage에 영속화하는 스토어.
 * 이미지 삽입 시 addRecentImage를 호출한다.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX_RECENT_IMAGES = 10;

export type RecentImage = {
  url: string;
  label: string;
  source: string;
};

interface RecentImageUsageStore {
  recentImages: RecentImage[];
  addRecentImage: (url: string, label: string, source: string) => void;
}

export const useRecentImageUsageStore = create<RecentImageUsageStore>()(
  persist(
    (set) => ({
      recentImages: [],
      addRecentImage: (url, label, source) =>
        set((state) => {
          const filtered = state.recentImages.filter((img) => img.url !== url);
          return {
            recentImages: [{ url, label, source }, ...filtered].slice(
              0,
              MAX_RECENT_IMAGES,
            ),
          };
        }),
    }),
    {
      name: "recent-image-usage",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
