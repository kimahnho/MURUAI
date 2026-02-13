/**
 * 시간표 일정 데이터의 조회/갱신 상태를 관리하는 홈 스토어 훅.
 */
import { create } from "zustand";
import type { Schedule } from "../model/schedule.model";

interface ScheduleStore {
  editingSchedule: Schedule | null;
  setEditingSchedule: (schedule: Schedule | null) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  editingSchedule: null,
  setEditingSchedule: (schedule) => { set({ editingSchedule: schedule }); },
}));
