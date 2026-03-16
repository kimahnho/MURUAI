/**
 * 어휘 학습 카드 페이지에서 따라쓰기 생성 플로팅 버튼.
 * 모든 카드의 목표 어휘가 입력되었을 때만 클릭 가능하다.
 */
import { PenLine } from "lucide-react";

import type { Page } from "@/features/editor/model/pageTypes";
import { useVocabTracingStore } from "@/features/editor/store/vocabTracingStore";
import { getVocabUnfilledReason } from "@/features/editor/utils/tracingGridUtils";

interface VocabTracingBannerProps {
  pages: Page[];
  selectedPageId: string;
}

const VocabTracingBanner = ({
  pages,
  selectedPageId,
}: VocabTracingBannerProps) => {
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  if (!selectedPage || selectedPage.templateId !== "vocabularyLearningCard") {
    return null;
  }

  const reason = getVocabUnfilledReason(selectedPage.elements);
  const isFilled = reason === "filled";
  const guideText =
    reason === "missing-image"
      ? "모든 카드에 이미지를 삽입해주세요"
      : "모든 카드에 목표 어휘를 입력해주세요";

  const handleClick = () => {
    useVocabTracingStore.getState().requestVocabTracing(selectedPageId);
  };

  return (
    <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 shadow-lg">
        <PenLine className="h-4 w-4 text-indigo-600" />
        {isFilled ? (
          <button
            type="button"
            onClick={handleClick}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-13-semibold text-white-100 transition hover:bg-indigo-600"
          >
            어휘 카드에서 따라쓰기 생성
          </button>
        ) : (
          <span className="text-13-semibold text-indigo-400">
            {guideText}
          </span>
        )}
      </div>
    </div>
  );
};

export default VocabTracingBanner;
