import { create } from "zustand";

type ToastVariant = "default" | "primary" | "success";

interface ToastStore {
  message: string | null;
  variant: ToastVariant;
  showToast: (message: string, variant?: ToastVariant) => void;
  clearToast: () => void;
}

const useToastStore = create<ToastStore>((set) => ({
  message: null,
  variant: "default",
  showToast: (message, variant = "default") => set({ message, variant }),
  clearToast: () => set({ message: null }),
}));

export default useToastStore;
