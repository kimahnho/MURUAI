/**
 * 감정 추론 활동 생성 방식을 선택하는 모달.
 * "기존 템플릿 생성하기" 또는 "AI 스토리라인 생성하기"를 선택할 수 있다.
 */
import { useState } from "react";
import { Brain, FileText, X } from "lucide-react";

interface EmotionInferenceChoiceModalProps {
  isOpen: boolean;
  isGenerating?: boolean;
  onClose: () => void;
  onSelectTemplate: () => void;
  onSelectAi: (topic: string) => void;
}

const EmotionInferenceChoiceModal = ({
  isOpen,
  isGenerating = false,
  onClose,
  onSelectTemplate,
  onSelectAi,
}: EmotionInferenceChoiceModalProps) => {
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [topic, setTopic] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setShowTopicInput(false);
    setTopic("");
    onClose();
  };

  const handleAiConfirm = () => {
    onSelectAi(topic);
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black-90/30"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white-100 p-6 shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 rounded-lg p-1 text-black-60 transition hover:bg-black-10 hover:text-black-100"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-title-18-semibold text-black-100">
            감정 추론 활동
          </h2>
          <p className="mt-1 text-13-regular text-black-50">
            생성 방식을 선택해 주세요
          </p>
        </div>

        {!showTopicInput ? (
          <div className="flex flex-col gap-3">
            {/* 기존 템플릿 생성하기 */}
            <button
              type="button"
              onClick={onSelectTemplate}
              className="flex items-center gap-4 w-full rounded-xl border border-black-15 bg-black-5 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-14-semibold text-black-90">
                  기존 템플릿 생성하기
                </p>
                <p className="mt-0.5 text-12-regular text-black-50">
                  4페이지 감정 추론 활동 템플릿 적용
                </p>
              </div>
            </button>

            {/* AI 스토리라인 생성하기 */}
            <button
              type="button"
              onClick={() => setShowTopicInput(true)}
              className="flex items-center gap-4 w-full rounded-xl border border-black-15 bg-black-5 px-4 py-4 text-left transition hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10">
                <Brain className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-14-semibold text-black-90">
                  AI 스토리라인 생성하기
                </p>
                <p className="mt-0.5 text-12-regular text-black-50">
                  주제를 입력하면 AI가 스토리를 만들어요
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="emotion-topic"
                className="block text-14-semibold text-black-80 mb-2"
              >
                스토리 주제
              </label>
              <input
                id="emotion-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topic.trim()) handleAiConfirm();
                }}
                placeholder="주제를 입력하세요 (예: 생일 파티, 병원 방문 등)"
                className="w-full rounded-xl border border-black-20 px-4 py-3 text-14-regular text-black-90 placeholder:text-black-30 outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTopicInput(false);
                  setTopic("");
                }}
                className="flex-1 rounded-xl border border-black-15 py-2.5 text-14-semibold text-black-60 transition hover:bg-black-5"
              >
                뒤로
              </button>
              <button
                type="button"
                onClick={handleAiConfirm}
                disabled={!topic.trim() || isGenerating}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-14-semibold text-white-100 transition ${
                  !topic.trim()
                    ? "bg-black-20 cursor-not-allowed"
                    : isGenerating
                      ? "bg-[#7C3AED]/70 cursor-not-allowed"
                      : "bg-[#7C3AED] hover:bg-[#6D28D9]"
                }`}
              >
                {isGenerating && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
                {isGenerating ? "생성 중..." : "생성하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmotionInferenceChoiceModal;
