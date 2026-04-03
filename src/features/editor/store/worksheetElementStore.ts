/**
 * 학습자료 컴포넌트 삽입 요청을 발행하는 스토어.
 * elementStore와 동일한 requestId 패턴.
 */
import { create } from "zustand";
import { mp } from "@/shared/utils/mixpanel";
import type { WorksheetComponentType } from "@/features/worksheet-editor/model/types";

interface WorksheetElementStore {
  requestId: number;
  requestedComponent: WorksheetComponentType | null;
  requestInsert: (componentType: WorksheetComponentType) => void;
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
}));
