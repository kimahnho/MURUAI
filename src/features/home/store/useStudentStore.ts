/**
 * 학생 목록 조회/선택/생성/수정 상태를 관리하는 홈 스토어 훅.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as Sentry from "@sentry/react";
import { studentModel, type Student } from "../model/student.model";
import { groupModel, type Group } from "../model/group.model";

// 캐시 유효 시간 (5분)
const CACHE_DURATION = 5 * 60 * 1000;

interface StudentStore {
  students: Student[];
  groups: Group[];
  isLoading: boolean;
  lastFetched: number | null;

  setStudents: (students: Student[]) => void;
  setGroups: (groups: Group[]) => void;

  // 캐시가 유효한지 확인
  isCacheValid: () => boolean;

  // 병렬로 데이터 불러오기 (캐시 확인 포함)
  fetchAll: (force?: boolean) => Promise<void>;

  // 개별 새로고침
  refreshStudents: () => Promise<void>;
  refreshGroups: () => Promise<void>;

  // 초기화
  clear: () => void;
}

export const useStudentStore = create<StudentStore>()(
  persist(
    (set, get) => ({
      students: [],
      groups: [],
      isLoading: false,
      lastFetched: null,

      setStudents: (students) => set({ students }),
      setGroups: (groups) => set({ groups }),

      isCacheValid: () => {
        const { lastFetched } = get();
        if (!lastFetched) return false;
        return Date.now() - lastFetched < CACHE_DURATION;
      },

      fetchAll: async (force = false) => {
        const { isCacheValid, isLoading } = get();

        // 이미 로딩 중이면 중복 요청 방지
        if (isLoading) return;

        // 캐시가 유효하고 강제 새로고침이 아니면 스킵
        if (!force && isCacheValid()) {
          return;
        }

        set({ isLoading: true });

        try {
          const [studentsResult, groupsResult] = await Promise.all([
            studentModel.getAll(),
            groupModel.getAll(),
          ]);

          if (studentsResult.data) {
            set({ students: studentsResult.data });
          }

          if (groupsResult.data) {
            set({ groups: groupsResult.data });
          }

          set({ lastFetched: Date.now() });
        } catch (error) {
          console.error("Failed to fetch data:", error);
          Sentry.captureException(error);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshStudents: async () => {
        const { data } = await studentModel.getAll();
        if (data) {
          set({ students: data, lastFetched: Date.now() });
        }
      },

      refreshGroups: async () => {
        const { data } = await groupModel.getAll();
        if (data) {
          set({ groups: data, lastFetched: Date.now() });
        }
      },

      clear: () => set({ students: [], groups: [], lastFetched: null }),
    }),
    {
      name: "student-storage",
      partialize: (state) => ({
        students: state.students,
        groups: state.groups,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
