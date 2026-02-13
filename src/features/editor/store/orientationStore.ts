/**
 * 문서 방향값과 방향 변경 요청 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";

export type Orientation = "horizontal" | "vertical";

interface OrientationStore {
  orientation: Orientation;
  setOrientation: (orientation: Orientation) => void;
}

export const useOrientationStore = create<OrientationStore>((set) => ({
  orientation: "vertical",
  setOrientation: (orientation) => { set({ orientation }); },
}));
