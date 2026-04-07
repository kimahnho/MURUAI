/** 학습자료 에디터 전역 상태 — Zustand selector 기반 구독 필수 */
import { create } from "zustand";

import type { WorksheetComponent, WorksheetComponentType, WorksheetConfig } from "../model/types";
import { DEFAULT_CONFIGS } from "../constants/defaults";

interface WorksheetStore {
  components: WorksheetComponent[];
  activeIndex: number;

  addComponent: (type: WorksheetComponentType) => void;
  removeComponent: (index: number) => void;
  moveComponent: (index: number, direction: -1 | 1) => void;
  toggleCollapse: (index: number) => void;
  setActiveIndex: (index: number) => void;
  updateConfig: <T extends WorksheetConfig>(index: number, updater: (prev: T) => T) => void;
  setComponents: (components: WorksheetComponent[]) => void;
}

export const useWorksheetStore = create<WorksheetStore>((set) => ({
  components: [],
  activeIndex: -1,

  addComponent: (type) => {
    set((state) => {
      const newComp: WorksheetComponent = {
        id: crypto.randomUUID(),
        type,
        config: structuredClone(DEFAULT_CONFIGS[type]),
        collapsed: false,
      };
      const next = [...state.components, newComp];
      return { components: next, activeIndex: next.length - 1 };
    });
  },

  removeComponent: (index) => {
    set((state) => {
      const next = state.components.filter((_, i) => i !== index);
      return { components: next, activeIndex: -1 };
    });
  },

  moveComponent: (index, direction) => {
    set((state) => {
      const target = index + direction;
      if (target < 0 || target >= state.components.length) return state;
      const next = [...state.components];
      [next[index], next[target]] = [next[target], next[index]];
      return { components: next, activeIndex: target };
    });
  },

  toggleCollapse: (index) => {
    set((state) => {
      const next = state.components.map((c, i) =>
        i === index ? { ...c, collapsed: !c.collapsed } : c,
      );
      return { components: next };
    });
  },

  setActiveIndex: (index) => {
    set({ activeIndex: index });
  },

  updateConfig: (index, updater) => {
    set((state) => {
      const next = state.components.map((c, i) =>
        i === index ? { ...c, config: updater(c.config as never) } : c,
      );
      return { components: next };
    });
  },

  setComponents: (components) => {
    set({ components, activeIndex: components.length > 0 ? 0 : -1 });
  },
}));
