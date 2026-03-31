/**
 * 세션 평가 — 세션 기록을 분석하여 정확도, 오류 패턴, 진전도, 다음 추천을 생성.
 * Main 3 evaluateSession() 포팅.
 */
import type { SessionEvaluationData, TherapyDomain, DifficultyLevel } from "../model/therapyTypes";
import { getGenAI } from "@/shared/api/genai";

interface SessionRecord {
  responses: Array<{
    itemIndex: number;
    response: "correct" | "incorrect" | "noResponse";
    memo?: string;
  }>;
  therapistMemo: string;
}

interface GenerationInfo {
  domain: TherapyDomain;
  level: number;
  difficulty: DifficultyLevel;
  sessionGoal?: string;
  theme?: string;
}

interface AutoLearnedInfo {
  sessionCount: number;
  domainAccuracy?: Record<string, { current: number }>;
}

/**
 * 세션 데이터를 분석하여 평가 결과를 생성한다.
 */
export async function evaluateSession(params: {
  sessionData: SessionRecord;
  generationInfo: GenerationInfo;
  autoLearned?: AutoLearnedInfo;
}): Promise<SessionEvaluationData> {
  const { sessionData, generationInfo, autoLearned } = params;

  const correct = sessionData.responses.filter((r) => r.response === "correct").length;
  const incorrect = sessionData.responses.filter((r) => r.response === "incorrect").length;
  const noResponse = sessionData.responses.filter((r) => r.response === "noResponse").length;
  const accuracy = sessionData.responses.length > 0
    ? Math.round((correct / sessionData.responses.length) * 100)
    : 0;

  const userPrompt = `세션 평가를 수행해주세요.

## 자료 정보
- 도메인: ${generationInfo.domain}
- 레벨: ${generationInfo.level}
- 난이도: ${generationInfo.difficulty}
${generationInfo.sessionGoal ? `- 목표: ${generationInfo.sessionGoal}` : ""}
${generationInfo.theme ? `- 테마: ${generationInfo.theme}` : ""}

## 세션 결과
- 총 항목: ${sessionData.responses.length}개
- 정답: ${correct}개 / 오답: ${incorrect}개 / 무응답: ${noResponse}개
- 정답률: ${accuracy}%

## 항목별 메모
${sessionData.responses.filter((r) => r.memo).map((r) => `- ${r.itemIndex}번: ${r.memo}`).join("\n") || "(없음)"}

## 치료사 전체 메모
${sessionData.therapistMemo || "(없음)"}

${autoLearned ? `## 이전 이력\n세션 수: ${autoLearned.sessionCount}회, 최근 정답률: ${autoLearned.domainAccuracy?.[generationInfo.domain]?.current ?? "N/A"}%` : "첫 세션입니다."}

위 데이터를 분석하여 세션 평가 JSON을 생성하세요.`;

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: "발달장애 아동 치료 세션 평가 전문가. sessionSummary, errorAnalysis, progressVsPrevious, nextSessionRecommendation, parentReportSummary를 포함한 JSON을 생성하세요.",
        responseMimeType: "application/json",
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text) as SessionEvaluationData;
  } catch {
    // Fallback: 기본 평가
    const prevAcc = autoLearned?.domainAccuracy?.[generationInfo.domain]?.current ?? accuracy;
    const change = accuracy - prevAcc;
    return {
      sessionSummary: { accuracy, totalItems: sessionData.responses.length, correct, incorrect, noResponse },
      errorAnalysis: { confusedPairs: [], pattern: "분석 데이터 부족", possibleCause: "추가 세션 필요" },
      progressVsPrevious: {
        previousAccuracy: prevAcc,
        change: `${change >= 0 ? "+" : ""}${change}%`,
        trend: change > 5 ? "improving" : change < -5 ? "declining" : "stable",
        interpretation: change > 5 ? "향상 추세" : change < -5 ? "하락 추세 — 난이도 조정 필요" : "유지 중",
      },
      nextSessionRecommendation: {
        domain: generationInfo.domain,
        level: generationInfo.level,
        focus: "이전 세션 목표 유지",
        suggestedActivity: "동일 활동 반복",
        difficulty: generationInfo.difficulty,
        theme: generationInfo.theme ?? "일상생활",
      },
      parentReportSummary: `오늘 세션에서 ${sessionData.responses.length}문제 중 ${correct}문제를 맞혔습니다 (${accuracy}%).`,
    };
  }
}
