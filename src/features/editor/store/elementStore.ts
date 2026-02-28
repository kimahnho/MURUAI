/**
 * 도형/텍스트/선 추가 요청 이벤트를 발행하는 요소 생성 스토어 모듈.
 */
import { create } from "zustand";
import type { ElementType } from "../model/canvasTypes";
import { mp } from "@/shared/utils/mixpanel";

type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  alignX?: "left" | "center" | "right" | "justify";
  alignY?: "top" | "middle" | "bottom";
  widthMode?: "auto" | "fixed" | "element";
};

interface ElementStore {
  requestId: number;
  requestedType: ElementType | null;
  requestedText: TextPreset | null;
  requestedTableConfig: { rows: number; cols: number } | null;
  requestElement: (type: ElementType) => void;
  requestText: (preset: TextPreset) => void;
  requestTableElement: (rows: number, cols: number) => void;
}

export const useElementStore = create<ElementStore>((set) => ({
  requestId: 0,
  requestedType: null,
  requestedText: null,
  requestedTableConfig: null,
  requestElement: (type) =>
    { mp.track("요소 생성", { element_type: type });
      set((state) => ({
      requestId: state.requestId + 1,
      requestedType: type,
      requestedText: null,
      requestedTableConfig: null,
    })); },
  requestText: (preset) =>
    { mp.track("요소 생성", { element_type: "text" });
      set((state) => ({
      requestId: state.requestId + 1,
      requestedType: "text",
      requestedText: preset,
      requestedTableConfig: null,
    })); },
  requestTableElement: (rows, cols) =>
    { mp.track("요소 생성", { element_type: "table" });
      set((state) => ({
      requestId: state.requestId + 1,
      requestedType: "table",
      requestedText: null,
      requestedTableConfig: { rows, cols },
    })); },
}));
