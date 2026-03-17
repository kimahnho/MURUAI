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
    .slice(0, 200)
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

const buildProposalPrompt = (childInfo: ChildInfo, topic: string): string => {
  const safeTopic = sanitizeTopic(topic);
  const childContext = buildChildContext(childInfo);

  const diagnosisRule = childInfo.diagnosis || childInfo.learningGoal
    ? `\n7. 진단명/학습 목표가 있다면 이야기 속에 자연스럽게 반영`
    : "";

  return `당신은 아동 치료 교육 전문가이자 동화 작가입니다.

[아동 정보]
${childContext}

[요청]
주제 "${safeTopic}"에 맞는 ${STORYBOOK_PAGE_COUNT}페이지 그림책 기획서 2개를 만들어주세요.

[기획서 작성 규칙]
1. 각 기획서는 서로 다른 접근 방식 (예: 첫 번째는 일상 이야기, 두 번째는 모험 이야기)
2. 아동의 이름(${childInfo.name})을 주인공으로 사용
3. ${childInfo.age}세 아이가 이해할 수 있는 쉬운 문장
4. ${STORYBOOK_PAGE_COUNT}페이지 이야기 흐름: 도입(1-2) → 전개(3-5) → 절정(6-7) → 결말(8-10)
5. sceneDescription: 그림 작가에게 전달할 장면 묘사 (구체적인 배경, 인물 표정/동작, 30자 이내)
6. textContent: 아이가 읽을 본문 (한 문장, 40자 이내)${diagnosisRule}

JSON만 출력 (설명, 마크다운 없음):
[
  {
    "title": "이야기 제목 (15자 이내)",
    "summary": "기획서 요약 (50자 이내)",
    "pages": [
      { "pageNumber": 1, "sceneDescription": "장면 묘사", "textContent": "본문 텍스트" },
      { "pageNumber": 2, "sceneDescription": "...", "textContent": "..." }
    ]
  },
  {
    "title": "...",
    "summary": "...",
    "pages": [...]
  }
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
