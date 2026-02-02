import { create } from "zustand";

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
    { set((state) => ({
      selectedMenu: state.selectedMenu === menu ? null : menu,
    })); },
}));
