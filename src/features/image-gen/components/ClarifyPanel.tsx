/**
 * 멀티턴 질문 패널 — 한 번에 하나씩만 표시
 */
import { useState, useEffect } from "react";
import type { ClarifyQuestion } from "../ai/clarifyQuestions";

interface ClarifyPanelProps {
  questions: ClarifyQuestion[];
  onComplete: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

export function ClarifyPanel({ questions, onComplete, onSkip }: ClarifyPanelProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");

  // questions가 바뀌면 리셋
  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setFreeText("");
  }, [questions]);

  // 범위 초과 방어
  if (currentIdx >= questions.length || !questions[currentIdx]) return null;
  const current = questions[currentIdx];

  const handleSelect = (option: string) => {
    const updated = { ...answers, [current.id]: option };
    setAnswers(updated);
    setFreeText("");

    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setCurrentIdx(nextIdx);
    } else {
      onComplete(updated);
    }
  };

  const handleFreeTextSubmit = () => {
    if (!freeText.trim()) return;
    handleSelect(freeText.trim());
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4" key={current.id}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-violet-600">
          {questions.length > 1 ? `${currentIdx + 1}/${questions.length}` : "추가 정보"}
        </span>
        <button
          onClick={onSkip}
          className="text-xs text-violet-400 hover:text-violet-600"
        >
          건너뛰고 바로 생성
        </button>
      </div>

      <p className="mb-3 text-sm font-medium text-gray-900">{current.question}</p>

      <div className="flex flex-wrap gap-2">
        {current.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-violet-400 hover:bg-violet-50"
          >
            {opt}
          </button>
        ))}
      </div>

      {current.allowFreeText && (
        <div className="mt-2 flex items-center gap-2">
          <input
            key={`input-${current.id}`}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleFreeTextSubmit();
              }
            }}
            placeholder="직접 입력..."
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none"
          />
          <button
            onClick={handleFreeTextSubmit}
            disabled={!freeText.trim()}
            className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-40"
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
}
