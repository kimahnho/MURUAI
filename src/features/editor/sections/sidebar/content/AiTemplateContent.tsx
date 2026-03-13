/**
 * AI 템플릿 패널 — 스토리북/감정추론을 카드 형태로 나열하고, 클릭 시 모달을 연다.
 */
import { useState } from "react";
import { BookOpen, Brain, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Template } from "@/features/editor/model/canvasTypes";
import { generateEmotionStory } from "@/features/editor/ai/generateEmotionStory";
import { buildEmotionStoryPages } from "@/features/editor/utils/buildEmotionStoryPages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";
import { useTemplateStore } from "@/features/editor/store/templateStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import {
  TEMPLATE_REGISTRY,
} from "@/features/editor/templates/templateRegistry";
import StorybookWizardModal from "@/features/storybook/components/StorybookWizardModal";

import EmotionInferenceChoiceModal from "./EmotionInferenceChoiceModal";
import type { EmotionImageStyle } from "./EmotionInferenceChoiceModal";
import MultiPageTemplateDialog from "../MultiPageTemplateDialog";

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
        {/* 스토리북 */}
        <div className="flex flex-col w-full gap-3">
          <SectionHeader icon={Sparkles} title="AI 스토리북" />
          <TemplateCard
            icon={BookOpen}
            iconBgColor="#8B5CF6"
            borderColor="rgba(139, 92, 246, 0.2)"
            bgColor="rgba(139, 92, 246, 0.05)"
            hoverBgColor="rgba(139, 92, 246, 0.08)"
            title="AI 스토리북"
            description="아동 맞춤형 10페이지 그림책 자동 생성"
            onClick={() => { setIsStorybookModalOpen(true); }}
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
        onSelectAi={async (topic: string, imageStyle: EmotionImageStyle) => {
          setIsAiGenerating(true);
          try {
            const emotionImageMap = await fetchEmotionImageMap(imageStyle);
            const availableLabels = [...emotionImageMap.keys()];
            const stories = await generateEmotionStory(topic, availableLabels);
            const pages = buildEmotionStoryPages(stories, emotionImageMap);
            useTemplateStore.getState().requestInsertPages(pages);
            setIsEmotionChoiceModalOpen(false);
          } catch {
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
      className="flex w-12 h-12 items-center justify-center rounded-lg shadow-sm"
      style={{ backgroundColor: disabled ? "#D1D5DB" : iconBgColor }}
    >
      <Icon className="icon-m text-white" />
    </div>

    <div className="flex flex-col justify-center gap-1">
      <span className="text-title-18-semibold text-black-100">{title}</span>
      <span className="text-12-regular text-black-60">{description}</span>
    </div>
  </div>
);

export default AiTemplateContent;
