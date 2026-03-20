/**
 * 크레딧 부족 모달 상태 — 이미지 생성 시 크레딧이 부족하면 모달을 띄운다.
 * EmotionSceneBanner, EmotionSceneImageModal, useStorybookWizardStore에서 공용.
 */
import { create } from "zustand";

interface CreditModalState {
  isOpen: boolean;
  message: string;
  open: (message: string) => void;
  close: () => void;
}

export const useCreditModalStore = create<CreditModalState>((set) => ({
  isOpen: false,
  message: "",
  open: (message) => set({ isOpen: true, message }),
  close: () => set({ isOpen: false, message: "" }),
}));
