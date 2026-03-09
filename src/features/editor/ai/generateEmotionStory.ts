/**
 * Gemini를 사용해 감정 추론 활동용 스토리 텍스트 10개를 생성하는 모듈.
 */
import { GoogleGenAI } from "@google/genai";
import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";

export type StoryItem = {
  title: string;
  sentence: string;
  emotions: [string, string, string];
};

const GOOGLE_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
);

type FewShotExample = {
  title: string;
  sentence: string;
  emotions: [string, string, string];
};

const MOCK_FEW_SHOT_EXAMPLES: FewShotExample[] = [
  { title: "생일 파티", sentence: "친구는 깜짝 생일 파티를 받아서", emotions: ["기뻐요", "슬퍼요", "화나요"] },
  { title: "강아지와 산책", sentence: "친구는 강아지와 공원을 산책해서", emotions: ["재미있어요", "무서워요", "슬퍼요"] },
  { title: "넘어진 날", sentence: "친구는 달리다가 넘어져 무릎을 다쳐서", emotions: ["슬퍼요", "기뻐요", "고마워요"] },
  { title: "새 장난감", sentence: "친구는 갖고 싶던 장난감을 선물 받아서", emotions: ["기뻐요", "화나요", "무서워요"] },
  { title: "발표 시간", sentence: "친구는 반 친구들 앞에서 발표를 해야 해서", emotions: ["기뻐요", "떨려요", "화나요"] },
];

const buildFewShotBlock = (examples: FewShotExample[]): string =>
  examples
    .map(
      (ex, i) =>
        `예시 ${i + 1}: { "title": "${ex.title}", "sentence": "${ex.sentence}", "emotions": ${JSON.stringify(ex.emotions)} }`,
    )
    .join("\n");

const sanitizeTopic = (topic: string): string =>
  topic.slice(0, 100).replace(/[\n\r"\\]/g, " ").trim();

const buildPrompt = (topic: string, availableLabels: string[]) => {
  const safeTopic = sanitizeTopic(topic);
  return `당신은 언어치료 전문가입니다.

[사용 가능한 감정 라벨 — 반드시 이 목록에서만 선택]
${availableLabels.join(", ")}

[참고 예시 — 아래 스타일을 따라 작성할 것]
${buildFewShotBlock(MOCK_FEW_SHOT_EXAMPLES)}

위 예시처럼, 주제 "${safeTopic}"에 맞는 감정 추론 활동용 짧은 이야기 10개를 새로 만들어주세요.
각 이야기는 다음 형식을 따릅니다:
- title: 이야기 제목 (10자 이내)
- sentence: "친구는 [이유/감정 상황]" 형식의 문장 (30자 이내, 반드시 "친구는 "으로 시작)
- emotions: 감정 선택지 3개 배열 (반드시 위 감정 라벨 목록에서만 선택, 목록에 없는 감정은 절대 사용하지 마세요)

JSON만 출력하세요 (설명, 마크다운 없음):
[
  { "title": "...", "sentence": "친구는 ...", "emotions": ["...", "...", "..."] },
  ...
]`;
};

const parseStoryResponse = (raw: string): StoryItem[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const valid = parsed.filter((item): item is StoryItem => {
    if (typeof item !== "object" || item === null) return false;
    const rec = item as Record<string, unknown>;
    if (typeof rec.title !== "string" || typeof rec.sentence !== "string") return false;
    if (!Array.isArray(rec.emotions) || rec.emotions.length < 3) return false;
    return rec.emotions.slice(0, 3).every((e) => typeof e === "string");
  });
  if (valid.length === 0) throw new Error("유효한 스토리 데이터가 없습니다.");
  return valid.slice(0, 10).map((item) => ({
    ...item,
    emotions: [item.emotions[0], item.emotions[1], item.emotions[2]] as [string, string, string],
  }));
};

export const generateEmotionStory = async (
  topic: string,
  availableLabels: string[],
): Promise<StoryItem[]> => {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(topic, availableLabels),
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
