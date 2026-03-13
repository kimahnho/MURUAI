/**
 * 현재 폰트 패널 선택값과 텍스트 스타일 변경 요청 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";

type FontPayload = {
  fontFamily?: string;
  fontWeight?: number;
};

interface FontStore {
  requestId: number;
  request: FontPayload | null;
  panelFontFamily: string;
  panelFontWeight: number;
  usedFontFamilies: string[];
  setPanelFont: (payload: Required<FontPayload>) => void;
  applyFont: (payload: FontPayload) => void;
  setUsedFontFamilies: (families: string[]) => void;
}

export const useFontStore = create<FontStore>((set) => ({
  requestId: 0,
  request: null,
  panelFontFamily: "Pretendard",
  panelFontWeight: 400,
  usedFontFamilies: [],
  setPanelFont: (payload) =>
    { set({
      panelFontFamily: payload.fontFamily,
      panelFontWeight: payload.fontWeight,
    }); },
  applyFont: (payload) =>
    { set((state) => ({
      requestId: state.requestId + 1,
      request: payload,
      panelFontFamily: payload.fontFamily ?? state.panelFontFamily,
      panelFontWeight: payload.fontWeight ?? state.panelFontWeight,
    })); },
  setUsedFontFamilies: (families) => { set({ usedFontFamilies: families }); },
}));
