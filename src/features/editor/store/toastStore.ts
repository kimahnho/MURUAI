/**
 * 에디터 토스트 메시지 큐와 표시 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";

type ToastVariant = "default" | "primary" | "success";

interface ToastStore {
  message: string | null;
  variant: ToastVariant;
  showToast: (message: string, variant?: ToastVariant) => void;
  clearToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  variant: "default",
  showToast: (message, variant = "default") => { set({ message, variant }); },
  clearToast: () => { set({ message: null }); },
}));
