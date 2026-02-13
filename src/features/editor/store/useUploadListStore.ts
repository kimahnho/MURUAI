/**
 * 업로드 이미지 목록 캐시와 항목 추가/삭제 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";

interface UploadListStore {
  refetchTrigger: number;
  triggerRefetch: () => void;
}

export const useUploadListStore = create<UploadListStore>((set) => ({
  refetchTrigger: 0,
  triggerRefetch: () =>
    set((state) => ({ refetchTrigger: state.refetchTrigger + 1 })),
}));
