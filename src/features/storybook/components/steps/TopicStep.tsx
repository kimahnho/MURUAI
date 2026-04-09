/**
 * 2단계: 주제 입력 — 자유 입력 또는 AI 추천 주제 선택.
 * 나이에 맞는 주제를 Gemini로 실시간 생성한다.
 */
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";
import {
  getTopicPresetsForAge,
  TOPIC_MAX_LENGTH,
} from "../../model/storybookTypes";
import { getGenAI } from "@/shared/api/genai";
import { captureSentryError } from "@/shared/utils/sentryUtils";

const generateTopicSuggestions = async (age: number): Promise<string[]> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `${age}세 아동을 위한 그림책 주제를 6개 추천해주세요.

규칙:
- ${age}세의 언어 이해력과 관심사에 맞는 주제
- 다양한 카테고리: 감정, 우정, 가족, 모험, 일상, 동물, 상상, 성장 중에서 골고루
- 각 주제는 구체적인 상황이나 이야기가 떠오르는 문장으로 (추상적 단어 하나 금지)
- 15자 이내

JSON 배열만 출력:
["주제1", "주제2", "주제3", "주제4", "주제5", "주제6"]`,
    config: { responseModalities: ["Text"] },
  });

  const text = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error("추천 응답 없음");

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("JSON 파싱 실패");

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  return parsed.filter((item): item is string => typeof item === "string").slice(0, 6);
};

const TopicStep = () => {
  const topic = useStorybookWizardStore((s) => s.formData.topic);
  const setTopic = useStorybookWizardStore((s) => s.setTopic);
  const age = useStorybookWizardStore((s) => s.formData.childInfo?.age ?? 6);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const fallbackPresets = getTopicPresetsForAge(age);
  const displayPresets = suggestions.length > 0 ? suggestions : fallbackPresets;

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const results = await generateTopicSuggestions(age);
      setSuggestions(results);
    } catch (error) {
      console.warn("주제 추천 실패 — 기본 프리셋 사용", error);
      captureSentryError(error, "스토리북 주제 추천");
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Step 2 진입 시 자동 생성
  useEffect(() => {
    void fetchSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [age]);

  return (
    <div className="flex flex-col gap-4">
      {/* 자유 입력 */}
      <div className="relative">
        <textarea
          value={topic}
          onChange={(e) => { setTopic(e.target.value.slice(0, TOPIC_MAX_LENGTH)); }}
          placeholder="예: 처음 유치원에 가는 날, 친구와 사이좋게 지내기"
          rows={3}
          className="w-full resize-none rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
        />
        <span className={`absolute bottom-2 right-3 text-12-medium ${
          topic.length >= TOPIC_MAX_LENGTH ? "text-error" : "text-black-40"
        }`}>
          {topic.length}/{TOPIC_MAX_LENGTH}
        </span>
      </div>

      {/* AI 추천 주제 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-12-medium text-black-50">
            {age}세 추천 주제
          </span>
          <button
            type="button"
            onClick={() => { void fetchSuggestions(); }}
            disabled={isLoadingSuggestions}
            className="flex items-center gap-1 text-12-medium text-primary hover:text-primary-700 transition disabled:text-black-30"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingSuggestions ? "animate-spin" : ""}`} />
            다른 주제
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLoadingSuggestions && suggestions.length === 0 ? (
            <span className="text-13-regular text-black-40 py-2">추천 주제를 만들고 있어요...</span>
          ) : (
            displayPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setTopic(preset); }}
                className={`rounded-full border px-3 py-1.5 text-13-medium transition ${
                  topic === preset
                    ? "border-primary bg-primary-100 text-primary"
                    : "border-black-25 text-black-60 hover:bg-black-10"
                }`}
              >
                {preset}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicStep;
