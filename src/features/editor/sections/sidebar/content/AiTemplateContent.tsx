/**
 * AI 템플릿 패널 — 스토리북/감정추론을 카드 형태로 나열하고, 클릭 시 모달을 연다.
 */
import { useEffect, useState } from "react";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { BookOpen, Brain, Sparkles, Zap, Send, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { mp } from "@/shared/utils/mixpanel";
import useToastStore from "@/shared/store/useToastStore";
import type { Template } from "@/features/editor/model/canvasTypes";
import { generateEmotionStory } from "@/features/editor/ai/generateEmotionStory";
import { buildEmotionStoryPages } from "@/features/editor/utils/buildEmotionStoryPages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";
import { useTemplateStore } from "@/features/editor/store/templateStore";
import { useToastStore as useEditorToastStore } from "@/features/editor/store/toastStore";
import { useEmotionSceneStore } from "@/features/editor/store/emotionSceneStore";
import {
  TEMPLATE_REGISTRY,
} from "@/features/editor/templates/templateRegistry";
import StorybookWizardModal from "@/features/storybook/components/StorybookWizardModal";
import {
  MONTHLY_AI_CREDIT_LIMIT,
  fetchMonthlyAiCreditUsage,
  requestMoreCredits,
  hasRequestedCreditsThisMonth,
} from "@/features/editor/utils/aiTemplateUsage";

import EmotionInferenceChoiceModal from "./EmotionInferenceChoiceModal";
import MultiPageTemplateDialog from "../MultiPageTemplateDialog";

const AiTemplateContent = () => {
  const [isStorybookModalOpen, setIsStorybookModalOpen] = useState(false);
  const [isEmotionChoiceModalOpen, setIsEmotionChoiceModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [monthlyUsed, setMonthlyUsed] = useState<number | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const remaining = monthlyUsed !== null ? MONTHLY_AI_CREDIT_LIMIT - monthlyUsed : null;
  const isQuotaExhausted = remaining !== null && remaining <= 0;

  // 월간 사용량 + 요청 이력 조회
  useEffect(() => {
    void fetchMonthlyAiCreditUsage().then(setMonthlyUsed);
    void hasRequestedCreditsThisMonth().then(setHasRequested);
  }, []);

  // 대시보드에서 전달된 AI intent를 소비하여 해당 모달을 자동으로 연다.
  useEffect(() => {
    const raw = sessionStorage.getItem("pendingEditorIntent");
    if (!raw) return;
    let intent: { type: string; feature?: string };
    try {
      intent = JSON.parse(raw);
    } catch {
      return;
    }
    if (intent.type !== "ai") return;
    sessionStorage.removeItem("pendingEditorIntent");

    if (intent.feature === "storybook") {
      setIsStorybookModalOpen(true);
    } else if (intent.feature === "emotion") {
      setIsEmotionChoiceModalOpen(true);
    }
  }, []);

  // 기존 템플릿 미리보기
  const previewTemplate = useTemplateStore((s) => s.previewTemplate);
  const openPreview = useTemplateStore((s) => s.openPreview);
  const closePreview = useTemplateStore((s) => s.closePreview);
  const requestTemplate = useTemplateStore((s) => s.requestTemplate);

  const previewTemplateData = previewTemplate
    ? TEMPLATE_REGISTRY[previewTemplate]
    : null;
  const previewPages: Template[] =
    previewTemplateData &&
    "pages" in previewTemplateData &&
    Array.isArray(previewTemplateData.pages)
      ? previewTemplateData.pages
      : previewTemplateData
        ? [previewTemplateData.template]
        : [];

  const handleApplyAllPages = () => {
    if (previewTemplate) {
      requestTemplate(previewTemplate);
      closePreview();
    }
  };

  const handleApplySelectedPages = (selectedIndices: number[]) => {
    if (previewTemplate && selectedIndices.length > 0) {
      if (selectedIndices.length === previewPages.length) {
        requestTemplate(previewTemplate);
      } else {
        requestTemplate(previewTemplate, selectedIndices);
      }
      closePreview();
    }
  };

  const handleRequestCredits = async () => {
    if (hasRequested || isRequesting) return;
    setIsRequesting(true);
    const success = await requestMoreCredits();
    setIsRequesting(false);
    if (success) {
      setHasRequested(true);
      useToastStore.getState().showToast("크레딧 요청이 전송되었어요!");
    } else {
      useToastStore.getState().showToast("요청 전송에 실패했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <div className="flex flex-col w-full gap-6">
        {/* 월간 이미지 크레딧 표시 */}
        {monthlyUsed !== null && (
          <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            isQuotaExhausted
              ? "bg-error-50 border-error-100"
              : "bg-primary-50 border-primary-200"
          }`}>
            <div className="flex flex-col">
              <span className={`text-12-regular ${isQuotaExhausted ? "text-error-700" : "text-primary-700"}`}>
                이번 달 이미지 크레딧
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-title-22-semibold ${isQuotaExhausted ? "text-error-500" : "text-primary"}`}>
                  {monthlyUsed}
                </span>
                <span className="text-14-regular text-black-50">
                  / {MONTHLY_AI_CREDIT_LIMIT}
                </span>
              </div>
            </div>
            <Zap className={`h-6 w-6 ${isQuotaExhausted ? "text-error-500" : "text-primary-300"}`} />
          </div>
        )}

        {/* 소진 안내 + 크레딧 요청 버튼 */}
        {isQuotaExhausted && (
          <div className="flex flex-col gap-2.5 rounded-lg bg-error-50 border border-error-100 px-3.5 py-2.5">
            <span className="text-13-regular text-error-700">
              이번 달 이미지 크레딧을 모두 사용했어요.
            </span>
            <button
              type="button"
              onClick={handleRequestCredits}
              disabled={hasRequested || isRequesting}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-13-semibold transition cursor-pointer ${
                hasRequested
                  ? "bg-black-10 text-black-50 cursor-default"
                  : "bg-error-100 text-error-700 hover:bg-error-200"
              }`}
            >
              {hasRequested ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  요청 완료
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {isRequesting ? "요청 중..." : "더 많은 크레딧 요청하기"}
                </>
              )}
            </button>
          </div>
        )}

        {/* 스토리북 — 텍스트 생성은 무료, 카드 항상 활성 */}
        <div className="flex flex-col w-full gap-3">
          <SectionHeader icon={Sparkles} title="AI 스토리북" />
          <TemplateCard
            icon={BookOpen}
            iconBgColor="#8b5cf6"
            borderColor="rgba(139, 92, 246, 0.2)"
            bgColor="rgba(139, 92, 246, 0.05)"
            hoverBgColor="rgba(139, 92, 246, 0.08)"
            title="AI 스토리북"
            description="아동 맞춤형 10페이지 그림책 자동 생성"
            onClick={() => { mp.track("AI 스토리북 시작"); setIsStorybookModalOpen(true); }}
          />
        </div>

        {/* 감정추론 — 텍스트 생성은 무료, 카드 항상 활성 */}
        <div className="flex flex-col w-full gap-3">
          <SectionHeader
            icon={Brain}
            iconColor="text-[#F59E0B]"
            title="AI 감정추론"
          />
          <TemplateCard
            icon={Brain}
            iconBgColor="#F59E0B"
            borderColor="rgba(245, 158, 11, 0.15)"
            bgColor="rgba(245, 158, 11, 0.03)"
            hoverBgColor="rgba(245, 158, 11, 0.08)"
            title="AI 감정추론 활동"
            description="주제를 입력하면 AI가 스토리를 만들어요"
            onClick={() => { mp.track("AI 감정추론 시작"); setIsEmotionChoiceModalOpen(true); }}
          />
        </div>
      </div>

      <StorybookWizardModal
        isOpen={isStorybookModalOpen}
        onClose={() => { setIsStorybookModalOpen(false); }}
      />

      <EmotionInferenceChoiceModal
        isOpen={isEmotionChoiceModalOpen}
        isGenerating={isAiGenerating}
        skipChoice
        onClose={() => {
          if (!isAiGenerating) setIsEmotionChoiceModalOpen(false);
        }}
        onSelectTemplate={() => {
          setIsEmotionChoiceModalOpen(false);
          openPreview("emotionInference");
        }}
        onSelectAi={async (topic: string) => {
          // 텍스트 생성은 무료 — 크레딧 체크/차감 없음
          setIsAiGenerating(true);
          try {
            const emotionImageMap = await fetchEmotionImageMap("photo-boy");
            const availableLabels = [...emotionImageMap.keys()];
            const stories = await generateEmotionStory(topic, availableLabels);
            const pages = buildEmotionStoryPages(stories, emotionImageMap);
            useTemplateStore.getState().requestInsertPages(pages);
            const storyPageIds = pages.slice(-stories.length).map((p) => p.id);
            useEmotionSceneStore.getState().addPendingGeneration({
              stories,
              storyPageIds,
              bannerPhase: "ready",
            });

            setIsEmotionChoiceModalOpen(false);
            useEditorToastStore
              .getState()
              .showToast("텍스트가 생성되었어요. 내용을 확인 후 이미지를 생성하세요.");
            mp.track("AI 감정추론 스토리 생성", { topic_length: topic.length });
          } catch (error) {
            console.error("[AI 감정추론] 스토리 생성 실패:", error);
            captureSentryError(error, "AI 감정추론 스토리 생성");
            useEditorToastStore
              .getState()
              .showToast("스토리 생성에 실패했어요. 다시 시도해 주세요.");
          } finally {
            setIsAiGenerating(false);
          }
        }}
      />

      {previewTemplate && previewTemplateData && (
        <MultiPageTemplateDialog
          open={!!previewTemplate}
          templateLabel={previewTemplateData.label}
          pages={previewPages}
          onClose={closePreview}
          onApplyAll={handleApplyAllPages}
          onApplySelected={handleApplySelectedPages}
        />
      )}
    </>
  );
};

// ─── TemplateContent.tsx와 동일 패턴의 서브 컴포넌트 ───

const SectionHeader = ({
  icon: Icon,
  iconColor,
  title,
}: {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
}) => (
  <div className="flex items-center gap-2">
    <Icon className={`icon-s items-center ${iconColor || "text-primary"}`} />
    <span className="flex text-title-16-semibold items-center">{title}</span>
  </div>
);

const TemplateCard = ({
  icon: Icon,
  iconBgColor,
  borderColor,
  bgColor,
  hoverBgColor,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  iconBgColor: string;
  borderColor: string;
  bgColor: string;
  hoverBgColor: string;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-center gap-3 w-full border rounded-xl px-4 py-3.5 transition-colors ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    }`}
    style={{
      borderColor,
      backgroundColor: bgColor,
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = hoverBgColor;
    }}
    onMouseLeave={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = bgColor;
    }}
    onClick={disabled ? undefined : onClick}
  >
    <div
      className="flex w-12 h-12 items-center justify-center rounded-lg shadow-sm shrink-0"
      style={{ backgroundColor: disabled ? "#D1D5DB" : iconBgColor }}
    >
      <Icon className="icon-m text-white" />
    </div>

    <div className="flex flex-col justify-center gap-1 min-w-0">
      <span className="text-title-18-semibold text-black-100 truncate">{title}</span>
      <span className="text-12-regular text-black-60 truncate">{description}</span>
    </div>
  </div>
);

export default AiTemplateContent;
