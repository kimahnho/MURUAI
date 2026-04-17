/**
 * 2단계로 간소화된 스토리북 위자드 상태 스토어.
 *
 * Step 1 (설정) → prepareAnchor (기획서 + 주인공 병렬 생성) → Step 2 (주인공 확인)
 * → generateBook → Step 5 (생성 중) → Step 6 (완료)
 */
import { create } from "zustand";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import { aiPipelineLogger } from "@/shared/utils/aiPipelineLogger";

import type {
  ChildInfo,
  StoryBook,
  StoryProposal,
  ArtStyleId,
  PageLayout,
  WizardStep,
  WizardFormData,
  SavedCharacter,
  ManualSubCharacter,
} from "../model/storybookTypes";
import { INITIAL_FORM_DATA } from "../model/storybookTypes";
import { canAdvance } from "../model/storybookValidation";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useTemplateStore } from "@/features/editor/store/templateStore";

import { generateStoryProposals } from "../ai/generateStoryProposals";
import { generateCharacterReference } from "../ai/generateCharacterReference";
import { generateStorybook } from "../ai/generateStorybook";
import { extractCastFromStory } from "../ai/extractCastFromStory";
import { buildStoryPages } from "../utils/buildStoryPages";
import {
  useStorybookSceneStore,
  type StorybookPageMeta,
} from "./storybookSceneStore";

// Mock 유틸은 로컬 테스트용이라 리포지토리에 포함하지 않음. 필요 시 수동 복원.
import {
  checkAiCredits,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import { createAiGenerationLog, confirmAiGeneration } from "@/shared/utils/trackAiGeneration";
import { supabase } from "@/shared/api/supabase";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";

// 2단계 + 생성/완료
const STEP_ORDER: WizardStep[] = [1, 2, 5, 6];

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
  subCharProgress: { current: number; total: number } | null;
  error: string | null;

  // 네비게이션
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: WizardStep) => void;

  // 폼 업데이트
  setChildInfo: (info: ChildInfo) => void;
  setTopic: (topic: string) => void;
  setPageCount: (count: number) => void;
  setLayout: (layout: PageLayout) => void;
  setFontFamily: (font: string) => void;
  setArtStyle: (style: ArtStyleId) => void;
  setReferenceImageBase64: (base64: string) => void;
  setCharacterPrompt: (prompt: string) => void;
  setCustomPromptTemplate: (prompt: string) => void;
  selectSavedCharacter: (character: SavedCharacter) => void;
  clearSavedCharacter: () => void;
  setInsertAfterPageId: (pageId: string) => void;
  addSubCharacter: (char: ManualSubCharacter) => void;
  removeSubCharacter: (id: string) => void;
  updateSubCharacter: (id: string, patch: Partial<ManualSubCharacter>) => void;
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
  /** Step 1 → 2: 기획서 + 주인공 병렬 생성 후 Step 2 전환 */
  prepareAnchor: () => Promise<void>;
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
    subCharProgress: null,
    error: null,

    // ─── 네비게이션 ───

    goNext: () => {
      const { currentStep, formData } = get();
      if (!canAdvance(currentStep, formData)) return;

      // Step 1 → Step 2: 기획서 + 주인공 병렬 생성. Step 전환은 prepareAnchor 내부에서.
      if (currentStep === 1) {
        aiPipelineLogger.addStep("style_select", {
          artStyle: formData.artStyle,
          layout: formData.layout,
        });
        void get().prepareAnchor();
        return;
      }

      // Step 2 → 생성 시작. currentStep 전환은 generateBook 내부에서.
      if (currentStep === 2) {
        void get().generateBook();
        return;
      }

      // 그 외(5/6)는 goNext 불가 — canAdvance에서 이미 차단됨
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

    setPageCount: (count) => {
      set((s) => ({ formData: { ...s.formData, pageCount: count } }));
    },

    setLayout: (layout) => {
      set((s) => ({ formData: { ...s.formData, layout } }));
    },

    setFontFamily: (font) => {
      set((s) => ({ formData: { ...s.formData, fontFamily: font } }));
    },

    setArtStyle: (style) => {
      const prev = get().formData;
      // 같은 그림체 재선택은 무시
      if (prev.artStyle === style) return;
      // 저장된 주인공이 선택된 상태에서 그림체를 바꾸면, 주인공 레퍼런스와 그림체가
      // 서로 다른 스타일이 되어 이미지 생성이 깨짐 → 주인공 선택 자동 해제.
      const hadSavedCharacter = !!prev.selectedCharacterId;
      set((s) => ({
        formData: {
          ...s.formData,
          artStyle: style,
          ...(hadSavedCharacter
            ? { selectedCharacterId: undefined, referenceImageBase64: undefined }
            : {}),
        },
      }));
      if (hadSavedCharacter) {
        useToastStore
          .getState()
          .showToast("그림체가 바뀌어 저장된 주인공을 해제했어요. 새 주인공이 생성돼요.");
      }
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
      // 저장된 캐릭터 선택 — 그림체/프롬프트/레퍼런스 동시 세팅
      set((s) => ({
        isLoading: true,
        formData: {
          ...s.formData,
          artStyle: character.artStyleId ?? "custom",
          customPromptTemplate: character.promptTemplate ?? undefined,
          selectedCharacterId: character.id,
          referenceImageBase64: undefined,
        },
      }));
      // Cloudinary URL → base64 변환 (완료 전 "다음" 버튼 차단 위해 isLoading 유지)
      void fetch(character.imageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            set((s) => ({
              isLoading: false,
              formData: { ...s.formData, referenceImageBase64: base64 },
            }));
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          set({ isLoading: false });
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

    setInsertAfterPageId: (pageId) => {
      set((s) => ({ formData: { ...s.formData, insertAfterPageId: pageId } }));
    },

    addSubCharacter: (char) => {
      set((s) => ({
        formData: {
          ...s.formData,
          manualSubCharacters: [...(s.formData.manualSubCharacters ?? []), char],
        },
      }));
    },

    removeSubCharacter: (id) => {
      set((s) => ({
        formData: {
          ...s.formData,
          manualSubCharacters: (s.formData.manualSubCharacters ?? []).filter((c) => c.id !== id),
        },
      }));
    },

    updateSubCharacter: (id, patch) => {
      set((s) => ({
        formData: {
          ...s.formData,
          manualSubCharacters: (s.formData.manualSubCharacters ?? []).map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        },
      }));
    },

    selectProposal: (id) => {
      const { formData } = get();
      const proposal = formData.proposals.find((p) => p.id === id) ?? null;
      const selectedIndex = formData.proposals.findIndex((p) => p.id === id);
      set((s) => ({
        formData: {
          ...s.formData,
          selectedProposalId: id,
          editedProposal: proposal ? structuredClone(proposal) : null,
        },
      }));
      aiPipelineLogger.addStep("proposal_select", {
        selectedIndex,
        selectedTitle: proposal?.title,
      });
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

      aiPipelineLogger.addStep("topic_input", {
        topic: formData.topic,
        age: formData.childInfo.age,
      });

      const proposals = await generateStoryProposals(
        formData.childInfo,
        formData.topic,
        formData.pageCount,
      );
      aiPipelineLogger.addStep("proposal_generate", { proposalCount: proposals.length });

      // 첫 기획서를 기본 선택 + editedProposal 깊은 복사
      const first = proposals[0] ?? null;
      set((s) => ({
        formData: {
          ...s.formData,
          proposals,
          selectedProposalId: first?.id ?? null,
          editedProposal: first ? structuredClone(first) : null,
        },
      }));
    },

    generateCharacterRef: async () => {
      const { formData } = get();
      if (!formData.childInfo) return;

      const effectiveArtStyle = formData.artStyle ?? "watercolor-fairytale";

      const base64 = await generateCharacterReference(
        effectiveArtStyle,
        formData.childInfo,
        formData.artStyle === "custom"
          ? (formData.customPromptTemplate ?? formData.characterPrompt)
          : formData.characterPrompt,
      );
      set((s) => ({
        formData: { ...s.formData, referenceImageBase64: base64 },
      }));
      mp.track("AI 스토리북 캐릭터 생성");
    },

    prepareAnchor: async () => {
      const { formData } = get();
      if (!formData.childInfo) return;

      aiPipelineLogger.start("storybook");
      set({ isLoading: true, error: null });

      // 저장된 캐릭터 사용 시 주인공 생성 스킵 (이미 base64 세팅됨)
      const needsCharacter =
        !formData.selectedCharacterId || !formData.referenceImageBase64;

      const proposalPromise = get()
        .fetchProposals()
        .catch((error) => {
          captureSentryError(error, "스토리북 기획서 생성");
          throw error;
        });
      const characterPromise = needsCharacter
        ? get()
            .generateCharacterRef()
            .catch((error) => {
              captureSentryError(error, "스토리북 주인공 생성");
              throw error;
            })
        : Promise.resolve();

      const [proposalResult, characterResult] = await Promise.allSettled([
        proposalPromise,
        characterPromise,
      ]);

      const proposalFailed = proposalResult.status === "rejected";
      const characterFailed = characterResult.status === "rejected";

      if (proposalFailed && characterFailed) {
        set({
          isLoading: false,
          error: "기획서와 주인공 생성에 실패했어요. 다시 시도해 주세요.",
        });
        return;
      }
      if (proposalFailed) {
        set({
          isLoading: false,
          error: "기획서 생성에 실패했어요. 다시 시도해 주세요.",
        });
        return;
      }
      if (characterFailed) {
        // 기획서는 성공 → Step 2 진입시키고 주인공은 Step 2에서 재생성 가능
        set({
          isLoading: false,
          error: "주인공 생성에 실패했어요. 주인공 확인 단계에서 다시 시도해 주세요.",
          currentStep: 2,
        });
        return;
      }

      set({ isLoading: false, currentStep: 2 });
    },

    generateBook: async () => {
      const { formData } = get();
      const proposal = formData.editedProposal;
      if (!proposal || !formData.artStyle || !formData.childInfo) return;
      const artStyle = formData.artStyle;
      const layout = formData.layout;
      const fontFamily = formData.fontFamily;
      const childInfo = formData.childInfo;
      const topic = formData.topic;
      const referenceImageBase64 = formData.referenceImageBase64;
      const manualSubs = formData.manualSubCharacters ?? [];
      const insertAfterPageId = formData.insertAfterPageId;
      const effectivePromptTemplate =
        artStyle === "custom" ? formData.customPromptTemplate : undefined;

      // 동시 생성 가드(E3) — 이미 진행 중인 세트 있으면 차단
      const sceneStore = useStorybookSceneStore.getState();
      const alreadyGenerating = sceneStore.pendingGenerations.some(
        (pg) => pg.bannerPhase === "generating",
      );
      if (alreadyGenerating) {
        useToastStore
          .getState()
          .showToast("이전 스토리북 생성이 끝난 뒤 다시 시도해 주세요.");
        return;
      }

      // 이미지 크레딧 프리플라이트
      const imageCount = proposal.pages.length;
      const creditCheck = await checkAiCredits(imageCount);
      if (!creditCheck.canProceed) {
        const msg =
          creditCheck.remaining === 0
            ? "이번 달 이미지 크레딧을 모두 사용했어요."
            : `이미지 크레딧이 부족해요. (필요: ${imageCount}크레딧, 남은: ${creditCheck.remaining}크레딧)`;
        set({ error: msg });
        useCreditModalStore.getState().open(msg);
        return;
      }

      // ── Phase A: placeholder shellBook 조립 후 즉시 캔버스에 삽입 ──
      const shellBook: StoryBook = {
        id: crypto.randomUUID(),
        title: proposal.title,
        childInfo,
        artStyle,
        layout,
        fontFamily,
        createdAt: new Date().toISOString(),
        pages: proposal.pages.map((p, i) => ({
          id: crypto.randomUUID(),
          pageNumber: i + 1,
          imageUrl: "", // placeholder
          text: p.textContent,
          sceneDescription: p.sceneDescription,
          sceneGroup: i + 1,
        })),
      };
      const shellPages = buildStoryPages(shellBook);
      const storyPageIds = shellPages.map((p) => p.id);

      useTemplateStore.getState().requestInsertPages(shellPages, insertAfterPageId);

      // 배너 세트 등록
      const setKey = crypto.randomUUID();
      const characterImageUrl = referenceImageBase64
        ? `data:image/png;base64,${referenceImageBase64}`
        : "";
      sceneStore.addPendingGeneration({
        setKey,
        storyPageIds,
        bannerPhase: "generating",
        bookTitle: proposal.title,
        characterImageUrl,
        characterImageBase64: referenceImageBase64,
        artStyleId: artStyle,
        customPromptTemplate: effectivePromptTemplate,
        layout,
        subCharacters: manualSubs,
      });
      sceneStore.setGeneratingProgress({ current: 0, total: imageCount });

      // 위자드 모달 종료 (기존 동작 유지)
      set({
        isLoading: false,
        error: null,
        currentStep: 6,
        imageProgress: null,
        subCharProgress: null,
      });

      // ── Phase B: 백그라운드 이미지 생성 ──
      try {
        // 수동 서브 캐릭터 우선 — 없으면 자동 캐스팅 분석
        let freshCasting;
        if (manualSubs.length > 0) {
          freshCasting = {
            characters: manualSubs.map((sc) => ({
              role: sc.name,
              appearance: sc.appearance,
              personality: "",
              pages: Array.from({ length: proposal.pages.length }, (_, i) => i + 1),
              imageBase64: sc.imageBase64,
            })),
          };
        } else {
          freshCasting = await extractCastFromStory(proposal.pages, "주인공");
        }

        let imageMetaRaw: StorybookPageMeta[] | null = null;

        const book = await generateStorybook(
          proposal,
          artStyle,
          layout,
          fontFamily,
          childInfo,
          referenceImageBase64,
          (current, total) => {
            useStorybookSceneStore.getState().setGeneratingProgress({ current, total });
          },
          effectivePromptTemplate,
          topic,
          freshCasting,
          undefined,
          (rawMetaList) => {
            imageMetaRaw = rawMetaList.map((m) => ({
              pageId: storyPageIds[m.pageIndex] ?? "",
              pageIndex: m.pageIndex,
              sceneDescription: proposal.pages[m.pageIndex]?.sceneDescription ?? "",
              text: proposal.pages[m.pageIndex]?.textContent ?? "",
              sceneGroup: m.sceneGroup,
              isGroupFirst: m.isGroupFirst,
              groupAnchorBase64: m.groupAnchorBase64,
              generatedImageUrl: "",
            }));
          },
        );

        const failedIndices = book.failedIndices ?? [];
        const successCount = book.pages.length - failedIndices.length;

        // 성공한 이미지만 패치. 실패 페이지는 placeholder 유지.
        const urlByPageId: Record<string, string> = {};
        book.pages.forEach((bp, i) => {
          if (bp.imageUrl) {
            urlByPageId[storyPageIds[i]] = bp.imageUrl;
          }
        });
        if (Object.keys(urlByPageId).length > 0) {
          useStorybookSceneStore.getState().requestImagePatch(urlByPageId);
        }

        // 페이지 메타 (실패 포함)
        const finalMeta: StorybookPageMeta[] = shellPages.map((page, i) => {
          const m = imageMetaRaw?.[i];
          return {
            pageId: page.id,
            pageIndex: i,
            sceneDescription: m?.sceneDescription ?? book.pages[i]?.sceneDescription ?? "",
            text: m?.text ?? book.pages[i]?.text ?? "",
            sceneGroup: m?.sceneGroup ?? (i + 1),
            isGroupFirst: m?.isGroupFirst ?? true,
            groupAnchorBase64: m?.groupAnchorBase64 ?? null,
            generatedImageUrl: book.pages[i]?.imageUrl ?? "",
          };
        });

        const store = useStorybookSceneStore.getState();
        store.setPageMetaForSet(setKey, finalMeta);
        // 전부 실패면 failed, 부분 성공이면 completed
        store.setBannerPhase(setKey, successCount === 0 ? "failed" : "completed");
        store.setGeneratingProgress(null);

        // 로깅 + 토스트 + 크레딧(성공 수만큼)
        set({ generatedBook: book });
        const subCount = formData.castingNote?.characters.length ?? 0;
        mp.track("AI 스토리북 생성 완료", {
          art_style: artStyle,
          layout,
          sub_character_count: subCount,
          success_count: successCount,
          failed_count: failedIndices.length,
        });
        aiPipelineLogger.addStep("confirm", {
          pageCount: book.pages.length,
          successCount,
          failedCount: failedIndices.length,
        });
        void aiPipelineLogger.flush({ editedPages: [] });
        if (successCount > 0) {
          void recordAiCreditUsage("storybook", successCount);
        }

        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          void createAiGenerationLog(authData.user.id, "storybook", topic, "editor").then(
            (logId) => {
              if (logId) {
                void confirmAiGeneration(
                  logId,
                  book.pages.map((p) => ({ title: book.title, sentence: p.text })),
                  book.pages.map((p) => p.imageUrl).filter(Boolean),
                  artStyle,
                  layout,
                );
              }
            },
          );
        }

        if (successCount === book.pages.length) {
          useToastStore.getState().showToast("스토리북이 완성됐어요!", "success");
        } else if (successCount > 0) {
          useToastStore
            .getState()
            .showToast(
              `${successCount}장 완성 · ${failedIndices.length}장 실패. 배너에서 재시도할 수 있어요.`,
            );
        } else {
          useToastStore
            .getState()
            .showToast("모든 이미지 생성에 실패했어요. 배너에서 다시 시도해 주세요.");
        }
      } catch (error) {
        captureSentryError(error, "스토리북 생성");
        // 예외 발생 시 failed 페이즈로 (placeholder는 유지 — 유저가 선택 가능)
        useStorybookSceneStore.getState().setBannerPhase(setKey, "failed");
        useStorybookSceneStore.getState().setGeneratingProgress(null);
        useToastStore.getState().showToast("스토리북 생성에 실패했어요. 다시 시도해 주세요.");
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
        subCharProgress: null,
        error: null,
      });
    },
  }),
);
