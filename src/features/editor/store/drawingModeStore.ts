/**
 * 자유형 그리기 모드 상태를 관리하는 스토어.
 * isDrawing이 true이면 캔버스 포인터 이벤트가 요소 선택 대신 경로 수집으로 전환된다.
 * smoothPromptElementId: 생성 직후 "매끈하게" 팝업을 표시할 요소 ID (1회성).
 */
import { create } from "zustand";

interface DrawingModeStore {
  isDrawing: boolean;
  setIsDrawing: (v: boolean) => void;
  /** 생성 직후 "매끈하게 다듬으시겠어요?" 팝업 대상 요소 ID */
  smoothPromptElementId: string | null;
  setSmoothPromptElementId: (id: string | null) => void;
}

export const useDrawingModeStore = create<DrawingModeStore>((set) => ({
  isDrawing: false,
  setIsDrawing: (v) => set({ isDrawing: v }),
  smoothPromptElementId: null,
  setSmoothPromptElementId: (id) => set({ smoothPromptElementId: id }),
}));
