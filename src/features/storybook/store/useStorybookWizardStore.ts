/**
 * 스토리북 6단계 위자드의 내부 상태를 관리하는 Zustand 스토어.
 */
import { create } from "zustand";

import type {
  ChildInfo,
  StoryBook,
  StoryProposal,
  ArtStyleId,
  PageLayout,
  WizardStep,
  WizardFormData,
} from "../model/storybookTypes";
import { INITIAL_FORM_DATA } from "../model/storybookTypes";
import { canAdvance } from "../model/storybookValidation";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useTemplateStore } from "@/features/editor/store/templateStore";

import { generateStoryProposals } from "../ai/generateStoryProposals";
import { generateStorybook } from "../ai/generateStorybook";
import { buildStoryPages } from "../utils/buildStoryPages";

interface StorybookWizardState {
  currentStep: WizardStep;
  formData: WizardFormData;
  generatedBook: StoryBook | null;
  isLoading: boolean;
  imageProgress: { current: number; total: number } | null;
  error: string | null;

  // 네비게이션
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: WizardStep) => void;

  // 폼 업데이트
  setChildInfo: (info: ChildInfo) => void;
  setTopic: (topic: string) => void;
  setLayout: (layout: PageLayout) => void;
  setFontFamily: (font: string) => void;
  setArtStyle: (style: ArtStyleId) => void;
  selectProposal: (id: string) => void;
  updateProposalPage: (
    proposalId: string,
    pageNumber: number,
    text: string,
  ) => void;
  setEditedProposal: (proposal: StoryProposal | null) => void;

  // 비동기 액션
  fetchProposals: () => Promise<void>;
  generateBook: () => Promise<void>;

  // 초기화
  reset: () => void;
}

export const useStorybookWizardStore = create<StorybookWizardState>(
  (set, get) => ({
    currentStep: 1,
    formData: { ...INITIAL_FORM_DATA },
    generatedBook: null,
    isLoading: false,
    imageProgress: null,
    error: null,

    // ─── 네비게이션 ───

    goNext: () => {
      const { currentStep, formData } = get();
      if (currentStep >= 6) return;
      if (!canAdvance(currentStep, formData)) return;
      set({ currentStep: (currentStep + 1) as WizardStep, error: null });
    },

    goBack: () => {
      const { currentStep } = get();
      if (currentStep <= 1) return;
      set({ currentStep: (currentStep - 1) as WizardStep, error: null });
    },

    goToStep: (step) => {
      set({ currentStep: step, error: null });
    },

    // ─── 폼 업데이트 ───

    setChildInfo: (info) => {
      set((s) => ({ formData: { ...s.formData, childInfo: info } }));
    },

    setTopic: (topic) => {
      set((s) => ({ formData: { ...s.formData, topic } }));
    },

    setLayout: (layout) => {
      set((s) => ({ formData: { ...s.formData, layout } }));
    },

    setFontFamily: (font) => {
      set((s) => ({ formData: { ...s.formData, fontFamily: font } }));
    },

    setArtStyle: (style) => {
      set((s) => ({ formData: { ...s.formData, artStyle: style } }));
    },

    selectProposal: (id) => {
      const { formData } = get();
      const proposal = formData.proposals.find((p) => p.id === id) ?? null;
      set((s) => ({
        formData: {
          ...s.formData,
          selectedProposalId: id,
          editedProposal: proposal
            ? structuredClone(proposal)
            : null,
        },
      }));
    },

    updateProposalPage: (proposalId, pageNumber, text) => {
      set((s) => {
        const edited = s.formData.editedProposal;
        if (!edited || edited.id !== proposalId) return s;
        const updatedPages = edited.pages.map((p) =>
          p.pageNumber === pageNumber ? { ...p, textContent: text } : p,
        );
        return {
          formData: {
            ...s.formData,
            editedProposal: { ...edited, pages: updatedPages },
          },
        };
      });
    },

    setEditedProposal: (proposal) => {
      set((s) => ({ formData: { ...s.formData, editedProposal: proposal } }));
    },

    // ─── 비동기 액션 ───

    fetchProposals: async () => {
      const { formData } = get();
      if (!formData.childInfo) return;

      set({ isLoading: true, error: null });
      try {
        const proposals = await generateStoryProposals(
          formData.childInfo,
          formData.topic,
        );
        set((s) => ({
          formData: {
            ...s.formData,
            proposals,
            selectedProposalId: null,
            editedProposal: null,
          },
          isLoading: false,
          currentStep: 3,
        }));
      } catch {
        set({
          isLoading: false,
          error: "기획서 생성에 실패했어요. 다시 시도해 주세요.",
        });
      }
    },

    generateBook: async () => {
      const { formData } = get();
      const proposal = formData.editedProposal;
      if (!proposal || !formData.artStyle || !formData.childInfo) return;

      set({ isLoading: true, error: null, currentStep: 5, imageProgress: null });
      try {
        const book = await generateStorybook(
          proposal,
          formData.artStyle,
          formData.layout,
          formData.fontFamily,
          formData.childInfo,
          (current, total) => { set({ imageProgress: { current, total } }); },
        );
        set({ generatedBook: book, isLoading: false, imageProgress: null, currentStep: 6 });

        // 에디터 캔버스에 10페이지 삽입
        const pages = buildStoryPages(book);
        useTemplateStore.getState().requestInsertPages(pages);
        useToastStore.getState().showToast("성공적으로 스토리북이 생성되었어요!");
      } catch {
        set({
          isLoading: false,
          imageProgress: null,
          error: "스토리북 생성에 실패했어요. 다시 시도해 주세요.",
          currentStep: 4,
        });
      }
    },

    // ─── 초기화 ───

    reset: () => {
      set({
        currentStep: 1,
        formData: { ...INITIAL_FORM_DATA },
        generatedBook: null,
        isLoading: false,
        imageProgress: null,
        error: null,
      });
    },
  }),
);
