/**
 * Gemini를 사용해 아동 맞춤형 스토리북 기획서 2개를 생성하는 모듈.
 */
// import { GoogleGenAI } from "@google/genai";

// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";

import type { ChildInfo, StoryProposal, StoryPageOutline } from "../model/storybookTypes";
import { STORYBOOK_PAGE_COUNT } from "../model/storybookTypes";

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

const sanitizeTopic = (topic: string): string =>
  topic
    .slice(0, 500)
    .replace(/[\n\r"\\]/g, " ")
    .trim();

const buildChildContext = (childInfo: ChildInfo): string => {
  const lines = [
    `- 이름: ${childInfo.name}`,
    `- 성별: ${childInfo.gender === "male" ? "남아" : "여아"}`,
    `- 나이: ${childInfo.age}세`,
  ];
  if (childInfo.diagnosis) {
    lines.push(`- 진단명: ${childInfo.diagnosis}`);
  }
  if (childInfo.learningGoal) {
    lines.push(`- 학습 목표: ${childInfo.learningGoal}`);
  }
  return lines.join("\n");
};

const buildDiagnosisGuide = (childInfo: ChildInfo): string => {
  if (!childInfo.diagnosis && !childInfo.learningGoal) return "";

  return `
- 진단/학습 목표 반영 가이드:
  - 사회성 관련 (예: ASD, 또래관계): 사회적 상황을 단계별로 (인사→대화→함께 놀기)
  - 감정 관련 (예: 감정조절): 등장인물의 감정을 표정과 행동으로 구체적 묘사
  - 언어 관련 (예: 언어발달지연): 반복 구문과 의성어 적극 활용 ("똑똑똑", "안녕, 안녕!")
  - 인지 관련 (예: 지적장애): 한 페이지에 하나의 행동/사건만. 동시 진행 금지.
  - 학습 목표가 있으면 주인공이 해당 목표를 달성하는 과정을 자연스럽게 보여주기`;
};

const buildProposalPrompt = (childInfo: ChildInfo, topic: string): string => {
  const safeTopic = sanitizeTopic(topic);
  const childContext = buildChildContext(childInfo);
  const diagnosisGuide = buildDiagnosisGuide(childInfo);

  return `당신은 아동 동화 작가입니다.

[아동 정보]
${childContext}

[유저 입력]
"${safeTopic}"

═══ STEP 1: 입력 분석 (내부 추론용, JSON에 포함하지 마세요) ═══

유저 입력을 아래 유형 중 하나로 분류하세요:

A. **특정 이야기/동화명** (예: 콩쥐팥쥐, 백설공주, The Ugly Duckling)
   → 원작 줄거리를 충실히 ${STORYBOOK_PAGE_COUNT}페이지로 각색.
   → 주인공 이름을 아동 이름으로 바꾸지 마세요. 원작 캐릭터명 유지.
   → "현대 버전", "우주 배경" 등 변형 요청이 있으면 설정만 바꾸고 핵심 줄거리 유지.
   → 기획서 1: 원작 충실 버전 / 기획서 2: 톤이나 배경 변형 버전

B. **추상적 주제/테마** (예: 용기, 감정, 학교)
   → 이 주제를 보여주는 **구체적 상황 하나**를 먼저 정하세요.
   → 예: "용기" → "수영을 무서워하던 아이가 발끝부터 물에 들어가 보는 이야기"
   → 예: "학교" → "새 학기 첫날, 짝꿍과 인사하는 법을 배우는 이야기"
   → 아동 이름(${childInfo.name})을 주인공으로 사용.

C. **구체적 시나리오** (예: 숲에서 길을 잃은 아이 이야기)
   → 설명을 충실히 따르되, 모순 요소는 마지막 언급을 우선.
   → 아동 이름(${childInfo.name})을 주인공으로 사용.

D. **알 수 없는 제목/불명확한 입력**
   → 입력 텍스트에서 연상되는 분위기/주제로 창작.
   → 존재하지 않는 원작 줄거리를 지어내지 마세요.

═══ STEP 2: ${STORYBOOK_PAGE_COUNT}페이지 감정 곡선 ═══

| 페이지 | 역할 |
|--------|------|
| 1 | 도입 — 주인공과 배경 소개 |
| 2 | 일상 심화 — 주인공 성격/습관 |
| 3 | 사건 발생 — 문제/새 상황 등장 |
| 4 | 첫 시도 — 해결 노력, 잘 안됨 |
| 5 | 감정 저점 — 좌절/두려움 |
| 6 | 전환점 — 도움/깨달음/용기 |
| 7 | 재도전 — 새 방법으로 도전 |
| 8 | 성공/해결 — 성장하는 장면 |
| 9 | 여운 — 변화된 모습, 주변 반응 |
| 10 | 마무리 — 따뜻한 결말 |

═══ STEP 3: sceneDescription 작성 규칙 ═══

그림 작가에게 전달됩니다. 아래 5요소를 반드시 포함하세요:
1. 장소/배경 (예: "밝은 햇살이 드는 유치원 교실")
2. 인물 동작 (예: "책상 앞에 앉아 종이비행기를 접고 있다")
3. 인물 표정 (예: "눈을 크게 뜨고 놀란 표정")
4. 핵심 소품 (예: "빨간 우산", "반쪽 쿠키")
5. 분위기/색감 (예: "따뜻한 노을빛", "차갑고 파란 톤")

나쁜 예: "교실에서 친구와 이야기하는 장면"
좋은 예: "밝은 유치원 교실. 노란 책상에 앉아 옆자리 친구에게 빨간 크레파스를 건네는 모습. 수줍은 미소. 창문으로 오후 햇살."

═══ STEP 4: textContent 작성 규칙 ═══

- ${childInfo.age}세 어휘 수준 (3-4세: 의성어 중심 / 5-6세: 감정 단어 / 7-8세: 인과 표현 / 9세+: 비유 가능)
- 한 문장, **40자 이내** (공백 포함)
- 의성어/의태어 활용 권장 ("두근두근", "살금살금")
- 직접 인용 권장 ("나도 같이 놀아도 돼?")${diagnosisGuide}

═══ 언어 규칙 ═══
- 영어 입력이어도 JSON은 모두 한국어로 출력
- 영어 동화 제목 (예: "The Ugly Duckling") → 한국어 버전으로 각색

JSON만 출력 (설명, 마크다운, 내부 추론 없음):
[
  {
    "title": "이야기 제목 (15자 이내)",
    "summary": "기획서 요약 (50자 이내)",
    "pages": [
      { "pageNumber": 1, "sceneDescription": "5요소 포함 장면 묘사", "textContent": "40자 이내 본문" },
      ...10페이지
    ]
  },
  { ...두 번째 기획서 }
]`;
};

const isValidPage = (item: unknown): item is StoryPageOutline => {
  if (typeof item !== "object" || item === null) return false;
  const rec = item as Record<string, unknown>;
  return (
    typeof rec.pageNumber === "number" &&
    typeof rec.sceneDescription === "string" &&
    typeof rec.textContent === "string"
  );
};

const parseProposalResponse = (raw: string): StoryProposal[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const valid = parsed.filter((item): item is {
    title: string;
    summary: string;
    pages: StoryPageOutline[];
  } => {
    if (typeof item !== "object" || item === null) return false;
    const rec = item as Record<string, unknown>;
    if (typeof rec.title !== "string" || typeof rec.summary !== "string") return false;
    if (!Array.isArray(rec.pages) || rec.pages.length === 0) return false;
    return rec.pages.every(isValidPage);
  });

  if (valid.length === 0) throw new Error("유효한 기획서 데이터가 없습니다.");

  return valid.slice(0, 2).map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    summary: item.summary,
    pages: item.pages
      .slice(0, STORYBOOK_PAGE_COUNT)
      .map((p, i) => ({
        pageNumber: i + 1,
        sceneDescription: p.sceneDescription,
        textContent: p.textContent,
      })),
  }));
};

export const generateStoryProposals = async (
  childInfo: ChildInfo,
  topic: string,
): Promise<StoryProposal[]> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildProposalPrompt(childInfo, topic),
    config: {
      responseModalities: ["Text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini 응답이 없습니다.");

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) throw new Error("텍스트 응답이 없습니다.");

  return parseProposalResponse(textPart.text);
};
