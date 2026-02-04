import { create } from "zustand";
import { mp } from "@/shared/lib/mixpanel";

export type SideBarMenu =
  | "design"
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
