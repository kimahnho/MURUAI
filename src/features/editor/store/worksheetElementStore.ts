/**
 * 학습자료 컴포넌트 삽입 요청 + 삽입된 컴포넌트 추적 스토어.
 * 삽입 요청: elementStore 패턴 (requestId 트리거)
 * 추적: 삽입된 컴포넌트의 타입/config/elementIds를 관리하여 오른쪽 편집 패널에서 사용
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";
import type { WorksheetComponentType, WorksheetConfig, WorksheetComponent } from "@/features/worksheet-editor/model/types";

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

  // 예제 일괄 삽입 요청
  batchRequestId: number;
  requestedBatch: WorksheetComponent[] | null;
  requestBatchInsert: (components: WorksheetComponent[]) => void;

  // 삽입된 컴포넌트 추적
  insertedComponents: InsertedWorksheetComponent[];
  addInsertedComponent: (comp: InsertedWorksheetComponent) => void;
  updateComponentConfig: (id: string, config: WorksheetConfig) => void;
  updateElementIds: (id: string, elementIds: string[]) => void;
  moveInsertedComponent: (id: string, direction: -1 | 1) => void;
  reorderInsertedComponent: (fromIndex: number, toIndex: number) => void;
  removeInsertedComponent: (id: string) => void;

  // config 변경 트리거 (구독용)
  configChangeId: number;
  lastChangedComponentId: string | null;

  // 선택된 컴포넌트 (편집 패널용)
  selectedComponentId: string | null;
  setSelectedComponentId: (id: string | null) => void;

  // 페이지 전환 시 해당 페이지의 컴포넌트로 복원
  loadFromPage: (components: InsertedWorksheetComponent[]) => void;

  // 드래그 상태
  isDraggingWorksheet: boolean;
  setDraggingWorksheet: (v: boolean) => void;

  // hover 상태 (컴포넌트 바운딩 박스 표시용)
  hoveredComponentId: string | null;
  setHoveredComponentId: (id: string | null) => void;

  // 패널 가시성
  isPanelVisible: boolean;
  showPanel: () => void;
  hidePanel: () => void;

  // 캔버스 요소 ID → 컴포넌트 ID 역검색
  findComponentByElementId: (elementId: string) => string | null;
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

  batchRequestId: 0,
  requestedBatch: null,
  requestBatchInsert: (components) => {
    mp.track("학습자료 예제 로드", { component_count: components.length });
    set((state) => ({
      batchRequestId: state.batchRequestId + 1,
      requestedBatch: components.map((c) => ({ ...structuredClone(c), id: crypto.randomUUID() })),
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
      configChangeId: state.configChangeId + 1,
      lastChangedComponentId: id,
    }));
  },
  updateElementIds: (id, elementIds) => {
    set((state) => ({
      insertedComponents: state.insertedComponents.map((c) =>
        c.id === id ? { ...c, elementIds } : c,
      ),
    }));
  },
  moveInsertedComponent: (id, direction) => {
    set((state) => {
      const idx = state.insertedComponents.findIndex((c) => c.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= state.insertedComponents.length) return state;
      const next = [...state.insertedComponents];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { insertedComponents: next, configChangeId: state.configChangeId + 1, lastChangedComponentId: "__reorder__" };
    });
  },
  reorderInsertedComponent: (fromIndex, toIndex) => {
    set((state) => {
      if (fromIndex === toIndex) return state;
      const next = [...state.insertedComponents];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { insertedComponents: next, configChangeId: state.configChangeId + 1, lastChangedComponentId: "__reorder__" };
    });
  },
  removeInsertedComponent: (id) => {
    set((state) => ({
      insertedComponents: state.insertedComponents.filter((c) => c.id !== id),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
    }));
  },

  configChangeId: 0,
  lastChangedComponentId: null,

  selectedComponentId: null,
  setSelectedComponentId: (id) => { set({ selectedComponentId: id }); },

  loadFromPage: (components) => {
    set({ insertedComponents: components, selectedComponentId: null });
  },

  isDraggingWorksheet: false,
  setDraggingWorksheet: (v) => { set({ isDraggingWorksheet: v }); },

  hoveredComponentId: null,
  setHoveredComponentId: (id) => { set({ hoveredComponentId: id }); },

  isPanelVisible: false,
  showPanel: () => { set({ isPanelVisible: true }); },
  hidePanel: () => { set({ isPanelVisible: false }); },

  findComponentByElementId: (elementId) => {
    const comps: InsertedWorksheetComponent[] = (useWorksheetElementStore as { getState: () => WorksheetElementStore }).getState().insertedComponents;
    for (const comp of comps) {
      if (comp.elementIds.includes(elementId)) return comp.id;
    }
    return null;
  },
}));
