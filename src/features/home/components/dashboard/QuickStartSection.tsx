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
    <section className="flex flex-col w-full gap-5 rounded-2xl border border-black-20 bg-white-100 p-3 md:p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BookOpen className="icon-s text-primary" />
        <span className="text-title-22-semibold text-black-90">빠른 시작</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* 빈 문서 카드 */}
        <button
          onClick={handleBlankDoc}
          disabled={isCreatingDoc}
          className="flex flex-col items-center justify-center gap-2 h-24 md:h-28 rounded-xl border-2 border-dashed border-black-30 cursor-pointer transition-colors hover:border-primary hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="flex flex-col items-center justify-center gap-2 h-24 md:h-28 rounded-xl border border-black-25 cursor-pointer transition-colors hover:border-primary hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
