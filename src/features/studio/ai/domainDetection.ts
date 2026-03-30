/**
 * 도메인 감지 — 사용자 입력에서 치료 도메인(감정/언어/인지/소근육/사회/놀이)을 분류한다.
 * 가장 긴 키워드부터 매칭하여 이중 카운트를 방지한다.
 */
import type { TherapyDomain } from "../model/therapyTypes";
import { DOMAIN_KEYWORDS } from "../model/therapyConstants";

export type DomainConfidence = "high" | "medium" | "low" | "none";

export interface DomainDetectionResult {
  primary: TherapyDomain;
  secondary?: TherapyDomain;
  confidence: DomainConfidence;
  needsClarification: boolean;
}

// 복합 도메인 패턴
const MULTI_DOMAIN_MARKERS = ["+", "복합", "하면서", "겸", "동시에", "하며", "하고", "중에"];

/**
 * 도메인 감지.
 * 1. 모든 키워드를 길이 내림차순 정렬
 * 2. 가장 긴 키워드부터 매칭 (이중 카운트 방지)
 * 3. 점수 + 프롬프트 길이로 confidence 판정
 */
export function detectDomain(userPrompt: string): DomainDetectionResult {
  const scores = new Map<TherapyDomain, number>();
  let remaining = userPrompt.toLowerCase();

  // 모든 키워드를 길이 내림차순으로 정렬
  const allKeywords: Array<{ domain: TherapyDomain; keyword: string }> = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of keywords) {
      allKeywords.push({ domain: domain as TherapyDomain, keyword: kw });
    }
  }
  allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

  // 긴 키워드부터 매칭
  for (const { domain, keyword } of allKeywords) {
    if (remaining.includes(keyword)) {
      scores.set(domain, (scores.get(domain) ?? 0) + 1);
      remaining = remaining.replaceAll(keyword, "");
    }
  }

  // 점수 순 정렬
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return {
      primary: "cognition",
      confidence: "none",
      needsClarification: true,
    };
  }

  const [primaryDomain, primaryScore] = sorted[0];
  const confidence: DomainConfidence =
    primaryScore >= 2 ? "high" :
    primaryScore >= 1 && userPrompt.length > 15 ? "medium" : "low";

  // 보조 도메인 감지
  let secondary: TherapyDomain | undefined;
  if (sorted.length >= 2) {
    const hasMultiMarker = MULTI_DOMAIN_MARKERS.some((m) => userPrompt.includes(m));
    if (hasMultiMarker && sorted[1][1] > 0) {
      secondary = sorted[1][0];
    }
  }

  return {
    primary: primaryDomain,
    secondary,
    confidence,
    needsClarification: confidence === "low",
  };
}
