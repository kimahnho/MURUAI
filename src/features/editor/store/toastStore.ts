/**
 * 에디터 토스트 메시지 큐와 표시 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";

interface ToastStore {
  message: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  showToast: (message) => { set({ message }); },
  clearToast: () => { set({ message: null }); },
}));
