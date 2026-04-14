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
  | "freeform-props"
  | "ai-story-edit"
  | "therapy"
  | null;

export type EmotionAacTab = "all" | "emotion" | "aac" | "image";
export type EmotionType = "photo" | "drawing" | "lineEmoji";
export type EmotionGender = "boy" | "girl";

interface SideBarStore {
  selectedMenu: SideBarMenu;
  setSelectedMenu: (menu: SideBarMenu) => void;
  toggleMenu: (menu: Exclude<SideBarMenu, null | "font">) => void;

  // 사이드바 콘텐츠 내부 탭/뷰 상태 — 요소 선택 overlay로 언마운트되어도 유지
  emotionAacTab: EmotionAacTab;
  setEmotionAacTab: (tab: EmotionAacTab) => void;
  emotionType: EmotionType;
  setEmotionType: (type: EmotionType) => void;
  emotionGender: EmotionGender;
  setEmotionGender: (gender: EmotionGender) => void;
  templateCarouselPages: Record<string, number>;
  setTemplateCarouselPage: (key: string, page: number) => void;
  recentImagesExpanded: boolean;
  setRecentImagesExpanded: (expanded: boolean) => void;
  imageSearchQuery: string;
  setImageSearchQuery: (query: string) => void;
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

  emotionAacTab: "emotion",
  setEmotionAacTab: (tab) => { set({ emotionAacTab: tab }); },
  emotionType: "photo",
  setEmotionType: (type) => { set({ emotionType: type }); },
  emotionGender: "boy",
  setEmotionGender: (gender) => { set({ emotionGender: gender }); },
  templateCarouselPages: {},
  setTemplateCarouselPage: (key, page) => { set((s) => ({ templateCarouselPages: { ...s.templateCarouselPages, [key]: page } })); },
  recentImagesExpanded: false,
  setRecentImagesExpanded: (expanded) => { set({ recentImagesExpanded: expanded }); },
  imageSearchQuery: "",
  setImageSearchQuery: (query) => { set({ imageSearchQuery: query }); },
}));
