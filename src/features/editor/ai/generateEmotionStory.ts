/**
 * Gemini를 사용해 감정 추론 활동용 스토리 텍스트 10개를 생성하는 모듈.
 */
// import { GoogleGenAI } from "@google/genai";
// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";
import { aiPipelineLogger } from "@/shared/utils/aiPipelineLogger";

export type StoryItem = {
  title: string;
  sentence: string;
  emotions: [string, string, string];
  sceneGroup: number;
};

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

type FewShotExample = {
  title: string;
  sentence: string;
  emotions: [string, string, string];
};

// 5장용 few-shot: 시간 순 연결된 소풍 서사
const SHORT_ARC_FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    title: "오늘은 반 친구들과 함께 소풍을 가는 날이에요.",
    sentence: "친구는 기다리던 소풍날이 와서",
    emotions: ["기대돼요", "슬퍼요", "화나요"],
  },
  {
    title: "소풍 장소에 도착해서 친구들과 술래잡기를 하다가 넘어졌어요.",
    sentence: "친구는 술래잡기를 하다 넘어져서",
    emotions: ["힘들어요", "기뻐요", "고마워요"],
  },
  {
    title: "선생님이 달려와서 무릎에 밴드를 붙여 주셨어요.",
    sentence: "친구는 선생님이 밴드를 붙여 주셔서",
    emotions: ["고마워요", "화나요", "무서워요"],
  },
  {
    title: "점심시간에 도시락을 열었더니 엄마가 좋아하는 김밥을 넣어 주셨어요.",
    sentence: "친구는 엄마가 좋아하는 김밥을 넣어 주셔서",
    emotions: ["기뻐요", "힘들어요", "놀라요"],
  },
  {
    title: "집에 돌아와서 오늘 있었던 이야기를 엄마에게 들려주었어요.",
    sentence: "친구는 오늘 하루를 엄마에게 이야기해서",
    emotions: ["재미있어요", "슬퍼요", "화나요"],
  },
];

// 10장용 few-shot: 다양한 에피소드의 크리스마스 서사
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

const DEFAULT_STORY_COUNT = 10;

const buildPrompt = (topic: string, availableLabels: string[], count = DEFAULT_STORY_COUNT) => {
  const safeTopic = sanitizeTopic(topic);
  const isShortArc = count <= 5;
  const fewShotExamples = isShortArc ? SHORT_ARC_FEW_SHOT_EXAMPLES : MOCK_FEW_SHOT_EXAMPLES;

  const narrativeArcSection = isShortArc
    ? `
[이야기 흐름 — ${count}개 이야기는 하나의 연결된 이야기처럼 전개하세요]
- 1번: 상황 설정 — 주제의 배경과 등장인물을 자연스럽게 소개
- 2번: 전개 — 상황이 진행되며 새로운 에피소드 발생
- 3번: 전환 — 예상과 다른 상황이나 작은 갈등 발생
- 4번: 해결 — 문제를 해결하거나 상황에 대응
- 5번: 마무리 — 상황이 정리되고 이야기 마무리
- ${count}개 이야기가 시간 순서대로 자연스럽게 이어져야 합니다.
- 앞 이야기의 결과가 다음 이야기의 배경이 되도록 연결하세요.
`
    : "";

  const rulesSection = isShortArc
    ? `[중요 — 서사 연결 규칙]
- ${count}개 이야기는 하나의 큰 사건을 시간 순서로 전개하는 에피소드입니다.
- 같은 인물이 등장하되, 매 이야기마다 다른 감정을 유발하는 상황을 묘사하세요.
- 주제 키워드를 매 문장에 반복하지 말고, 주제 안에서 구체적 에피소드를 보여주세요.
- 같은 문장 패턴이나 어미를 반복하지 마세요.`
    : `[중요 — 다양성 규칙]
- 주제("${safeTopic}")는 ${count}개 이야기를 관통하는 큰 맥락이지, 매 문장에 반복할 키워드가 아닙니다.
- ${count}개 이야기는 각각 서로 다른 구체적 상황, 장소, 인물, 소재를 활용하세요.
- 같은 문장 패턴이나 어미를 반복하지 마세요 (예: ${count}개 title이 모두 "~해 주셨어요"로 끝나면 안 됩니다).
- 위 예시(크리스마스)처럼 하나의 주제 안에서 트리 꾸미기, 선물 열기, 케이크 등 다양한 소재로 이야기를 전개하세요.`;

  const sceneGroupInstruction = isShortArc
    ? `- sceneGroup: ${count}개 이야기에서 장소 변경은 최대 2회로 제한하세요 (sceneGroup 1~2).
  - 이야기의 주 무대를 sceneGroup 1로, 장소가 바뀌면 sceneGroup 2로 부여하세요.`
    : `- sceneGroup: 같은 장소/배경에서 벌어지는 이야기끼리 같은 번호를 부여하세요 (1부터 시작)
  - 예: 1~4번이 교실이면 sceneGroup: 1, 5~6번이 운동장이면 sceneGroup: 2`;

  return `당신은 언어치료 전문가입니다.

[사용 가능한 감정 라벨 — 반드시 이 목록에서만 선택]
${availableLabels.join(", ")}

[참고 예시 — 아래 스타일과 문장 길이를 최대한 따라 작성할 것]
${buildFewShotBlock(fewShotExamples)}

위 예시처럼, 주제 "${safeTopic}"에 맞는 감정 추론 활동용 짧은 이야기 ${count}개를 새로 만들어주세요.
${narrativeArcSection}
${rulesSection}

각 이야기는 다음 형식을 따릅니다:
- title: 이야기 상황을 서술하는 문장 (위 예시처럼 구체적인 상황 묘사)
  - 절대 감정을 직접적으로 적지 마세요 (예: "슬퍼요", "기뻐요", "화가 나요" 등 감정 단어 사용 금지)
  - 감정을 유추할 수 있는 상황만 묘사하세요 (예: "기다리던 선물을 받지 못했어요" ← 상황만 묘사, 감정은 아이가 추론)
  - 주제 키워드를 title에 직접 넣지 말고, 그 주제와 관련된 구체적 에피소드를 묘사하세요
- sentence: "친구는 [이유/감정 상황]" 형식의 문장 (30자 이내, 반드시 "친구는 "으로 시작)
  - title과 마찬가지로 감정 단어를 직접 사용하지 말고, 상황/이유만 서술하세요
- emotions: 감정 선택지 3개 배열
  - 첫 번째(emotions[0]): 상황에 가장 적절한 정답 감정
  - 두 번째, 세 번째(emotions[1], emotions[2]): 상황과 맞지 않는 오답 감정
  - 반드시 위 감정 라벨 목록에서만 선택, 목록에 없는 감정은 절대 사용하지 마세요
${sceneGroupInstruction}

JSON만 출력하세요 (설명, 마크다운 없음):
[
  { "title": "...", "sentence": "친구는 ...", "emotions": ["정답감정", "오답감정1", "오답감정2"], "sceneGroup": 1 },
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

const parseStoryResponse = (raw: string, count = DEFAULT_STORY_COUNT): StoryItem[] => {
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
  return valid.slice(0, count).map((item, i) => ({
    ...item,
    emotions: shuffleEmotions([
      item.emotions[0],
      item.emotions[1],
      item.emotions[2],
    ]),
    // sceneGroup 누락 시 각 이야기마다 고유 번호 fallback
    sceneGroup: typeof item.sceneGroup === "number" ? item.sceneGroup : i + 1,
  }));
};

export const generateEmotionStory = async (
  topic: string,
  availableLabels: string[],
  count = DEFAULT_STORY_COUNT,
): Promise<StoryItem[]> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const startMs = Date.now();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(topic, availableLabels, count),
    config: {
      responseModalities: ["Text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini 응답이 없습니다.");

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) throw new Error("텍스트 응답이 없습니다.");

  const stories = parseStoryResponse(textPart.text, count);
  aiPipelineLogger.addStep("story_ai_response", { durationMs: Date.now() - startMs, storyCount: stories.length });
  return stories;
};
