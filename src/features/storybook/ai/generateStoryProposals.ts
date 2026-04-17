/**
 * Gemini를 사용해 아동 맞춤형 스토리북 기획서 2개를 생성하는 모듈.
 */
// import { GoogleGenAI } from "@google/genai";

// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";
import { aiPipelineLogger } from "@/shared/utils/aiPipelineLogger";

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
  const lines = [`- 나이: ${childInfo.age}세`];
  if (childInfo.name) lines.push(`- 이름: ${childInfo.name}`);
  if (childInfo.gender) lines.push(`- 성별: ${childInfo.gender === "male" ? "남아" : "여아"}`);
  if (childInfo.diagnosis) lines.push(`- 진단명: ${childInfo.diagnosis}`);
  if (childInfo.learningGoal) lines.push(`- 학습 목표: ${childInfo.learningGoal}`);
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

const buildProposalPrompt = (childInfo: ChildInfo, topic: string, pageCount: number): string => {
  const safeTopic = sanitizeTopic(topic);
  const childContext = buildChildContext(childInfo);
  const diagnosisGuide = buildDiagnosisGuide(childInfo);

  const nameSection = childInfo.name ? `아동 이름(${childInfo.name})을 주인공으로 사용하세요.` : "주인공 이름은 자유롭게 지어주세요.";

  return `당신은 아이들의 마음을 꿰뚫어 보는 그림책 작가입니다.

당신의 이야기는 아이의 눈높이에서 시작합니다:
- 아이가 매일 겪는 작은 세계가 무대입니다 (유치원 교실, 놀이터, 할머니 집, 이불 속)
- 아이에게는 잃어버린 양말도 대사건이고, 새 친구의 미소도 큰 모험입니다
- 어른의 교훈이 아니라, 아이가 스스로 느끼고 깨닫는 순간을 그립니다
- "~해야 해", "~하면 안 돼" 같은 훈계 금지. 대신 아이가 직접 경험하며 배우게 하세요
- 「구름빵」처럼 상상이 현실이 되고, 「강아지 똥」처럼 보잘것없는 것도 소중한 이야기

[아동 정보]
${childContext}

[유저 입력]
"${safeTopic}"

═══ 입력 분석 (내부 추론용, JSON에 포함하지 마세요) ═══

유저 입력을 분류하세요:

A. **특정 이야기/동화명** (예: 콩쥐팥쥐, 백설공주, The Ugly Duckling)
   → 원작 줄거리를 충실히 ${STORYBOOK_PAGE_COUNT}페이지로 각색. 원작 캐릭터명 유지.
   → 기획서 1: 원작 충실 버전 / 기획서 2: 톤이나 배경 변형 버전

B. **추상적 주제/테마** (예: 용기, 감정, 학교)
   → 이 주제를 보여주는 구체적 상황 하나를 먼저 정하세요.
   → ${nameSection}

C. **구체적 시나리오** (예: 숲에서 길을 잃은 아이 이야기)
   → ${nameSection}

D. **불명확한 입력** → 연상되는 분위기로 창작. 존재하지 않는 원작을 지어내지 마세요.

═══ 나이별 발달 참고 — 엄격한 규칙이 아닌 창작의 나침반 ═══

대상: ${childInfo.age}세

아동의 언어 이해력과 인지 발달 단계를 고려하여 자연스러운 이야기를 만들어주세요:

- 어린 아이(3-4세)는 의성어와 반복 구조를 좋아하고, 단순한 인과관계를 이해합니다.
  한 페이지에 하나의 장면만 담고, 예측 가능한 패턴이 안정감을 줍니다.
  좋은 그림책 참고: 「구름빵」, 「강아지 똥」, 「달님 안녕」

- 유아기(5-6세)는 감정 어휘가 풍부해지고 접속사(그래서, 그런데)를 사용합니다.
  주인공의 감정이 표정과 행동으로 드러나야 하고, 짧은 대화가 이야기를 풍성하게 만듭니다.
  좋은 그림책 참고: 「무지개 물고기」, 「괜찮아」, 「소피가 화나면」

- 아동기(7-8세)는 인과관계와 시간 순서를 정확히 이해하고, 4개 이상 장면을 재구성합니다.
  복선과 회수가 가능하고, 실패→재시도→성장의 서사가 깊은 공감을 일으킵니다.
  등장인물 각자의 동기와 감정이 구별되어야 합니다.

- 고학년(9세+)은 비유, 관용구, 추상적 주제를 이해합니다.
  도덕적 딜레마, 관점의 차이, 선택의 무게를 다룰 수 있고,
  독자가 결말 이후에도 생각하게 만드는 여운이 중요합니다.

═══ 스토리 품질 원칙 ═══

1. **페이지 간 연결**: 각 페이지의 마지막이 다음 시작으로 자연스럽게 이어져야 합니다.
   "다음은 어떻게 될까?" 궁금해지는 전환을 만드세요.

2. **구체성**: "슬펐다"가 아니라 "눈물이 뚝 떨어져 운동화가 젖었다"처럼 보여주세요.
   감정을 서술하지 말고, 행동과 디테일로 드러내세요.

3. **소품의 힘**: 초반에 등장한 사물(빨간 우산, 반쪽 쿠키)이 후반에 의미 있게 다시 나타나면
   이야기가 하나로 묶입니다.

4. **캐릭터의 목소리**: 등장인물마다 말투와 행동 패턴이 달라야 합니다.
   대사만으로 누구인지 알 수 있게.

5. **결말의 여운**: "그래서 행복하게 살았답니다"가 아니라,
   주인공이 달라진 모습을 보여주는 마지막 장면으로 마무리하세요.

═══ sceneDescription 작성 ═══

그림 작가에게 전달됩니다. 6요소를 포함하세요:
1. 장소/배경 (구체적 공간 + 시간대)
2. 인물 위치 (예: "주인공이 화면 왼쪽에, 친구가 오른쪽에")
3. 인물 동작
4. 인물 표정 (얼굴 수준)
5. 핵심 소품 1-2개
6. 분위기/색감

나쁜 예: "교실에서 친구와 이야기하는 장면"
좋은 예: "밝은 유치원 교실. 노란 책상에 앉아 옆자리 친구에게 빨간 크레파스를 건네는 모습. 수줍은 미소. 창문으로 오후 햇살."

중요 규칙:
- 주인공은 각 장면에 **단 1명만** 등장합니다. 주인공이 복제되어 여러 명 나오는 묘사를 하지 마세요.
- 모든 행동과 사물은 **물리적으로 현실적**이어야 합니다. 마법처럼 갑자기 완성된 결과물이 아닌, 만들어가는 과정을 묘사하세요.
- 재료의 물성을 존중하세요: 천은 중력에 따라 늘어지고, 돌은 바닥에 놓이고, 나무는 두께와 무게가 있습니다.

═══ textContent 작성 ═══

- ${childInfo.age}세가 자연스럽게 이해하고 즐길 수 있는 어휘와 문장으로 쓰세요.
- 의성어/의태어와 직접 인용을 적극 활용하세요.
- 너무 짧아서 밋밋하거나, 너무 길어서 그림책에 안 어울리지 않게 균형을 잡으세요.${diagnosisGuide}

═══ 언어 규칙 ═══
- JSON은 모두 한국어로 출력. 영어 동화 제목도 한국어 각색.

JSON만 출력:
[
  {
    "title": "이야기 제목 (15자 이내)",
    "summary": "기획서 요약 (50자 이내)",
    "pages": [
      { "pageNumber": 1, "sceneDescription": "5요소 장면 묘사", "textContent": "본문" },
      ...${pageCount}페이지
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

const parseProposalResponse = (raw: string, pageCount: number): StoryProposal[] => {
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
      .slice(0, pageCount)
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
  pageCount: number = STORYBOOK_PAGE_COUNT,
): Promise<StoryProposal[]> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const startMs = Date.now();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: buildProposalPrompt(childInfo, topic, pageCount),
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini 응답이 없습니다.");

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) throw new Error("텍스트 응답이 없습니다.");

  aiPipelineLogger.addStep("proposal_ai_response", { durationMs: Date.now() - startMs, responseLength: textPart.text.length });

  return parseProposalResponse(textPart.text, pageCount);
};
