import { create } from "zustand";
import { mp } from "@/shared/lib/mixpanel";

interface ImageFillStore {
  requestId: number;
  imageUrl: string | null;
  label?: string;
  width?: number;
  height?: number;
  forceInsert?: boolean;
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
  requestImageFill: (imageUrl, label, size, options) =>
    { mp.track("image_added", { source: options?.source ?? "unknown" });
      set((state) => ({
      requestId: state.requestId + 1,
      imageUrl,
      label,
      width: size?.width,
      height: size?.height,
      forceInsert: options?.forceInsert ?? false,
    })); },
}));
