/**
 * 6단계: 완료 — 요약 카드 + 10페이지 텍스트 미리보기 + 재시작 버튼.
 */
import { BookOpen, Check, RotateCcw } from "lucide-react";

import { ART_STYLE_PRESETS } from "../../data/artStylePresets";
import { LAYOUT_OPTIONS } from "../../model/storybookTypes";
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";

interface CompleteStepProps {
  onClose: () => void;
}

const CompleteStep = ({ onClose }: CompleteStepProps) => {
  const book = useStorybookWizardStore((s) => s.generatedBook);
  const reset = useStorybookWizardStore((s) => s.reset);

  if (!book) return null;

  const styleName =
    ART_STYLE_PRESETS.find((s) => s.id === book.artStyle)?.label ?? book.artStyle;
  const layoutName =
    LAYOUT_OPTIONS.find((l) => l.id === book.layout)?.label ?? book.layout;

  return (
    <div className="flex flex-col gap-4">
      {/* 완료 헤더 */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <span className="text-16-semibold text-black-90">
          스토리북이 완성되었어요!
        </span>
      </div>

      {/* 요약 카드 */}
      <div className="flex flex-col gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3">
        <SummaryRow label="제목" value={book.title} />
        <SummaryRow label="대상" value={`${book.childInfo.name} (${book.childInfo.age}세)`} />
        <SummaryRow label="그림체" value={styleName} />
        <SummaryRow label="레이아웃" value={layoutName} />
        <SummaryRow label="폰트" value={book.fontFamily} />
      </div>

      {/* 페이지 목록 */}
      <div className="flex flex-col gap-1">
        <span className="text-13-semibold text-black-70">페이지 미리보기</span>
        <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto rounded-lg border border-black-15 bg-black-5 p-2 scrollbar-hide">
          {book.pages.map((page) => (
            <div
              key={page.id}
              className="flex gap-2 rounded border border-black-15 bg-white px-2 py-1.5"
            >
              <span className="shrink-0 text-12-semibold text-black-40">
                {page.pageNumber}.
              </span>
              <span className="text-13-regular text-black-70">{page.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 확인 + 재시작 */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-14-semibold text-white hover:bg-primary-700 transition"
        >
          <Check className="h-4 w-4" />
          확인
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-14-medium text-black-40 hover:text-black-60 hover:bg-black-5 transition"
        >
          <RotateCcw className="h-4 w-4" />
          새 스토리북 만들기
        </button>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-13-regular">
    <span className="text-black-50">{label}</span>
    <span className="text-black-80 font-medium">{value}</span>
  </div>
);

export default CompleteStep;
