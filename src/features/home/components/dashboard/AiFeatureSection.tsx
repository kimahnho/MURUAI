/**
 * 대시보드 AI 기능 카드 섹션 — 스토리북/감정추론 진입점.
 */
import { useEffect, useState } from "react";
import { Sparkles, BookOpen, Brain, ChevronRight, Zap, Send, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import {
  MONTHLY_AI_CREDIT_LIMIT,
  fetchCreditBalance,
  requestMoreCredits,
  hasRequestedCreditsThisMonth,
} from "@/features/editor/utils/aiTemplateUsage";
import { mp } from "@/shared/utils/mixpanel";
import useToastStore from "@/shared/store/useToastStore";

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
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    void fetchCreditBalance().then(setCreditBalance);
    void hasRequestedCreditsThisMonth().then(setHasRequested);
  }, []);

  const monthlyUsed = creditBalance !== null ? MONTHLY_AI_CREDIT_LIMIT - creditBalance : null;
  const isQuotaExhausted = creditBalance !== null && creditBalance <= 0;

  const handleClick = async (feature: string) => {
    mp.track("대시보드 AI 카드 클릭", { feature });
    sessionStorage.setItem(
      "pendingEditorIntent",
      JSON.stringify({ type: "ai", feature }),
    );
    await createAndOpenDocument({ replace: false });
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
    <section className="flex flex-col w-full gap-5 rounded-2xl border-2 border-primary-200 bg-primary-50 p-3 md:p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="icon-s text-primary" />
          <span className="text-title-22-semibold text-black-90">
            AI로 만들기
          </span>
          <span className="rounded bg-primary px-2 py-0.5 text-[11px] font-bold leading-tight text-white-100 animate-pulse">
            NEW
          </span>
        </div>
        {monthlyUsed !== null && (
          <div className="flex items-center gap-1.5">
            <Zap className={`h-4 w-4 ${isQuotaExhausted ? "text-error-500" : "text-primary-300"}`} />
            <span className={`text-13-semibold ${isQuotaExhausted ? "text-error-500" : "text-primary"}`}>
              {monthlyUsed}/{MONTHLY_AI_CREDIT_LIMIT}
            </span>
          </div>
        )}
      </div>

      {/* 크레딧 소진 안내 + 요청 버튼 */}
      {isQuotaExhausted && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-error-50 border border-error-100 px-4 py-3">
          <span className="text-13-regular text-error-700">
            이번 달 이미지 크레딧을 모두 사용했어요.
          </span>
          <button
            type="button"
            onClick={handleRequestCredits}
            disabled={hasRequested || isRequesting}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-13-semibold transition cursor-pointer ${
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

      {/* 텍스트 생성은 무료 — 카드 항상 활성 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
