/**
 * 현재 선택된 표 요소 정보와 업데이트 콜백을 관리하는 스토어 모듈.
 * TableContent(사이드바 패널)에서 표 편집 대상을 조회하고 수정하는 데 사용한다.
 */
import { create } from "zustand";
import type { TableElement } from "../model/canvasTypes";

type UpdateTableFn = (patch: Partial<TableElement>) => void;

interface TableStore {
  selectedTable: TableElement | null;
  updateTable: UpdateTableFn | null;
  setSelectedTable: (table: TableElement | null, update: UpdateTableFn | null) => void;
}

export const useTableStore = create<TableStore>((set) => ({
  selectedTable: null,
  updateTable: null,
  setSelectedTable: (table, update) => {
    set({ selectedTable: table, updateTable: update });
  },
}));
