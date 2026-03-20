/**
 * 프롬프트 입력 히어로 섹션 — 감정추론 활동 주제 입력 + 생성 버튼 + 미리보기.
 */
import { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

import Spinner from "@/shared/ui/Spinner";
import { images } from "@/shared/assets";

const EXAMPLE_PROMPTS = [
  "친구와 다투었을 때",
  "선물을 받았을 때",
  "혼자 남겨졌을 때",
  "칭찬을 받았을 때",
];

interface PromptHeroSectionProps {
  onGenerate: (topic: string) => void;
  isGenerating: boolean;
  isQuotaExhausted?: boolean;
}

const PromptHeroSection = ({
  onGenerate,
  isGenerating,
  isQuotaExhausted = false,
}: PromptHeroSectionProps) => {
  const [prompt, setPrompt] = useState("");
  const [previewPage, setPreviewPage] = useState(1);

  const handlePrevPage = () => setPreviewPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPreviewPage((p) => Math.min(3, p + 1));

  const isDisabled = isGenerating || isQuotaExhausted;

  const handleGenerate = () => {
    if (!prompt.trim() || isDisabled) return;
    onGenerate(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <section className="flex flex-col items-center w-full px-4 pt-12 pb-10 bg-linear-to-b from-[#FFFDF9] to-[#F9F7F2] md:px-10 md:pt-24 md:pb-16">
      <div className="flex flex-col items-center max-w-3xl w-full gap-6 text-center md:gap-8">
        {/* 안내 뱃지 */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EFE8D6] bg-white/60 backdrop-blur-sm px-4 py-1.5 text-13-bold text-[#8C6D46]">
          <Sparkles className="h-3.5 w-3.5" />
          현재 감정추론 학습자료만 지원돼요
        </span>

        {/* 헤드라인 */}
        <h1 className="text-headline-24-bold text-[#3A332C] md:text-headline-42-bold">
          AI로 학습자료를
          <br />
          손쉽게 만들어보세요
        </h1>

        {/* 서브타이틀 */}
        <p className="text-14-regular text-[#6A5D54] md:text-title-20-semibold">
          주제만 입력하면 AI가 학습 자료를 자동으로 생성해요
        </p>

        {/* 프롬프트 입력 카드 — 인라인 입력 + 버튼 */}
        <div className="flex w-full max-w-2xl items-center gap-2 rounded-[32px] border border-[#EDE5D5] bg-white py-2 pl-5 pr-2 shadow-[0_8px_30px_-6px_rgba(140,109,70,0.12)] md:py-3 md:pl-6 md:pr-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예) 친구와 놀다가 넘어졌을 때 속상한 마음을 표현하는 활동"
            disabled={isDisabled}
            className="flex-1 min-w-0 border-none bg-transparent text-16-regular text-[#3A332C] placeholder:text-[#A69B8F] focus:outline-none disabled:opacity-60 overflow-hidden text-ellipsis"
          />
          <button
            type="button"
            disabled={!prompt.trim() || isDisabled}
            onClick={handleGenerate}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#8C6D46] px-5 py-2.5 text-14-semibold text-white-100 transition hover:bg-[#7A5D3A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating && <Spinner size="sm" />}
            {isGenerating ? "생성 중..." : "생성하기"}
          </button>
        </div>

        {/* 제안 칩 */}
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              disabled={isDisabled}
              className="rounded-full border border-[#EBE2D0] bg-[#FCFAF5] px-3.5 py-1.5 text-13-bold text-[#7A6752] transition cursor-pointer hover:bg-[#F2EADB] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>

        {/* 하단 섹션들 — 균일한 gap으로 간격 관리 */}
        <div className="flex flex-col items-center gap-12 pt-10 w-full md:gap-16 md:pt-14">
          {/* 결과물 안내 + 미리보기 (캐러셀) */}
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex flex-col items-center gap-2 md:gap-3">
              <h3 className="text-title-22-semibold text-[#3A332C] md:text-headline-28-bold">
                AI가 만든 감정추론 활동지 예시
              </h3>
              <p className="text-14-regular text-[#6A5D54] md:text-title-16-semibold">
                주제 하나로 13페이지 분량의 학습자료가 자동으로 완성돼요
              </p>
            </div>
            <div className="relative w-full max-w-[500px] mx-auto aspect-[1/1.414] rounded-3xl overflow-hidden shadow-[0_12px_40px_-12px_rgba(140,109,70,0.15)] border border-[#EBE2D0] bg-white group hover:shadow-[0_20px_60px_-15px_rgba(140,109,70,0.2)] transition-shadow duration-500">
              <img
                src={`/mockImage-${previewPage}.webp`}
                alt={`예시 결과물 ${previewPage}페이지`}
                className="w-full h-full object-contain"
                draggable={false}
              />
              {previewPage > 1 && (
                <button
                  onClick={handlePrevPage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md text-[#8C6D46] hover:bg-[#F2EADB] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {previewPage < 3 && (
                <button
                  onClick={handleNextPage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow-md text-[#8C6D46] hover:bg-[#F2EADB] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-13-bold text-white/90 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {previewPage} / 3
              </div>
            </div>
          </div>

          {/* 수정 가능 안내 + 에디터 미리보기 */}
          <div className="flex flex-col items-center gap-4 w-full md:gap-5">
            <p className="text-title-18-semibold text-[#3A332C] md:text-headline-28-bold text-center">
              원하는 결과가 아니어도 괜찮아요.
              <br />
              캔버스 에디터에서 자유롭게 수정할 수 있어요.
            </p>
            <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_8px_24px_-8px_rgba(140,109,70,0.12)] border border-[#EBE2D0]">
              <img
                src={images.mainImage}
                alt="무루아이 에디터 미리보기"
                className="w-full h-auto"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromptHeroSection;
