/**
 * 이미지 채우기 요청과 대상 선택 정보를 전달하는 스토어 모듈.
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";
import { trackImageUsageEvent } from "@/shared/utils/trackEvents";
import { useRecentImageUsageStore } from "./recentImageUsageStore";

interface ImageFillStore {
  requestId: number;
  imageUrl: string | null;
  label?: string;
  width?: number;
  height?: number;
  forceInsert?: boolean;
  source?: string;
  currentDocId: string | null;
  setCurrentDocId: (docId: string | null) => void;
  requestImageFill: (
    imageUrl: string,
    label?: string,
    size?: { width: number; height: number },
    options?: { forceInsert?: boolean; source?: string }
  ) => void;
}

export const useImageFillStore = create<ImageFillStore>((set, get) => ({
  requestId: 0,
  imageUrl: null,
  label: undefined,
  width: undefined,
  height: undefined,
  forceInsert: false,
  source: undefined,
  currentDocId: null,
  setCurrentDocId: (docId) => set({ currentDocId: docId }),
  requestImageFill: (imageUrl, label, size, options) => {
    mp.track("이미지 추가", { source: options?.source ?? "unknown" });
    useRecentImageUsageStore
      .getState()
      .addRecentImage(imageUrl, label ?? "", options?.source ?? "unknown");

    // DB 이미지 사용 추적 (비차단, base64 임시 이미지 제외)
    if (!imageUrl.startsWith("data:")) {
      void trackImageUsageEvent(
        imageUrl,
        options?.source ?? "unknown",
        label ?? null,
        get().currentDocId,
      );
    }

    set((state) => ({
      requestId: state.requestId + 1,
      imageUrl,
      label,
      width: size?.width,
      height: size?.height,
      forceInsert: options?.forceInsert ?? false,
      source: options?.source,
    }));
  },
}));
