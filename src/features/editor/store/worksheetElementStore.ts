/**
 * 학습자료 컴포넌트 삽입 요청 + 삽입된 컴포넌트 추적 스토어.
 * 삽입 요청: elementStore 패턴 (requestId 트리거)
 * 추적: 삽입된 컴포넌트의 타입/config/elementIds를 관리하여 오른쪽 편집 패널에서 사용
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";
import type { WorksheetComponentType, WorksheetConfig } from "@/features/worksheet-editor/model/types";

export interface InsertedWorksheetComponent {
  id: string;
  type: WorksheetComponentType;
  config: WorksheetConfig;
  elementIds: string[]; // 캔버스에 삽입된 CanvasElement ID 목록
}

interface WorksheetElementStore {
  // 삽입 요청
  requestId: number;
  requestedComponent: WorksheetComponentType | null;
  requestInsert: (componentType: WorksheetComponentType) => void;

  // 삽입된 컴포넌트 추적
  insertedComponents: InsertedWorksheetComponent[];
  addInsertedComponent: (comp: InsertedWorksheetComponent) => void;
  updateComponentConfig: (id: string, config: WorksheetConfig) => void;
  removeInsertedComponent: (id: string) => void;

  // 선택된 컴포넌트 (편집 패널용)
  selectedComponentId: string | null;
  setSelectedComponentId: (id: string | null) => void;
}

export const useWorksheetElementStore = create<WorksheetElementStore>((set) => ({
  requestId: 0,
  requestedComponent: null,
  requestInsert: (componentType) => {
    mp.track("학습자료 컴포넌트 삽입", { component_type: componentType });
    set((state) => ({
      requestId: state.requestId + 1,
      requestedComponent: componentType,
    }));
  },

  insertedComponents: [],
  addInsertedComponent: (comp) => {
    set((state) => ({
      insertedComponents: [...state.insertedComponents, comp],
      selectedComponentId: comp.id,
    }));
  },
  updateComponentConfig: (id, config) => {
    set((state) => ({
      insertedComponents: state.insertedComponents.map((c) =>
        c.id === id ? { ...c, config } : c,
      ),
    }));
  },
  removeInsertedComponent: (id) => {
    set((state) => ({
      insertedComponents: state.insertedComponents.filter((c) => c.id !== id),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
    }));
  },

  selectedComponentId: null,
  setSelectedComponentId: (id) => { set({ selectedComponentId: id }); },
}));
