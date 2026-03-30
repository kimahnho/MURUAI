/**
 * 이미지 프롬프트 아코디언 — 각 학습지의 실제 이미지 생성 프롬프트를 접이식 카드로 표시.
 */
import { useState } from "react";
import { ChevronDown, Copy, Check } from "lucide-react";
import type { ImagePromptEntry } from "../model/therapyTypes";
import { cn } from "../lib/utils";

interface ImagePromptMessageProps {
  prompts: ImagePromptEntry[];
}

const ImagePromptMessage = ({ prompts }: ImagePromptMessageProps) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {prompts.map((entry) => (
        <PromptCard key={entry.index} entry={entry} />
      ))}
    </div>
  );
};

const PromptCard = ({ entry }: { entry: ImagePromptEntry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(entry.prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      // clipboard API 미지원 환경 fallback
    }
  };

  return (
    <div className="rounded-xl border border-black-20 bg-white overflow-hidden">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-3 w-full px-3 py-2.5 cursor-pointer"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-12-semibold text-primary">
          {entry.index + 1}
        </span>
        <span className="text-13-bold text-black-80 truncate flex-1 text-left">
          {entry.title}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-black-30 transition", isOpen && "rotate-180")} />
      </button>

      {/* 본문 (접이식) */}
      {isOpen && (
        <div className="border-t border-black-10 px-3 py-2.5">
          <div className="flex justify-end mb-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-12-regular text-black-50 hover:bg-black-5 transition cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 text-success-700" />
                  <span className="text-success-700">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  복사
                </>
              )}
            </button>
          </div>
          <pre className="text-12-regular text-black-60 leading-relaxed whitespace-pre-wrap wrap-break-word overflow-x-auto max-h-60 overflow-y-auto rounded-lg bg-black-5 px-3 py-2">
            {entry.prompt}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ImagePromptMessage;
