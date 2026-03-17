/**
 * 스토리북 6단계 위자드 — 스텝 인디케이터, 헤더, 콘텐츠, 하단 버튼.
 */
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { useState, useEffect } from "react";
import { mp } from "@/shared/utils/mixpanel";
import type { WizardStep } from "../model/storybookTypes";
import { STEP_LABELS } from "../model/storybookTypes";
import { canAdvance } from "../model/storybookValidation";
import { useStorybookWizardStore } from "../store/useStorybookWizardStore";
import {
  MONTHLY_AI_TEMPLATE_LIMIT,
  fetchMonthlyAiTemplateUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import ChildInfoStep from "./steps/ChildInfoStep";
import TopicStep from "./steps/TopicStep";
import ProposalStep from "./steps/ProposalStep";
import ArtStyleStep from "./steps/ArtStyleStep";
import ReferenceImageStep from "./steps/ReferenceImageStep";
import GeneratingStep from "./steps/GeneratingStep";
import CompleteStep from "./steps/CompleteStep";

const STEP_COMPONENTS: Record<WizardStep, React.ComponentType> = {
  1: ChildInfoStep,
  2: TopicStep,
  3: ProposalStep,
  4: ArtStyleStep,
  45: ReferenceImageStep,
  5: GeneratingStep,
  6: CompleteStep,
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  1: "아동을 선택하거나 정보를 직접 입력해 주세요.",
  2: "어떤 주제의 이야기를 만들까요?",
  3: "AI가 만든 기획서를 선택해 주세요.",
  4: "그림체, 폰트, 레이아웃을 설정해 주세요.",
  45: "스토리북에 사용할 캐릭터 이미지를 확인해 주세요.",
  5: "",
  6: "",
};

// 사용자 인터랙션이 필요한 단계 (헤더/네비게이션 표시)
const INTERACTIVE_STEPS = [1, 2, 3, 4, 45] as const;
// 스텝 인디케이터에 표시할 단계
const INDICATOR_STEPS = [1, 2, 3, 4, 45] as const;

const StorybookWizard = () => {
  const currentStep = useStorybookWizardStore((s) => s.currentStep);
  const formData = useStorybookWizardStore((s) => s.formData);
  const isLoading = useStorybookWizardStore((s) => s.isLoading);
  const error = useStorybookWizardStore((s) => s.error);
  const goBack = useStorybookWizardStore((s) => s.goBack);
  const goNext = useStorybookWizardStore((s) => s.goNext);
  const fetchProposals = useStorybookWizardStore((s) => s.fetchProposals);
  const generateBook = useStorybookWizardStore((s) => s.generateBook);

  const [monthlyUsed, setMonthlyUsed] = useState<number | null>(null);

  useEffect(() => {
    if (currentStep === 45) {
      void fetchMonthlyAiTemplateUsage().then(setMonthlyUsed);
    }
  }, [currentStep]);

  const remaining = monthlyUsed !== null ? MONTHLY_AI_TEMPLATE_LIMIT - monthlyUsed : null;

  const StepContent = STEP_COMPONENTS[currentStep];
  const isAdvanceable = canAdvance(currentStep, formData);
  const isInteractiveStep = (INTERACTIVE_STEPS as readonly number[]).includes(currentStep);

  const handleNext = () => {
    mp.track("AI 스토리북 스텝 이동", { from: currentStep, to: "next" });
    if (currentStep === 2) {
      void fetchProposals();
      return;
    }
    if (currentStep === 45) {
      void generateBook();
      return;
    }
    goNext();
  };

  const nextLabel = currentStep === 45 ? "생성하기" : "다음";

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
            {INDICATOR_STEPS.map((step) => (
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
              {/* {currentStep === 45 ? 5 : currentStep} */}
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
            onClick={() => {
              mp.track("AI 스토리북 스텝 이동", { from: currentStep, to: "back" });
              goBack();
            }}
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
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-14-semibold text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
          {currentStep === 45 && remaining !== null && (
            <p className="text-12-regular text-black-40 ml-auto mr-2">
              1회 차감 (잔여 {remaining}회)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StorybookWizard;
