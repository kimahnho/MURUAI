/**
 * 대시보드 AI 기능 카드 섹션 — 스토리북/감정추론 진입점.
 */
import { Sparkles, BookOpen, Brain, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { mp } from "@/shared/utils/mixpanel";

const AI_FEATURES: {
  key: string;
  icon: LucideIcon;
  accentColor: string;
  title: string;
  description: string;
}[] = [
  {
    key: "storybook",
    icon: BookOpen,
    accentColor: "#8b5cf6",
    title: "AI 스토리북",
    description: "아동 맞춤형 10페이지 그림책을 AI가 자동으로 만들어요",
  },
  {
    key: "emotion",
    icon: Brain,
    accentColor: "#F59E0B",
    title: "AI 감정추론 활동",
    description: "주제를 입력하면 AI가 감정추론 스토리 13페이지를 생성해요",
  },
];

const AiFeatureSection = () => {
  const { isCreatingDoc, createAndOpenDocument } =
    useCreateDocumentNavigation();

  const handleClick = async (feature: string) => {
    mp.track("대시보드 AI 카드 클릭", { feature });
    await createAndOpenDocument({ replace: true });
  };

  return (
    <section className="flex flex-col w-full gap-6">
      <div className="flex items-center gap-2">
        <Sparkles className="icon-s text-primary" />
        <span className="text-title-22-semibold text-black-90">
          AI로 만들기
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {AI_FEATURES.map((feature) => (
          <AiFeatureCard
            key={feature.key}
            icon={feature.icon}
            accentColor={feature.accentColor}
            title={feature.title}
            description={feature.description}
            disabled={isCreatingDoc}
            onClick={() => handleClick(feature.key)}
          />
        ))}
      </div>
    </section>
  );
};

const AiFeatureCard = ({
  icon: Icon,
  accentColor,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  accentColor: string;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <div
    className={`flex items-center gap-5 rounded-2xl border px-4 py-4 md:px-6 md:py-5 transition-colors ${
      disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
    }`}
    style={{
      borderColor: `${accentColor}33`,
      backgroundColor: `${accentColor}08`,
    }}
    onMouseEnter={(e) => {
      if (!disabled)
        e.currentTarget.style.backgroundColor = `${accentColor}12`;
    }}
    onMouseLeave={(e) => {
      if (!disabled)
        e.currentTarget.style.backgroundColor = `${accentColor}08`;
    }}
    onClick={disabled ? undefined : onClick}
  >
    <div
      className="flex w-12 h-12 md:w-14 md:h-14 items-center justify-center rounded-xl shadow-sm shrink-0"
      style={{ backgroundColor: accentColor }}
    >
      <Icon className="icon-m text-white" />
    </div>
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-title-20-semibold text-black-100 truncate">
        {title}
      </span>
      <span className="text-14-regular text-black-60 truncate">
        {description}
      </span>
    </div>
    <ChevronRight className="icon-s text-black-40 shrink-0 ml-auto" />
  </div>
);

export default AiFeatureSection;
