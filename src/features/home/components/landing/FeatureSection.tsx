/**
 * 랜딩 기능 소개 섹션 — 핵심 기능 3개를 카드로 소개.
 */
import { forwardRef } from "react";
import { LayoutTemplate, BookOpen, Brain } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURE_CARDS: {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
}[] = [
  {
    icon: LayoutTemplate,
    color: "#7C3AED",
    title: "25종 전문 템플릿",
    description:
      "감정일기, 어휘카드, AAC 보드, 선긋기 등 치료·교육 현장에 맞춘 템플릿을 바로 사용할 수 있어요.",
  },
  {
    icon: BookOpen,
    color: "#8b5cf6",
    title: "AI 맞춤 스토리북",
    description:
      "아동 정보를 입력하면 10페이지 그림책을 AI가 자동으로 만들어요. 수업 준비 시간이 줄어들어요.",
  },
  {
    icon: Brain,
    color: "#F59E0B",
    title: "AI 감정추론 활동",
    description:
      "주제 하나만 입력하면 10페이지 감정추론 활동지를 즉시 생성해요. 바로 수업에 활용할 수 있어요.",
  },
];

const FeatureSection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section ref={ref} className="flex flex-col items-center w-full px-6 py-14 md:px-10 md:py-20">
      <div className="flex flex-col items-center max-w-5xl gap-8 md:gap-12">
        <div className="text-center">
          <h2 className="text-headline-24-bold text-black-90 md:text-headline-28-bold">
            주요 기능
          </h2>
          <p className="text-14-regular text-black-60 mt-1 md:text-16-regular md:mt-2">
            수업 준비에 필요한 모든 것
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 w-full md:grid-cols-3 md:gap-6">
          {FEATURE_CARDS.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
});

FeatureSection.displayName = "FeatureSection";

const FeatureCard = ({
  icon: Icon,
  color,
  title,
  description,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
}) => (
  <div className="flex flex-row items-start gap-4 rounded-2xl border border-black-25 bg-white-100 p-5 shadow-sm md:flex-col md:items-center md:p-8 md:text-center">
    <div
      className="flex w-12 h-12 items-center justify-center rounded-xl shrink-0 md:w-14 md:h-14"
      style={{ backgroundColor: color }}
    >
      <Icon className="w-6 h-6 text-white md:w-7 md:h-7" />
    </div>
    <div className="flex flex-col gap-1 min-w-0 md:gap-2">
      <h3 className="text-title-18-semibold text-black-90 md:text-title-20-semibold">
        {title}
      </h3>
      <p className="text-14-regular text-black-60">{description}</p>
    </div>
  </div>
);

export default FeatureSection;
