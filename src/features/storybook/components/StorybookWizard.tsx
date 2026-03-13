/**
 * 스토리북 6단계 위자드 — 스텝 인디케이터, 헤더, 콘텐츠, 하단 버튼.
 */
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import type { WizardStep } from "../model/storybookTypes";
import { STEP_LABELS } from "../model/storybookTypes";
import { canAdvance } from "../model/storybookValidation";
import { useStorybookWizardStore } from "../store/useStorybookWizardStore";
import ChildInfoStep from "./steps/ChildInfoStep";
import TopicStep from "./steps/TopicStep";
import ProposalStep from "./steps/ProposalStep";
import ArtStyleStep from "./steps/ArtStyleStep";
import GeneratingStep from "./steps/GeneratingStep";
import CompleteStep from "./steps/CompleteStep";

const STEP_COMPONENTS: Record<WizardStep, React.ComponentType> = {
  1: ChildInfoStep,
  2: TopicStep,
  3: ProposalStep,
  4: ArtStyleStep,
  5: GeneratingStep,
  6: CompleteStep,
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  1: "아동을 선택하거나 정보를 직접 입력해 주세요.",
  2: "어떤 주제의 이야기를 만들까요?",
  3: "AI가 만든 기획서를 선택해 주세요.",
  4: "그림체, 폰트, 레이아웃을 설정해 주세요.",
  5: "",
  6: "",
};

const INTERACTIVE_STEPS = [1, 2, 3, 4] as const;

const StorybookWizard = () => {
  const currentStep = useStorybookWizardStore((s) => s.currentStep);
  const formData = useStorybookWizardStore((s) => s.formData);
  const isLoading = useStorybookWizardStore((s) => s.isLoading);
  const error = useStorybookWizardStore((s) => s.error);
  const goBack = useStorybookWizardStore((s) => s.goBack);
  const goNext = useStorybookWizardStore((s) => s.goNext);
  const fetchProposals = useStorybookWizardStore((s) => s.fetchProposals);
  const generateBook = useStorybookWizardStore((s) => s.generateBook);

  const StepContent = STEP_COMPONENTS[currentStep];
  const isAdvanceable = canAdvance(currentStep, formData);
  const isInteractiveStep = currentStep <= 4;

  const handleNext = () => {
    if (currentStep === 2) {
      void fetchProposals();
      return;
    }
    if (currentStep === 4) {
      void generateBook();
      return;
    }
    goNext();
  };

  const nextLabel = currentStep === 4 ? "생성하기" : "다음";

  return (
    <div className="flex flex-col h-full">
      {/* 헤더: 타이틀 + 스텝 인디케이터 */}
      {isInteractiveStep && (
        <div className="mb-5 pr-6">
          <h2 className="text-title-20-semibold text-black-100 mb-1">
            AI 스토리북 만들기
          </h2>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-1 mb-3">
            {INTERACTIVE_STEPS.map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  step <= currentStep ? "bg-primary" : "bg-black-10"
                }`}
              />
            ))}
          </div>

          {/* 스텝 라벨 + 설명 */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-11-semibold text-white">
              {currentStep}
            </span>
            <span className="text-14-semibold text-black-80">
              {STEP_LABELS[currentStep]}
            </span>
          </div>
          {STEP_DESCRIPTIONS[currentStep] && (
            <p className="text-13-regular text-black-50 mt-1">
              {STEP_DESCRIPTIONS[currentStep]}
            </p>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-13-medium text-red-600">
          {error}
        </div>
      )}

      {/* 스텝 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <StepContent />
      </div>

      {/* 하단 네비게이션 */}
      {isInteractiveStep && (
        <div className="flex items-center justify-between pt-4 mt-4 shrink-0 border-t border-black-10">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 1}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-14-medium text-black-50 hover:bg-black-5 disabled:opacity-0 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isAdvanceable || isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-14-semibold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default StorybookWizard;
