/**
 * 이미지 생성 Zustand 스토어
 * 스타일 오버라이드 제거 — agent 자동 적용 + 자연어 수정
 */
import { create } from "zustand";
import type {
  ChildVisualAgent,
  GeneratedImage,
  ImageGenPhase,
  ImageGenSession,
  ImageGenMessage,
  LearnedPattern,
} from "../model/types";

interface SelectedChild {
  id: string;
  name: string;
  birthYear?: string;
  significant?: string;
}

interface ImageGenState {
  // 아동 + Agent
  selectedChild: SelectedChild | null;
  childAgent: ChildVisualAgent | null;
  learnedPatterns: LearnedPattern[];

  // 세션
  sessions: ImageGenSession[];
  activeSession: ImageGenSession | null;
  messages: ImageGenMessage[];

  // 생성
  phase: ImageGenPhase;
  prompt: string;
  currentImage: GeneratedImage | null;
  error: string | null;
  history: GeneratedImage[];

  // 아동 + Agent 액션
  setSelectedChild: (child: SelectedChild | null) => void;
  setChildAgent: (agent: ChildVisualAgent | null) => void;
  setLearnedPatterns: (patterns: LearnedPattern[]) => void;

  // 세션 액션
  setSessions: (sessions: ImageGenSession[]) => void;
  setActiveSession: (session: ImageGenSession | null) => void;
  setMessages: (messages: ImageGenMessage[]) => void;
  addMessage: (message: ImageGenMessage) => void;

  // 생성 액션
  setPhase: (phase: ImageGenPhase) => void;
  setPrompt: (prompt: string) => void;
  setCurrentImage: (image: GeneratedImage | null) => void;
  setError: (error: string | null) => void;
  setHistory: (images: GeneratedImage[]) => void;

  // 리셋 (세션 목록은 유지)
  reset: () => void;
}

export const useImageGenStore = create<ImageGenState>()((set) => ({
  selectedChild: null,
  childAgent: null,
  learnedPatterns: [],

  sessions: [],
  activeSession: null,
  messages: [],

  phase: "idle",
  prompt: "",
  currentImage: null,
  error: null,
  history: [],

  setSelectedChild: (child) => set({ selectedChild: child }),
  setChildAgent: (agent) => set({ childAgent: agent }),
  setLearnedPatterns: (patterns) => set({ learnedPatterns: patterns }),

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (session) => set({ activeSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message].slice(-200) })),

  setPhase: (phase) => set({ phase }),
  setPrompt: (prompt) => set({ prompt }),
  setCurrentImage: (image) => set({ currentImage: image }),
  setError: (error) => set({ error }),
  setHistory: (images) => set({ history: images }),

  reset: () => set({
    selectedChild: null,
    childAgent: null,
    learnedPatterns: [],
    activeSession: null,
    messages: [],
    phase: "idle",
    prompt: "",
    currentImage: null,
    error: null,
    history: [],
    // sessions는 유지
  }),
}));
