/**
 * AI 템플릿 패널 — 스토리북/감정추론을 카드 형태로 나열하고, 클릭 시 모달을 연다.
 */
import { useState } from "react";
import { BookOpen, Brain, Sparkles, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Template } from "@/features/editor/model/canvasTypes";
import { generateEmotionStory } from "@/features/editor/ai/generateEmotionStory";
import { buildEmotionStoryPages } from "@/features/editor/utils/buildEmotionStoryPages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";
import { useTemplateStore } from "@/features/editor/store/templateStore";
import { useToastStore } from "@/features/editor/store/toastStore";
// import { useEmotionSceneStore } from "@/features/editor/store/emotionSceneStore";  // 이미지 생성 임시 중단
import {
  TEMPLATE_REGISTRY,
} from "@/features/editor/templates/templateRegistry";
import StorybookWizardModal from "@/features/storybook/components/StorybookWizardModal";

import EmotionInferenceChoiceModal from "./EmotionInferenceChoiceModal";
import MultiPageTemplateDialog from "../MultiPageTemplateDialog";

// TODO: AI 이미지 생성 복원 시 true로 변경하여 점검 모드 활성화
const IS_AI_DISABLED = false;

const AiTemplateContent = () => {
  const [isStorybookModalOpen, setIsStorybookModalOpen] = useState(false);
  const [isEmotionChoiceModalOpen, setIsEmotionChoiceModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

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

  return (
    <>
      <div className="flex flex-col w-full gap-6">
        {/* AI 점검 안내 */}
        {IS_AI_DISABLED && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-13-regular text-amber-700">
              현재 AI 기능을 점검 중이에요. 곧 다시 사용할 수 있어요.
            </span>
          </div>
        )}

        {/* 스토리북 */}
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
            onClick={() => { setIsStorybookModalOpen(true); }}
            disabled={IS_AI_DISABLED}
          />
        </div>

        {/* 감정추론 */}
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
            onClick={() => { setIsEmotionChoiceModalOpen(true); }}
            disabled={IS_AI_DISABLED}
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
          setIsAiGenerating(true);
          try {
            // Phase 1에서는 감정 카드 이미지만 필요 — 기본 스타일로 조회
            const emotionImageMap = await fetchEmotionImageMap("photo-boy");
            const availableLabels = [...emotionImageMap.keys()];
            const stories = await generateEmotionStory(topic, availableLabels);
            // Phase 1: 텍스트만 생성 — 히어로 이미지 없이 페이지 삽입
            const pages = buildEmotionStoryPages(stories, emotionImageMap);
            useTemplateStore.getState().requestInsertPages(pages);
            // ── 이미지 생성 임시 중단: 배너 표시용 데이터 저장 스킵 ──
            // const storyPageIds = pages.slice(-stories.length).map((p) => p.id);
            // useEmotionSceneStore.getState().addPendingGeneration({
            //   stories,
            //   storyPageIds,
            //   bannerPhase: "ready",
            // });
            setIsEmotionChoiceModalOpen(false);
            useToastStore
              .getState()
              .showToast("감정추론 활동이 생성되었어요!");
          } catch (error) {
            console.error("[AI 감정추론] 스토리 생성 실패:", error);
            useToastStore
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
