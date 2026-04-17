/**
 * 2단계 위자드 컨트롤러 — 스텝 인디케이터, 헤더, 콘텐츠, 하단 버튼.
 *
 * 1 (설정) → 2 (주인공 확인) → 5 (생성 중) → 6 (완료)
 */
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

import { mp } from "@/shared/utils/mixpanel";
import type { WizardStep } from "../model/storybookTypes";
import { STEP_LABELS } from "../model/storybookTypes";
import { canAdvance } from "../model/storybookValidation";
import { useStorybookWizardStore } from "../store/useStorybookWizardStore";
import { fetchCreditBalance } from "@/features/editor/utils/aiTemplateUsage";

import SetupStep from "./steps/SetupStep";
import AnchorStep from "./steps/AnchorStep";
import GeneratingStep from "./steps/GeneratingStep";
import CompleteStep from "./steps/CompleteStep";

const STEP_COMPONENTS: Partial<Record<WizardStep, React.ComponentType>> = {
  1: SetupStep,
  2: AnchorStep,
  5: GeneratingStep,
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  1: "아이의 나이와 이야기 설정을 한 번에 입력해 주세요.",
  2: "주인공과 기획서를 확인하고 시작하세요.",
  5: "",
  6: "",
};

const INTERACTIVE_STEPS: readonly WizardStep[] = [1, 2];
const INDICATOR_STEPS: readonly WizardStep[] = [1, 2];

interface StorybookWizardProps {
  onClose: () => void;
}

const StorybookWizard = ({ onClose }: StorybookWizardProps) => {
  const currentStep = useStorybookWizardStore((s) => s.currentStep);
  const formData = useStorybookWizardStore((s) => s.formData);
  const isLoading = useStorybookWizardStore((s) => s.isLoading);
  const error = useStorybookWizardStore((s) => s.error);
  const goBack = useStorybookWizardStore((s) => s.goBack);
  const goNext = useStorybookWizardStore((s) => s.goNext);
  const goToStep = useStorybookWizardStore((s) => s.goToStep);

  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Step 2 진입 시 크레딧 잔액 조회
  useEffect(() => {
    if (currentStep === 2) {
      void fetchCreditBalance().then(setCreditBalance);
    }
  }, [currentStep]);

  const StepContent = STEP_COMPONENTS[currentStep];
  const isAdvanceable = canAdvance(currentStep, formData);
  const isInteractiveStep = INTERACTIVE_STEPS.includes(currentStep);

  const handleNext = () => {
    mp.track("AI 스토리북 스텝 이동", { from: currentStep, to: "next" });

    if (currentStep === 1) {
      mp.track("AI 스토리북 설정 완료", {
        age: formData.childInfo?.age,
        topic_length: formData.topic.length,
        page_count: formData.pageCount,
        art_style: formData.artStyle,
        layout: formData.layout,
        font_family: formData.fontFamily,
        used_saved_character: !!formData.selectedCharacterId,
      });
      goNext();
      return;
    }

    if (currentStep === 2) {
      mp.track("AI 스토리북 주인공 확인", {
        used_custom_prompt: !!formData.characterPrompt,
        sub_character_count: formData.manualSubCharacters?.length ?? 0,
      });
      // 생성 시작 → 모달 즉시 닫기. generateBook은 백그라운드에서 진행되며
      // 에디터 상단 StorybookBanner가 진행률·완료·재생성을 담당한다.
      goNext();
      onClose();
      return;
    }

    goNext();
  };

  const nextLabel = currentStep === 2 ? `${formData.pageCount}장 만들기 시작` : "다음";

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      {isInteractiveStep && (
        <div className="mb-5 pr-6">
          <h2 className="text-title-20-semibold text-black-90 mb-1">
            AI 스토리북 만들기
          </h2>

          {/* 스텝 인디케이터 (2칸) */}
          <div className="flex items-center gap-1 mb-3">
            {INDICATOR_STEPS.map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  step <= currentStep ? "bg-primary" : "bg-black-10"
                }`}
              />
            ))}
          </div>

          {/* 스텝 번호 + 라벨 */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-11-semibold text-white">
              {currentStep}
            </span>
            <span className="text-14-semibold text-black-80">
              {STEP_LABELS[currentStep]}
            </span>
          </div>
          {STEP_DESCRIPTIONS[currentStep] && (
            <p className="text-13-regular text-black-40 mt-1">
              {STEP_DESCRIPTIONS[currentStep]}
            </p>
          )}
        </div>
      )}

      {/* 개발 전용: 스텝 바로가기 */}
      {import.meta.env.DEV && isInteractiveStep && (
        <div className="flex flex-wrap gap-1 mb-2">
          {([1, 2] as WizardStep[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => goToStep(s)}
              className={`px-2 py-0.5 rounded text-12-regular ${
                currentStep === s
                  ? "bg-primary text-white-100"
                  : "bg-black-5 text-black-50 hover:bg-black-10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mb-3 rounded-lg bg-error-50 px-3 py-2.5 text-13-medium text-error-700">
          {error}
        </div>
      )}

      {/* 스텝 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {currentStep === 6 ? (
          <CompleteStep onClose={onClose} />
        ) : StepContent ? (
          <StepContent />
        ) : null}
      </div>

      {/* 하단 네비게이션 */}
      {isInteractiveStep && (
        <div className="flex flex-col gap-2 pt-4 mt-4 shrink-0 border-t border-black-10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                mp.track("AI 스토리북 스텝 이동", { from: currentStep, to: "back" });
                goBack();
              }}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-14-medium text-black-40 hover:bg-primary-50 hover:text-primary disabled:opacity-0 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!isAdvanceable || isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-14-semibold text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep === 1 ? "기획서 준비 중..." : "생성 중..."}
                </>
              ) : (
                <>
                  {nextLabel}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          {currentStep === 2 && creditBalance !== null && (
            <p className="text-12-regular text-black-40 text-center">
              {formData.pageCount} 크레딧 차감 · 잔여 {creditBalance}회
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StorybookWizard;
