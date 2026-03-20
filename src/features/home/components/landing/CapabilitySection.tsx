/**
 * 서비스 기능 소개 + 하단 CTA 통합 섹션.
 */
import { Brain, LayoutTemplate, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { mp } from "@/shared/utils/mixpanel";

interface Capability {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  description: string;
  badge?: { label: string; variant: "ai" | "coming" };
}

const CAPABILITIES: Capability[] = [
  {
    icon: Brain,
    iconBg: "bg-primary-100 text-primary",
    title: "AI 감정추론 활동",
    description:
      "주제를 입력하면 13페이지 감정추론 스토리를 자동 생성해요",
    badge: { label: "AI 지원", variant: "ai" },
  },
  {
    icon: LayoutTemplate,
    iconBg: "bg-success-50 text-[#15803d]",
    title: "25종 전문 템플릿",
    description:
      "감정추론, 어휘카드, 일과표 등 전문 템플릿을 제공해요",
  },
  {
    icon: BookOpen,
    iconBg: "bg-[#f3e8ff] text-primary-800",
    title: "AI 스토리북",
    description: "아동 맞춤형 그림책을 AI가 자동으로 만들어요",
    badge: { label: "준비 중", variant: "coming" },
  },
];

const BADGE_CLASS: Record<"ai" | "coming", string> = {
  ai: "bg-primary-100 text-primary",
  coming: "bg-black-20 text-black-50",
};

const CapabilitySection = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useModalStore((s) => s.openAuthModal);

  const handleCtaClick = () => {
    mp.track("랜딩 하단 CTA 클릭");
    if (!isAuthenticated) {
      openAuthModal();
    }
  };

  return (
    <section className="flex flex-col items-center w-full px-4 py-14 bg-primary-50 md:px-10 md:py-20">
      {/* 기능 소개 */}
      <div className="flex flex-col items-center gap-2 mb-8 text-center md:gap-3 md:mb-10">
        <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
          이런 것들을 만들 수 있어요
        </h2>
        <p className="text-14-regular text-black-70 md:text-title-16-semibold">
          수업 준비에 필요한 모든 것을 한곳에서
        </p>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {CAPABILITIES.map((cap) => (
          <CapabilityCard key={cap.title} {...cap} />
        ))}
      </div>

      {/* 하단 CTA */}
      <div className="flex flex-col items-center w-full max-w-3xl gap-4 mt-14 px-6 py-10 rounded-[32px] border border-primary-200 bg-linear-to-br from-[#FDFCFF] via-[#f0ecfe] to-[#FDFCFF] text-center md:gap-5 md:mt-16 md:px-12 md:py-14">
        <h3 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
          지금 바로 무료로 시작하세요
        </h3>
        <p className="text-14-regular text-black-70 md:text-title-16-semibold">
          가입 후 모든 템플릿과 AI 기능을 바로 사용할 수 있어요
        </p>
        {!isAuthenticated && (
          <button
            type="button"
            onClick={handleCtaClick}
            className="rounded-xl bg-primary px-6 py-3 text-title-16-semibold text-white-100 transition hover:bg-primary-700 cursor-pointer"
          >
            무료로 가입하기
          </button>
        )}
      </div>
    </section>
  );
};

const CapabilityCard = ({
  icon: Icon,
  iconBg,
  title,
  description,
  badge,
}: Capability) => (
  <div className="flex flex-col items-center gap-4 rounded-3xl border border-primary-100 bg-white p-6 shadow-[0_4px_12px_rgba(124,58,237,0.03)] text-center md:p-8">
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
    >
      <Icon className="h-7 w-7" />
    </div>
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-center gap-2">
        <span className="text-title-16-semibold text-black-90 md:text-title-18-semibold">
          {title}
        </span>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-12-semibold ${BADGE_CLASS[badge.variant]}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <span className="text-14-regular text-black-70">{description}</span>
    </div>
  </div>
);

export default CapabilitySection;
