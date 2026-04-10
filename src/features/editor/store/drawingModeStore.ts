/**
 * 자유형 그리기 모드 상태를 관리하는 스토어.
 * isDrawing이 true이면 캔버스 포인터 이벤트가 요소 선택 대신 경로 수집으로 전환된다.
 */
import { create } from "zustand";

interface DrawingModeStore {
  isDrawing: boolean;
  setIsDrawing: (v: boolean) => void;
}

export const useDrawingModeStore = create<DrawingModeStore>((set) => ({
  isDrawing: false,
  setIsDrawing: (v) => set({ isDrawing: v }),
}));
