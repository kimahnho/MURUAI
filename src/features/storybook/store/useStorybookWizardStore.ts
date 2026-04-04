/**
 * 스토리북 6단계 위자드의 내부 상태를 관리하는 Zustand 스토어.
 */
import { create } from "zustand";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";

import type {
  ChildInfo,
  StoryBook,
  StoryProposal,
  ArtStyleId,
  PageLayout,
  WizardStep,
  WizardFormData,
  SavedCharacter,
} from "../model/storybookTypes";
import { INITIAL_FORM_DATA } from "../model/storybookTypes";
import { canAdvance } from "../model/storybookValidation";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useTemplateStore } from "@/features/editor/store/templateStore";

import { generateStoryProposals } from "../ai/generateStoryProposals";
import { generateCharacterReference } from "../ai/generateCharacterReference";
import { generateStorybook } from "../ai/generateStorybook";
import { buildStoryPages } from "../utils/buildStoryPages";
import {
  checkAiCredits,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";
import {
  updateStudentGender,
  createStudentFromWizard,
} from "../data/studentService";

const STEP_ORDER: WizardStep[] = [1, 2, 3, 4, 45, 5, 6];
const nextStep = (current: WizardStep): WizardStep | null => {
  const idx = STEP_ORDER.indexOf(current);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
};
const prevStep = (current: WizardStep): WizardStep | null => {
  const idx = STEP_ORDER.indexOf(current);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
};

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
  setReferenceImageBase64: (base64: string) => void;
  setCharacterPrompt: (prompt: string) => void;
  setCustomPromptTemplate: (prompt: string) => void;
  selectSavedCharacter: (character: SavedCharacter) => void;
  clearSavedCharacter: () => void;
  selectProposal: (id: string) => void;
  updateProposalPage: (
    proposalId: string,
    pageNumber: number,
    text: string,
  ) => void;
  setEditedProposal: (proposal: StoryProposal | null) => void;

  // 비동기 액션
  fetchProposals: () => Promise<void>;
  generateCharacterRef: () => Promise<void>;
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
      const next = nextStep(currentStep);
      if (!next) return;
      if (!canAdvance(currentStep, formData)) return;

      // Step 1→2: 아동 정보 DB 동기화 (비차단)
      if (currentStep === 1 && formData.childInfo) {
        const info = formData.childInfo;
        if (info.studentId) {
          void updateStudentGender(info.studentId, info.gender);
        } else {
          void createStudentFromWizard(info).then((newId) => {
            if (newId) {
              set((s) => ({
                formData: {
                  ...s.formData,
                  childInfo: s.formData.childInfo
                    ? { ...s.formData.childInfo, studentId: newId }
                    : null,
                },
              }));
            }
          });
        }
      }

      // 저장된 캐릭터가 선택된 경우 Step 4.5(참고 이미지)를 스킵
      const shouldSkip45 = next === 45 && formData.selectedCharacterId && formData.referenceImageBase64;
      set({ currentStep: shouldSkip45 ? 5 : next, error: null });

      // Step 4.5를 스킵하고 5로 가면 바로 생성 시작
      if (shouldSkip45) {
        void get().generateBook();
      }
    },

    goBack: () => {
      const { currentStep } = get();
      const prev = prevStep(currentStep);
      if (!prev) return;
      set({ currentStep: prev, error: null });
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

    setReferenceImageBase64: (base64) => {
      set((s) => ({ formData: { ...s.formData, referenceImageBase64: base64 } }));
    },

    setCharacterPrompt: (prompt) => {
      set((s) => ({ formData: { ...s.formData, characterPrompt: prompt } }));
    },

    setCustomPromptTemplate: (prompt) => {
      set((s) => ({ formData: { ...s.formData, customPromptTemplate: prompt } }));
    },

    selectSavedCharacter: (character) => {
      // 저장된 캐릭터 선택 시: 그림체 + 캐릭터 레퍼런스 동시 설정
      set((s) => ({
        formData: {
          ...s.formData,
          artStyle: character.artStyleId ?? "custom",
          customPromptTemplate: character.promptTemplate ?? undefined,
          selectedCharacterId: character.id,
        },
      }));
      // Cloudinary URL에서 base64로 변환하여 referenceImageBase64 설정
      void fetch(character.imageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            set((s) => ({
              formData: { ...s.formData, referenceImageBase64: base64 },
            }));
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          // 이미지 로드 실패 시 캐릭터 선택만 유지
        });
    },

    clearSavedCharacter: () => {
      set((s) => ({
        formData: {
          ...s.formData,
          selectedCharacterId: undefined,
          referenceImageBase64: undefined,
        },
      }));
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
      mp.track("AI 스토리북 기획서 선택");
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
      } catch (error) {
        captureSentryError(error, "스토리북 기획서 생성");
        set({
          isLoading: false,
          error: "기획서 생성에 실패했어요. 다시 시도해 주세요.",
        });
      }
    },

    generateCharacterRef: async () => {
      const { formData } = get();
      if (!formData.childInfo) return;

      // custom인 경우 ART_STYLE_PRESETS에서 못 찾으므로 커스텀 프롬프트 사용
      const effectiveArtStyle = formData.artStyle === "custom" ? "watercolor-fairytale" : (formData.artStyle ?? "watercolor-fairytale");

      set({ isLoading: true, error: null });
      try {
        const base64 = await generateCharacterReference(
          effectiveArtStyle,
          formData.childInfo,
          formData.artStyle === "custom"
            ? (formData.customPromptTemplate ?? formData.characterPrompt)
            : formData.characterPrompt,
        );
        set((s) => ({
          formData: { ...s.formData, referenceImageBase64: base64 },
          isLoading: false,
        }));
        mp.track("AI 스토리북 캐릭터 생성");
      } catch (error) {
        captureSentryError(error, "스토리북 캐릭터 생성");
        set({
          isLoading: false,
          error: "캐릭터 생성에 실패했어요. 다시 시도해 주세요.",
        });
      }
    },

    generateBook: async () => {
      const { formData } = get();
      const proposal = formData.editedProposal;
      if (!proposal || !formData.artStyle || !formData.childInfo) return;
      const artStyle = formData.artStyle;
      // custom 그림체인 경우 customPromptTemplate을 사용
      const effectivePromptTemplate = artStyle === "custom"
        ? formData.customPromptTemplate
        : undefined;

      // 이미지 크레딧 체크 (스토리북은 부분 생성 미지원 — 전체 또는 차단)
      const imageCount = proposal.pages.length;
      const creditCheck = await checkAiCredits(imageCount);
      if (!creditCheck.canProceed) {
        const msg = creditCheck.remaining === 0
          ? "이번 달 이미지 크레딧을 모두 사용했어요."
          : `이미지 크레딧이 부족해요. (필요: ${imageCount}크레딧, 남은: ${creditCheck.remaining}크레딧)`;
        set({ error: msg });
        useCreditModalStore.getState().open(msg);
        return;
      }

      set({ isLoading: true, error: null, currentStep: 5, imageProgress: null });
      try {
        const book = await generateStorybook(
          proposal,
          artStyle,
          formData.layout,
          formData.fontFamily,
          formData.childInfo,
          formData.referenceImageBase64,
          (current, total) => { set({ imageProgress: { current, total } }); },
          effectivePromptTemplate,
        );
        set({ generatedBook: book, isLoading: false, imageProgress: null, currentStep: 6 });
        mp.track("AI 스토리북 생성 완료", { art_style: artStyle, layout: formData.layout });

        // 이미지 크레딧 차감 (성공 후)
        void recordAiCreditUsage("storybook", book.pages.length);

        // 에디터 캔버스에 10페이지 삽입
        const pages = buildStoryPages(book);
        useTemplateStore.getState().requestInsertPages(pages);
        useToastStore.getState().showToast("성공적으로 스토리북이 생성되었어요!", "success");
      } catch (error) {
        captureSentryError(error, "스토리북 생성");
        set({
          isLoading: false,
          imageProgress: null,
          error: "스토리북 생성에 실패했어요. 다시 시도해 주세요.",
          currentStep: 45,
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
