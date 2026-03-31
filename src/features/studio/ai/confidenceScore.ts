/**
 * 신뢰도 점수 산출 — 시스템 판단의 확신도를 수치화한다.
 *
 * 3개 축: 도메인 감지, 활동 유형 적합도, 난이도 보정
 * 각각 0-1 범위, 가중 평균으로 overall 산출.
 * dataMaturity는 누적 세션 수에 따라 결정.
 */
import type { ConfidenceScore, TherapyDomain, DifficultyLevel, AutoLearnedData } from "../model/therapyTypes";
import type { DomainConfidence } from "./domainDetection";

interface ConfidenceInput {
  domainConfidence: DomainConfidence;
  domain: TherapyDomain;
  difficulty: DifficultyLevel;
  autoLearned?: AutoLearnedData | null;
  guardrailWarningCount: number;
  hasStudentProfile: boolean;
}

const DOMAIN_CONFIDENCE_MAP: Record<DomainConfidence, number> = {
  high: 0.95,
  medium: 0.7,
  low: 0.4,
  none: 0.1,
};

/**
 * 신뢰도 점수를 계산한다.
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceScore {
  const flags: string[] = [];

  // 1. 도메인 감지 확신도
  const domainDetection = DOMAIN_CONFIDENCE_MAP[input.domainConfidence];
  if (domainDetection < 0.5) {
    flags.push("도메인 감지 신뢰도가 낮습니다. 사용자 확인이 필요할 수 있습니다.");
  }

  // 2. 활동 유형 적합도
  let activityMatch = 0.8; // 기본값
  if (input.hasStudentProfile) {
    activityMatch += 0.1; // 프로필이 있으면 더 정확
  }
  if (input.guardrailWarningCount > 0) {
    activityMatch -= input.guardrailWarningCount * 0.05;
    if (input.guardrailWarningCount >= 2) {
      flags.push(`가드레일 경고 ${input.guardrailWarningCount}건 — 자동 보정이 적용되었습니다.`);
    }
  }
  activityMatch = Math.max(0.1, Math.min(1, activityMatch));

  // 3. 난이도 보정 확신도
  let difficultyCalibration = 0.6; // 기본값 (데이터 없으면 낮음)
  if (input.autoLearned && input.autoLearned.sessionCount > 0) {
    const sessions = input.autoLearned.sessionCount;
    if (sessions >= 10) difficultyCalibration = 0.9;
    else if (sessions >= 5) difficultyCalibration = 0.8;
    else if (sessions >= 2) difficultyCalibration = 0.7;
  } else {
    flags.push("세션 이력이 없어 난이도 보정이 기본값입니다.");
  }

  // 4. 전체 신뢰도 (가중 평균)
  const overall =
    domainDetection * 0.4 +
    activityMatch * 0.3 +
    difficultyCalibration * 0.3;

  // 5. 데이터 기반도
  const sessionCount = input.autoLearned?.sessionCount ?? 0;
  const dataMaturity: ConfidenceScore["dataMaturity"] =
    sessionCount >= 10 ? "established" :
    sessionCount >= 3 ? "developing" : "initial";

  return {
    domainDetection: Math.round(domainDetection * 100) / 100,
    activityMatch: Math.round(activityMatch * 100) / 100,
    difficultyCalibration: Math.round(difficultyCalibration * 100) / 100,
    overall: Math.round(overall * 100) / 100,
    flags,
    dataMaturity,
  };
}
