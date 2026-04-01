/**
 * 멀티턴 질문 생성 — Gemini가 입력 분석 후 부족한 정보만 질문
 *
 * 하드코딩 질문이 아님. 입력 내용 + agent 성숙도에 따라 Gemini가 판단.
 * - 탐색 단계 (0-5회): 최대 2개 질문
 * - 전환 단계 (5-15회): 최대 1개
 * - 확정 단계 (15회+): 질문 없음
 */
import type { ChildVisualAgent } from "../model/types";
import { getMaturity } from "./childAgent";
import { getGenAI } from "@/shared/api/genai";

export interface ClarifyQuestion {
  id: string;
  question: string;
  options: string[];
  allowFreeText: boolean;
}

/**
 * Gemini가 입력을 분석해서 부족한 정보에 대한 질문 생성
 * 빈 배열 = 바로 생성 가능
 */
export async function getClarifyQuestions(
  userPrompt: string,
  agent: ChildVisualAgent,
): Promise<ClarifyQuestion[]> {
  const maturity = getMaturity(agent);

  // 확정 단계: 질문 없이 바로 생성
  if (maturity === "confident") return [];

  const maxQuestions = maturity === "exploring" ? 2 : 1;

  try {
    const genai = getGenAI();

    const systemPrompt = `당신은 특수교육용 이미지 생성 어시스턴트입니다.
치료사가 입력한 프롬프트를 분석하여, 좋은 이미지를 생성하기 위해 부족한 정보가 있으면 질문을 만드세요.

아동 정보:
- 진단: ${agent.diagnosis ?? "미입력"}
- 기능연령: ${agent.functionalAgeMonths ? Math.round(agent.functionalAgeMonths / 12) + "세" : "미입력"}
- 선호 스타일: ${agent.preferredStyle}
- 생성 횟수: ${agent.generationCount}회
${agent.effectiveThemes.length > 0 ? `- 선호 테마: ${agent.effectiveThemes.join(", ")}` : ""}

규칙:
- 질문은 최대 ${maxQuestions}개까지만
- 이미 입력에 포함된 정보는 절대 다시 물어보지 마세요
- 질문이 필요 없으면 빈 배열 []을 반환하세요
- 각 질문에는 빠른 선택을 위한 선택지 3-4개를 포함하세요
- 선택지는 한국어로, 치료사가 이해하기 쉽게
- 질문은 짧고 명확하게

부족할 수 있는 정보 종류:
- 구체적인 장면/상황 (너무 추상적일 때)
- 등장인물의 감정이나 행동 (캐릭터가 있을 때)
- 사용 맥락 (어떤 수업/치료에서 쓸 건지)
- 수량이나 배치 (여러 객체일 때)

JSON 형식으로만 응답:
[{"id": "고유ID", "question": "질문", "options": ["선택1", "선택2", "선택3"], "allowFreeText": true/false}]
정보가 충분하면: []`;

    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `치료사 입력: "${userPrompt}"` }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];

    const parsed = JSON.parse(text) as ClarifyQuestion[];
    return Array.isArray(parsed) ? parsed.slice(0, maxQuestions) : [];
  } catch {
    // Gemini 실패 시 질문 없이 바로 생성
    return [];
  }
}

/**
 * 질문 응답을 원본 프롬프트에 반영
 */
export function applyAnswers(
  originalPrompt: string,
  answers: Record<string, string>,
): string {
  const additions = Object.values(answers).filter(Boolean);
  if (additions.length === 0) return originalPrompt;
  return `${originalPrompt} (${additions.join(", ")})`;
}
