/**
 * 빠른 만들기 스트립 — AI 기능 + 템플릿을 가로 스크롤 카드로 통합.
 */
import { useEffect, useState } from "react";
import {
  Wand2,
  BookOpen,
  SmilePlus,
  GalleryVerticalEnd,
  ScanSearch,
  CalendarCheck,
  Zap,
  Send,
  CheckCircle,
  FilePlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { buildTemplatePages } from "@/features/editor/utils/pageFactory";
import type { TemplateId } from "@/features/editor/templates/templateRegistry";
import {
  fetchCreditBalance,
  requestMoreCredits,
  hasPendingCreditRequest,
} from "@/features/editor/utils/aiTemplateUsage";
import { mp } from "@/shared/utils/mixpanel";
import useToastStore from "@/shared/store/useToastStore";

interface QuickCard {
  key: string;
  icon: LucideIcon;
  label: string;
  color: string;
  isAi?: boolean;
  isDashed?: boolean;
}

const QUICK_CARDS: QuickCard[] = [
  { key: "blank", icon: FilePlus, label: "빈 문서", color: "#666", isDashed: true },
  { key: "storybook", icon: BookOpen, label: "AI 스토리북", color: "#8b5cf6", isAi: true },
  { key: "emotion", icon: SmilePlus, label: "AI 감정추론", color: "#F59E0B", isAi: true },
{ key: "vocabularyLearningCard", icon: GalleryVerticalEnd, label: "어휘 학습 카드", color: "#8b5cf6" },
  { key: "findItem", icon: ScanSearch, label: "사물 찾기", color: "#10B981" },
  { key: "visualSchedule", icon: CalendarCheck, label: "시각적 스케줄표", color: "#3B82F6" },
];

const QuickCreateStrip = () => {
  const { isCreatingDoc, createAndOpenDocument } = useCreateDocumentNavigation();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    void fetchCreditBalance().then(setCreditBalance);
    void hasPendingCreditRequest().then(setHasRequested);
  }, []);

  const isQuotaExhausted = creditBalance !== null && creditBalance <= 0;

  const handleCardClick = async (card: QuickCard) => {
    if (isCreatingDoc) return;

    if (card.key === "blank") {
      mp.track("대시보드 빈 문서 생성");
      await createAndOpenDocument({ replace: false });
      return;
    }

    if (card.isAi) {
      mp.track("대시보드 AI 카드 클릭", { feature: card.key });
      sessionStorage.setItem(
        "pendingEditorIntent",
        JSON.stringify({ type: "ai", feature: card.key }),
      );
      await createAndOpenDocument({ replace: false });
      return;
    }

    mp.track("대시보드 템플릿 바로가기 클릭", { template_id: card.key });
    const pages = buildTemplatePages(card.key as TemplateId);
    await createAndOpenDocument({ replace: false, pages });
  };

  const handleRequestCredits = async () => {
    if (hasRequested || isRequesting) return;
    setIsRequesting(true);
    const success = await requestMoreCredits();
    setIsRequesting(false);
    if (success) {
      setHasRequested(true);
      useToastStore.getState().showToast("크레딧 요청이 전송되었어요!", "success");
    } else {
      useToastStore.getState().showToast("요청 전송에 실패했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <section className="flex w-full flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-title-18-semibold text-black-90">빠른 만들기</h2>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-black-40" />
          <span className="text-13-bold text-black-55">
            {creditBalance !== null ? creditBalance : "--"}
            <span className="text-12-regular text-black-40"> 크레딧</span>
          </span>
        </div>
      </div>

      {/* 크레딧 소진 배너 */}
      {isQuotaExhausted && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-error-100 bg-error-50 px-4 py-2.5">
          <span className="text-13-regular text-error-700">
            크레딧을 모두 사용했어요.
          </span>
          <button
            type="button"
            onClick={handleRequestCredits}
            disabled={hasRequested || isRequesting}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-13-semibold transition cursor-pointer ${
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
                {isRequesting ? "요청 중..." : "크레딧 요청"}
              </>
            )}
          </button>
        </div>
      )}

      {/* 카드 스트립 — 가로 스크롤 */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {QUICK_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCardClick(card)}
            disabled={isCreatingDoc}
            className={`flex shrink-0 flex-col items-center gap-2.5 rounded-xl px-5 py-4 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              card.isDashed
                ? "border-2 border-dashed border-black-25 hover:border-primary hover:bg-primary-50"
                : "border border-black-15 bg-white hover:border-primary-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            }`}
            style={{ minWidth: "120px" }}
          >
            <div className="relative mt-1">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: card.isDashed ? undefined : `${card.color}12` }}
              >
                <card.icon
                  className="h-6 w-6"
                  style={{ color: card.isDashed ? "#aaa" : card.color }}
                />
              </div>
              {card.isAi && (
                <div className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Wand2 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <span className="whitespace-nowrap text-13-bold text-black-80">
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickCreateStrip;
