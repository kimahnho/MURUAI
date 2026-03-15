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
  {
    title: "드디어 기다리던 크리스마스가 다가오고 있어요.",
    sentence: "친구는 기다리던 크리스마스가 다가와서",
    emotions: ["기뻐요", "기대돼요", "화나요"],
  },
  {
    title: "엄마와 함께 크리스마스트리를 꾸며요.",
    sentence: "친구는 엄마와 함께 크리스마스트리를 꾸며서",
    emotions: ["재미있어요", "슬퍼요", "화나요"],
  },
  {
    title: "크리스마스트리에 별 장식을 달고 싶은데 별 장식이 사라졌어요.",
    sentence: "친구는 달고 싶었던 별 장식이 사라져서",
    emotions: ["기뻐요", "고마워요", "슬퍼요"],
  },
  {
    title: "아빠가 새로운 별 장식을 사 오셨어요.",
    sentence: "친구는 아빠가 새로운 별 장식을 사주셔서",
    emotions: ["기뻐요", "화나요", "무서워요"],
  },
  {
    title: "오늘 밤에 산타 할아버지가 찾아오시기를 기다려요.",
    sentence: "친구는 기다리던 산타할아버지를 만날 생각에",
    emotions: ["힘들어요", "기대돼요", "무서워요"],
  },
  {
    title: "아무리 기다려도 산타 할아버지가 오시지 않아요.",
    sentence: "친구는 기다리던 산타할아버지가 오시지 않아",
    emotions: ["기뻐요", "슬퍼요", "고마워요"],
  },
  {
    title: "깜빡 잠이 들었는데 아침이 되었어요. 산타 할아버지를 만나고 싶었는데 못 만났어요.",
    sentence: "친구는 산타할아버지를 만나지 못해",
    emotions: ["고마워요", "기뻐요", "슬퍼요"],
  },
  {
    title: "거실에 가 보니 트리 아래에 선물 상자가 있어요. 산타 할아버지가 두고 가신 것 같아요.",
    sentence: "친구는 산타 할아버지가 두고 가신 선물을 보고",
    emotions: ["기뻐요", "슬퍼요", "화나요"],
  },
  {
    title: "선물 상자를 열어보니 내가 갖고 싶었던 블록이 들어 있었어요.",
    sentence: "친구는 좋아하는 블록을 선물로 받아서",
    emotions: ["슬퍼요", "화나요", "기뻐요"],
  },
  {
    title: "선물 받은 블록으로 아빠랑 블록을 만들었어요.",
    sentence: "친구는 아빠랑 블록놀이를 해서",
    emotions: ["슬퍼요", "화나요", "재미있어요"],
  },
  {
    title: "블록 놀이를 하고 있는데 엄마가 내가 좋아하는 초코케이크를 사 오셨어요.",
    sentence: "엄마가 내가 좋아하는 케이크를 사 오셔서",
    emotions: ["슬퍼요", "화나요", "기뻐요"],
  },
  {
    title: "엄마가 케이크에 초를 꽂고 불을 붙여요. 촛불에 머리카락이 닿아 머리카락이 탈뻔했어요.",
    sentence: "친구는 엄마 머리카락이 탈까 봐",
    emotions: ["놀라요", "고마워요", "기뻐요"],
  },
];

const buildFewShotBlock = (examples: FewShotExample[]): string =>
  examples
    .map(
      (ex, i) =>
        `예시 ${i + 1}: { "title": "${ex.title}", "sentence": "${ex.sentence}", "emotions": ${JSON.stringify(ex.emotions)} }`,
    )
    .join("\n");

const sanitizeTopic = (topic: string): string =>
  topic
    .slice(0, 100)
    .replace(/[\n\r"\\]/g, " ")
    .trim();

const buildPrompt = (topic: string, availableLabels: string[]) => {
  const safeTopic = sanitizeTopic(topic);
  return `당신은 언어치료 전문가입니다.

[사용 가능한 감정 라벨 — 반드시 이 목록에서만 선택]
${availableLabels.join(", ")}

[참고 예시 — 아래 스타일과 문장 길이를 최대한 따라 작성할 것]
${buildFewShotBlock(MOCK_FEW_SHOT_EXAMPLES)}

위 예시처럼, 주제 "${safeTopic}"에 맞는 감정 추론 활동용 짧은 이야기 10개를 새로 만들어주세요.
각 이야기는 다음 형식을 따릅니다:
- title: 이야기 상황을 서술하는 문장 (위 예시처럼 구체적인 상황 묘사)
  - 절대 감정을 직접적으로 적지 마세요 (예: "슬퍼요", "기뻐요", "화가 나요" 등 감정 단어 사용 금지)
  - 감정을 유추할 수 있는 상황만 묘사하세요 (예: "기다리던 선물을 받지 못했어요" ← 상황만 묘사, 감정은 아이가 추론)
- sentence: "친구는 [이유/감정 상황]" 형식의 문장 (30자 이내, 반드시 "친구는 "으로 시작)
  - title과 마찬가지로 감정 단어를 직접 사용하지 말고, 상황/이유만 서술하세요
- emotions: 감정 선택지 3개 배열
  - 첫 번째(emotions[0]): 상황에 가장 적절한 정답 감정
  - 두 번째, 세 번째(emotions[1], emotions[2]): 상황과 맞지 않는 오답 감정
  - 반드시 위 감정 라벨 목록에서만 선택, 목록에 없는 감정은 절대 사용하지 마세요

JSON만 출력하세요 (설명, 마크다운 없음):
[
  { "title": "...", "sentence": "친구는 ...", "emotions": ["정답감정", "오답감정1", "오답감정2"] },
  ...
]`;
};

// AI는 emotions[0]을 정답으로 반환하므로, 카드 표시 시 위치를 랜덤으로 섞는다.
const shuffleEmotions = (
  emotions: [string, string, string],
): [string, string, string] => {
  const arr = [...emotions] as [string, string, string];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const parseStoryResponse = (raw: string): StoryItem[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const valid = parsed.filter((item): item is StoryItem => {
    if (typeof item !== "object" || item === null) return false;
    const rec = item as Record<string, unknown>;
    if (typeof rec.title !== "string" || typeof rec.sentence !== "string")
      return false;
    if (!Array.isArray(rec.emotions) || rec.emotions.length < 3) return false;
    return rec.emotions.slice(0, 3).every((e) => typeof e === "string");
  });
  if (valid.length === 0) throw new Error("유효한 스토리 데이터가 없습니다.");
  return valid.slice(0, 10).map((item) => ({
    ...item,
    emotions: shuffleEmotions([
      item.emotions[0],
      item.emotions[1],
      item.emotions[2],
    ]),
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
