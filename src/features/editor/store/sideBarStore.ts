/**
 * 사이드바 현재 메뉴/패널 열림 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";

export type SideBarMenu =
  | "design"
  | "page"
  | "template"
  | "ai-template"
  | "emotion-aac"
  | "element"
  | "text"
  | "font"
  | "upload"
  | "table"
  | "shape-props"
  | "line-props"
  | "arrow-props"
  | "text-props"
  | "aac-props"
  | "aacCard-props"
  | "emotionCard-props"
  | "multi-props"
  | "ai-story-edit"
  | "therapy"
  | null;

interface SideBarStore {
  selectedMenu: SideBarMenu;
  setSelectedMenu: (menu: SideBarMenu) => void;
  toggleMenu: (menu: Exclude<SideBarMenu, null | "font">) => void;
}

export const useSideBarStore = create<SideBarStore>((set) => ({
  selectedMenu: "template",
  setSelectedMenu: (menu) => { set({ selectedMenu: menu }); },
  toggleMenu: (menu) =>
    { set((state) => {
      if (state.selectedMenu === menu) return state;
      mp.track("사이드바 열기", { panel: menu });
      return { selectedMenu: menu };
    }); },
}));
