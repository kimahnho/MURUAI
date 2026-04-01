/**
 * 이미지 생성 Zustand 스토어
 * 스타일 오버라이드 제거 — agent 자동 적용 + 자연어 수정
 */
import { create } from "zustand";
import type {
  ChildVisualAgent,
  GeneratedImage,
  ImageGenPhase,
} from "../model/types";

interface SelectedChild {
  id: string;
  name: string;
  birthYear?: string;
  significant?: string;
}

interface ImageGenState {
  selectedChild: SelectedChild | null;
  childAgent: ChildVisualAgent | null;
  phase: ImageGenPhase;
  prompt: string;
  currentImage: GeneratedImage | null;
  error: string | null;
  history: GeneratedImage[];

  setSelectedChild: (child: SelectedChild | null) => void;
  setChildAgent: (agent: ChildVisualAgent | null) => void;
  setPhase: (phase: ImageGenPhase) => void;
  setPrompt: (prompt: string) => void;
  setCurrentImage: (image: GeneratedImage | null) => void;
  setError: (error: string | null) => void;
  setHistory: (images: GeneratedImage[]) => void;
  reset: () => void;
}

export const useImageGenStore = create<ImageGenState>()((set) => ({
  selectedChild: null,
  childAgent: null,
  phase: "idle",
  prompt: "",
  currentImage: null,
  error: null,
  history: [],

  setSelectedChild: (child) => set({ selectedChild: child }),
  setChildAgent: (agent) => set({ childAgent: agent }),
  setPhase: (phase) => set({ phase }),
  setPrompt: (prompt) => set({ prompt }),
  setCurrentImage: (image) => set({ currentImage: image }),
  setError: (error) => set({ error }),
  setHistory: (images) => set({ history: images }),
  reset: () => set({
    selectedChild: null,
    childAgent: null,
    phase: "idle",
    prompt: "",
    currentImage: null,
    error: null,
    history: [],
  }),
}));
