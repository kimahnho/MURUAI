/**
 * Gemini를 사용해 감정 추론 활동용 스토리 텍스트 10개를 생성하는 모듈.
 */
import { GoogleGenAI } from "@google/genai";
import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";

export type StoryItem = {
  title: string;
  sentence: string;
};

const GOOGLE_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
);

const MOCK_FEW_SHOT_EXAMPLES: StoryItem[] = [
  { title: "생일 파티", sentence: "아이는 친구들이 깜짝 생일 파티를 열어줬어요." },
  { title: "강아지와 산책", sentence: "아이는 강아지와 함께 공원을 산책했어요." },
  { title: "넘어진 날", sentence: "아이는 달리다가 넘어져 무릎을 다쳤어요." },
  { title: "새 장난감", sentence: "아이는 갖고 싶던 장난감을 선물 받았어요." },
  { title: "발표 시간", sentence: "아이는 반 친구들 앞에서 발표를 해야 했어요." },
  { title: "비 오는 날", sentence: "아이는 소풍날 비가 와서 집에 있었어요." },
  { title: "급식 시간", sentence: "아이는 좋아하는 메뉴가 급식으로 나왔어요." },
  { title: "잃어버린 가방", sentence: "아이는 소중한 가방을 잃어버렸어요." },
  { title: "칭찬 스티커", sentence: "아이는 선생님께 칭찬 스티커를 받았어요." },
  { title: "친구와 다툼", sentence: "아이는 친한 친구와 다퉈서 사이가 멀어졌어요." },
];

const buildFewShotBlock = (examples: StoryItem[]): string =>
  examples
    .map((ex, i) => `예시 ${i + 1}: { "title": "${ex.title}", "sentence": "${ex.sentence}" }`)
    .join("\n");

const buildPrompt = (topic: string) =>
  `당신은 언어치료 전문가입니다.

[참고 예시 — 아래 스타일을 따라 작성할 것]
${buildFewShotBlock(MOCK_FEW_SHOT_EXAMPLES)}

위 예시처럼, 주제 "${topic}"에 맞는 감정 추론 활동용 짧은 이야기 10개를 새로 만들어주세요.
각 이야기는 다음 형식을 따릅니다:
- title: 이야기 제목 (10자 이내)
- sentence: "아이는 [상황 설명]" 형식의 문장 (30자 이내, 반드시 "아이는 "으로 시작)

JSON만 출력하세요 (설명, 마크다운 없음):
[
  { "title": "...", "sentence": "아이는 ..." },
  ...
]`;

const parseStoryResponse = (raw: string): StoryItem[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const valid = parsed.filter(
    (item): item is StoryItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).title === "string" &&
      typeof (item as Record<string, unknown>).sentence === "string",
  );
  if (valid.length === 0) throw new Error("유효한 스토리 데이터가 없습니다.");
  return valid.slice(0, 10);
};

export const generateEmotionStory = async (
  topic: string,
): Promise<StoryItem[]> => {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(topic),
    config: {
      responseModalities: ["Text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini 응답이 없습니다.");

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) throw new Error("텍스트 응답이 없습니다.");

  return parseStoryResponse(textPart.text);
};
