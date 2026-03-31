/**
 * 임상 적합성 평가 — 치료사 요청에 대한 참고 의견 제시.
 * Gemini 호출 0회. 순수 로직 기반.
 * Main 3 assessClinicalFit() + buildPushbackMessage() 포팅.
 */
import type { TherapyDomain, DiagnosisProfile, AutoLearnedData } from "../model/therapyTypes";
import { extractDiagnosis } from "./livingAgent";

// ── 타입 ──

export interface ClinicalConcern {
  severity: "strong" | "warning" | "info";
  message: string;
  clinicalBasis: string;
  suggestedAlternative?: Record<string, unknown>;
}

export interface ClinicalAssessment {
  isOptimal: boolean;
  concerns: ClinicalConcern[];
  recommendation: {
    proposed: Record<string, unknown>;
    reasoning: string;
    clinicalBasis: string;
  } | null;
}

/**
 * 치료사의 요청에 대한 임상적 참고 의견을 평가한다.
 * 최종 결정은 항상 치료사에게 있다.
 */
export function assessClinicalFit(
  prompt: string,
  domain: TherapyDomain,
  diagnosis?: DiagnosisProfile,
  autoLearned?: AutoLearnedData | null,
  ageYears?: number,
): ClinicalAssessment {
  const concerns: ClinicalConcern[] = [];
  const diagInfo = diagnosis ?? extractDiagnosis(prompt);

  // 1. 인지 부하 체크 (컷 수 × 난이도)
  const cutMatch = prompt.match(/(\d+)\s*컷/);
  const isHard = /어려운|어렵게|hard|상/.test(prompt);
  if (cutMatch) {
    const cuts = parseInt(cutMatch[1]);
    const hasASD = diagInfo.primary?.startsWith("ASD");
    const hasADHD = diagInfo.primary === "ADHD" || diagInfo.comorbidities.includes("ADHD");

    if (cuts > 6 && (hasASD || hasADHD)) {
      concerns.push({
        severity: "strong",
        message: `${cuts}컷은 분량이 많을 수 있어요.`,
        clinicalBasis: hasASD
          ? `${cuts}컷${isHard ? " + 어려운 난이도" : ""}는 한 세션에 다루기에 분량이 많을 수 있어요. ${Math.ceil(cuts / 2)}컷씩 나눠서 진행하는 것도 방법이에요.`
          : `ADHD 특성상 후반부로 갈수록 집중이 어려워질 수 있어요. ${Math.ceil(cuts / 2)}컷씩 나누는 것도 고려해보시겠어요?`,
        suggestedAlternative: { itemCount: Math.ceil(cuts / 2) },
      });
    }
  }

  // 2. 활동-진단 적합도
  const requestedFindSame = /같은\s*것\s*찾기|findSame/.test(prompt);
  if (requestedFindSame && (domain === "emotion" || domain === "social") && diagInfo.primary?.startsWith("ASD")) {
    concerns.push({
      severity: "warning",
      message: "'감정 추론' 활동도 고려해보시겠어요?",
      clinicalBasis: "'같은 것 찾기'도 좋지만, 감정 이해가 목표라면 상황 맥락에서 감정을 추론하는 활동이 더 직접적으로 연결될 수 있어요.",
      suggestedAlternative: { worksheetType: "emotionInference" },
    });
  }

  // 3. 난이도-데이터 불일치
  if (isHard && autoLearned && autoLearned.sessionCount > 0) {
    const effectiveDiff = autoLearned.effectiveDifficulty;
    if (effectiveDiff === "easy") {
      concerns.push({
        severity: "warning",
        message: "현재 적정 난이도가 '쉬움'인데, 난이도를 올려도 괜찮으실까요?",
        clinicalBasis: "최근 기록 기준 적정 난이도가 '쉬움'이에요. 어려운 난이도에서 성공 경험이 줄어들 수 있는데, 선생님이 의도하신 거라면 진행할게요.",
        suggestedAlternative: { difficulty: "medium" },
      });
    }
  }

  // 4. 연령 부적합 경고
  if (ageYears != null && ageYears < 3 && domain !== "motor" && domain !== "play") {
    concerns.push({
      severity: "strong",
      message: `${ageYears}세 아동에게는 놀이 기반 활동이 더 적합할 수 있어요.`,
      clinicalBasis: "어린 연령에서는 구조화된 학습지보다 놀이 중심 활동이 효과적인 경우가 많아요.",
      suggestedAlternative: { domain: "play" },
    });
  }

  const hasStrong = concerns.some((c) => c.severity === "strong");
  const recommendation = hasStrong
    ? {
        proposed: concerns.find((c) => c.severity === "strong")?.suggestedAlternative ?? {},
        reasoning: concerns.find((c) => c.severity === "strong")?.message ?? "",
        clinicalBasis: concerns.find((c) => c.severity === "strong")?.clinicalBasis ?? "",
      }
    : null;

  return { isOptimal: concerns.length === 0, concerns, recommendation };
}

/** 참고 의견을 치료사에게 보여줄 메시지로 변환한다. */
export function buildPushbackMessage(assessment: ClinicalAssessment): {
  message: string;
  quickActions: Array<{ label: string; action: string }>;
} {
  const lines: string[] = ["참고로 말씀드려도 될까요?\n"];

  for (const concern of assessment.concerns) {
    const icon = concern.severity === "strong" ? "⚠️" : concern.severity === "warning" ? "💡" : "ℹ️";
    lines.push(`${icon} ${concern.message}`);
    lines.push(`   ${concern.clinicalBasis}\n`);
  }

  if (assessment.recommendation) {
    lines.push(`제 제안: ${assessment.recommendation.reasoning}`);
  }

  return {
    message: lines.join("\n"),
    quickActions: [
      { label: "추천대로", action: "추천대로 해줘" },
      { label: "원래대로 진행", action: "원래대로 해줘" },
    ],
  };
}
