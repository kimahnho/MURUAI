/**
 * 사이드바 현재 메뉴/패널 열림 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";

export type SideBarMenu =
  | "design"
  | "page"
  | "template"
  | "emotion"
  | "element"
  | "image"
  | "text"
  | "font"
  | "upload"
  | "aac"
  | null;

interface SideBarStore {
  selectedMenu: SideBarMenu;
  setSelectedMenu: (menu: SideBarMenu) => void;
  toggleMenu: (menu: Exclude<SideBarMenu, null | "font">) => void;
}

export const useSideBarStore = create<SideBarStore>((set) => ({
  selectedMenu: null,
  setSelectedMenu: (menu) => { set({ selectedMenu: menu }); },
  toggleMenu: (menu) =>
    { set((state) => {
      const next = state.selectedMenu === menu ? null : menu;
      if (next) mp.track("사이드바 열기", { panel: next });
      return { selectedMenu: next };
    }); },
}));
