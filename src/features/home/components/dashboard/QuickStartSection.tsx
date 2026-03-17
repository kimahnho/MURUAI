/**
 * 대시보드 빠른 시작 섹션 — 빈 문서 + 인기 템플릿 바로가기.
 */
import { Plus, FileText, BookOpen, Search, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { mp } from "@/shared/utils/mixpanel";

const TEMPLATE_SHORTCUTS: {
  templateId: string;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  {
    templateId: "emotionInference",
    label: "감정추론 활동",
    icon: BookOpen,
    color: "#F59E0B",
  },
  {
    templateId: "vocabularyLearningCard",
    label: "어휘 학습 카드",
    icon: FileText,
    color: "#8b5cf6",
  },
  {
    templateId: "findItem",
    label: "사물 찾기",
    icon: Search,
    color: "#10B981",
  },
  {
    templateId: "visualSchedule",
    label: "시각적 스케줄표",
    icon: CalendarDays,
    color: "#3B82F6",
  },
];

const QuickStartSection = () => {
  const { isCreatingDoc, createAndOpenDocument } =
    useCreateDocumentNavigation();

  const handleBlankDoc = async () => {
    mp.track("대시보드 빈 문서 생성");
    await createAndOpenDocument({ replace: true });
  };

  const handleTemplateClick = async (templateId: string) => {
    mp.track("대시보드 템플릿 바로가기 클릭", { template_id: templateId });
    await createAndOpenDocument({ replace: true });
  };

  return (
    <section className="flex flex-col w-full pt-8 md:pt-16 gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-22-semibold md:text-headline-28-bold text-black-90">
          안녕하세요! 오늘은 어떤 자료를 만들어볼까요?
        </h1>
        <p className="text-16-regular text-black-60">
          빈 문서로 시작하거나 템플릿을 선택해보세요.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* 빈 문서 카드 */}
        <button
          onClick={handleBlankDoc}
          disabled={isCreatingDoc}
          className="flex flex-col items-center justify-center gap-3 h-28 md:h-36 rounded-2xl border-2 border-dashed border-black-30 cursor-pointer transition-colors hover:border-primary hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Plus className="w-8 h-8 text-black-50" />
          <span className="text-title-16-semibold text-black-60">
            {isCreatingDoc ? "생성 중..." : "빈 문서"}
          </span>
        </button>

        {/* 템플릿 바로가기 카드 */}
        {TEMPLATE_SHORTCUTS.map((tmpl) => (
          <button
            key={tmpl.templateId}
            onClick={() => handleTemplateClick(tmpl.templateId)}
            disabled={isCreatingDoc}
            className="flex flex-col items-center justify-center gap-3 h-28 md:h-36 rounded-2xl border border-black-25 cursor-pointer transition-colors hover:border-primary hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div
              className="flex w-11 h-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${tmpl.color}15` }}
            >
              <tmpl.icon
                className="w-5 h-5"
                style={{ color: tmpl.color }}
              />
            </div>
            <span className="text-14-semibold text-black-80 truncate max-w-[90%]">
              {tmpl.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickStartSection;
