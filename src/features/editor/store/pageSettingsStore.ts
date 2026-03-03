/**
 * 페이지 설정 패널 상태와 페이지 반영 요청 이벤트를 관리하는 스토어.
 */
import { create } from "zustand";
import type { PageBackground, PageNumbering } from "../model/pageTypes";
import {
  DEFAULT_PAGE_BACKGROUND,
  DEFAULT_PAGE_NUMBERING,
} from "../utils/pagePresentation";

type PageSettingsRequest = {
  background?: PageBackground;
  numbering?: PageNumbering;
};

type PageSettingsPanelState = {
  background: PageBackground;
  numbering: PageNumbering;
};

interface PageSettingsStore {
  requestId: number;
  request: PageSettingsRequest | null;
  panel: PageSettingsPanelState;
  syncPanel: (nextPanel: PageSettingsPanelState) => void;
  applySettings: (patch: PageSettingsRequest) => void;
}

const cloneNumbering = (numbering: PageNumbering): PageNumbering => ({
  enabled: numbering.enabled,
  format: numbering.format,
  position: numbering.position,
  startPage: numbering.startPage ?? 1,
});

const cloneBackground = (background: PageBackground): PageBackground => {
  if (background.type === "color") {
    return { type: "color", color: background.color };
  }
  if (background.type === "image") {
    return { type: "image", imageUrl: background.imageUrl };
  }
  return { type: "none" };
};

export const usePageSettingsStore = create<PageSettingsStore>((set) => ({
  requestId: 0,
  request: null,
  panel: {
    background: cloneBackground(DEFAULT_PAGE_BACKGROUND),
    numbering: cloneNumbering(DEFAULT_PAGE_NUMBERING),
  },
  syncPanel: (nextPanel) => {
    set({
      panel: {
        background: cloneBackground(nextPanel.background),
        numbering: cloneNumbering(nextPanel.numbering),
      },
    });
  },
  applySettings: (patch) => {
    set((state) => {
      const nextBackground = patch.background
        ? cloneBackground(patch.background)
        : cloneBackground(state.panel.background);
      const nextNumbering = patch.numbering
        ? cloneNumbering(patch.numbering)
        : cloneNumbering(state.panel.numbering);
      return {
        requestId: state.requestId + 1,
        request: patch,
        panel: {
          background: nextBackground,
          numbering: nextNumbering,
        },
      };
    });
  },
}));
