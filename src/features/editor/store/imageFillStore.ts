/**
 * 이미지 채우기 요청과 대상 선택 정보를 전달하는 스토어 모듈.
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";

interface ImageFillStore {
  requestId: number;
  imageUrl: string | null;
  label?: string;
  width?: number;
  height?: number;
  forceInsert?: boolean;
  source?: string;
  requestImageFill: (
    imageUrl: string,
    label?: string,
    size?: { width: number; height: number },
    options?: { forceInsert?: boolean; source?: string }
  ) => void;
}

export const useImageFillStore = create<ImageFillStore>((set) => ({
  requestId: 0,
  imageUrl: null,
  label: undefined,
  width: undefined,
  height: undefined,
  forceInsert: false,
  source: undefined,
  requestImageFill: (imageUrl, label, size, options) =>
    { mp.track("이미지 추가", { source: options?.source ?? "unknown" });
      set((state) => ({
      requestId: state.requestId + 1,
      imageUrl,
      label,
      width: size?.width,
      height: size?.height,
      forceInsert: options?.forceInsert ?? false,
      source: options?.source,
    })); },
}));
