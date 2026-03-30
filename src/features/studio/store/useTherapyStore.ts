/**
 * 치료 AI 채팅/파이프라인 상태를 관리하는 Zustand 스토어.
 * selector 기반 구독 필수 — 전체 스토어 구독 금지.
 */
import { create } from "zustand";
import type {
  ChatMessage,
  ChatMessageType,
  ChatRole,
  TherapyDomain,
  TherapyStudentProfile,
  SessionSet,
  WorkspaceSheet,
  TherapySession,
} from "../model/therapyTypes";

// ── 파이프라인 단계 ──

export type PipelinePhase =
  | "idle"
  | "analyzing"
  | "generating"
  | "completed"
  | "error";

// ── 스토어 인터페이스 ──

interface TherapyState {
  // 파이프라인
  phase: PipelinePhase;
  error: string | null;

  // 채팅 메시지
  messages: ChatMessage[];

  // 현재 도메인
  currentDomain: TherapyDomain | null;

  // 선택된 학생
  selectedStudent: TherapyStudentProfile | null;

  // 세션 세트 (AI 생성 결과)
  sessionSet: SessionSet | null;

  // workspace 상태 (중간 작업 페이지)
  workspaceSheets: WorkspaceSheet[];

  // 활성 세션
  activeSession: TherapySession | null;

  // 세션 목록 (사이드바)
  sessions: TherapySession[];

  // 학생 확인 모달
  pendingStudentConfirm: {
    extractedName: string;
    originalText: string;
  } | null;

  // 녹화 상태 (페이지 이동 후에도 유지)
  isRecording: boolean;
  showEvaluation: boolean;
  recSessionId: string | null;
  recStartTime: number;

  // 가드레일 경고
  warnings: string[];
}

interface TherapyActions {
  // 파이프라인
  setPhase: (phase: PipelinePhase) => void;
  setError: (error: string | null) => void;

  // 메시지
  addMessage: (role: ChatRole, content: string, type?: ChatMessageType, metadata?: ChatMessage["metadata"]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;

  // 도메인
  setCurrentDomain: (domain: TherapyDomain | null) => void;

  // 학생
  setSelectedStudent: (student: TherapyStudentProfile | null) => void;

  // 세션 세트
  setSessionSet: (set: SessionSet | null) => void;

  // workspace
  setWorkspaceSheets: (sheets: WorkspaceSheet[]) => void;
  updateWorkspaceSheet: (index: number, patch: Partial<WorkspaceSheet>) => void;

  // 세션
  setActiveSession: (session: TherapySession | null) => void;
  setSessions: (sessions: TherapySession[]) => void;

  // 학생 확인 모달
  setPendingStudentConfirm: (confirm: TherapyState["pendingStudentConfirm"]) => void;

  // 경고
  setWarnings: (warnings: string[]) => void;

  // 녹화
  startRecording: (sessionId: string) => void;
  stopRecording: () => void;
  dismissEvaluation: () => void;

  // 초기화
  reset: () => void;
}

const MAX_MESSAGES = 200;

const initialState: TherapyState = {
  phase: "idle",
  error: null,
  messages: [],
  currentDomain: null,
  selectedStudent: null,
  sessionSet: null,
  workspaceSheets: [],
  activeSession: null,
  sessions: [],
  pendingStudentConfirm: null,
  warnings: [],
  isRecording: false,
  showEvaluation: false,
  recSessionId: null,
  recStartTime: 0,
};

export const useTherapyStore = create<TherapyState & TherapyActions>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error, phase: error ? "error" : "idle" }),

  addMessage: (role, content, type = "text", metadata) =>
    set((s) => ({
      messages: [
        ...s.messages.slice(-(MAX_MESSAGES - 1)),
        {
          id: crypto.randomUUID(),
          role,
          content,
          type,
          metadata,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setCurrentDomain: (currentDomain) => set({ currentDomain }),

  setSelectedStudent: (selectedStudent) => set({ selectedStudent }),

  setSessionSet: (sessionSet) =>
    set({
      sessionSet,
      workspaceSheets: sessionSet
        ? sessionSet.sheets.map((sheet, i) => ({
            index: i,
            suggestion: sheet,
            status: "pending" as const,
          }))
        : [],
    }),

  setWorkspaceSheets: (workspaceSheets) => set({ workspaceSheets }),

  updateWorkspaceSheet: (index, patch) =>
    set((s) => ({
      workspaceSheets: s.workspaceSheets.map((sheet) =>
        sheet.index === index ? { ...sheet, ...patch } : sheet,
      ),
    })),

  setActiveSession: (activeSession) => set({ activeSession }),

  setSessions: (sessions) => set({ sessions }),

  setPendingStudentConfirm: (pendingStudentConfirm) => set({ pendingStudentConfirm }),

  setWarnings: (warnings) => set({ warnings }),

  startRecording: (sessionId) => set({ isRecording: true, recSessionId: sessionId, recStartTime: Date.now() }),
  stopRecording: () => set({ isRecording: false, showEvaluation: true }),
  dismissEvaluation: () => set({ showEvaluation: false, recSessionId: null, recStartTime: 0 }),

  // 채팅 상태만 초기화 — sessions 목록은 유지
  reset: () => set((s) => ({
    ...initialState,
    sessions: s.sessions,
    selectedStudent: s.selectedStudent,
  })),
}));
