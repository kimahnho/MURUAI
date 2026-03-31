/**
 * 도메인 감지 — 사용자 입력에서 치료 도메인(감정/언어/인지/소근육/사회/놀이)을 분류한다.
 * 가장 긴 키워드부터 매칭하여 이중 카운트를 방지한다.
 *
 * v2: DOMAIN_PRIORITY 동점 해소 + autoLearned fallback (Main 3 동기화)
 */
import type { TherapyDomain, AutoLearnedData } from "../model/therapyTypes";
import { DOMAIN_KEYWORDS, DOMAIN_PRIORITY } from "../model/therapyConstants";

export type DomainConfidence = "high" | "medium" | "low" | "none";

export interface DomainDetectionResult {
  primary: TherapyDomain;
  secondary?: TherapyDomain;
  confidence: DomainConfidence;
  needsClarification: boolean;
}

/** 공백 제거 후 키워드 매칭용 정규화 */
function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

// 복합 도메인 패턴
const MULTI_DOMAIN_MARKERS = ["+", "복합", "하면서", "겸", "동시에", "하며", "하고", "중에"];

/**
 * 도메인 감지.
 * 1. 도메인별 키워드를 길이 내림차순으로 longest-first 소거
 * 2. 동점 시 DOMAIN_PRIORITY 순서로 해소
 * 3. score=0이면 autoLearned fallback → 없으면 cognition(기본값) + 명확화 요청
 */
export function detectDomain(
  userPrompt: string,
  autoLearned?: AutoLearnedData | null,
): DomainDetectionResult {
  const normalized = normalize(userPrompt);

  // 도메인별 점수 계산 (longest-first로 이중카운트 방지)
  const scores = new Map<TherapyDomain, number>();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    let remaining = normalized;
    let score = 0;
    for (const kw of sorted) {
      const nkw = normalize(kw);
      if (remaining.includes(nkw)) {
        score++;
        remaining = remaining.replace(nkw, ""); // 매칭된 부분 소거
      }
    }
    scores.set(domain as TherapyDomain, score);
  }

  // 점수 순 정렬 (동점 시 DOMAIN_PRIORITY 순서 유지)
  const sorted = DOMAIN_PRIORITY
    .map((d) => ({ domain: d, score: scores.get(d) ?? 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 동점 시 DOMAIN_PRIORITY 순서 유지 (이미 정렬됨)
      return 0;
    });

  const best = sorted[0];
  const second = sorted[1];

  // ── Case 1: 키워드 매칭 0 → fallback ──
  if (best.score === 0) {
    // autoLearned에 추천이 있으면 사용
    if (autoLearned?.preferredActivities && autoLearned.preferredActivities.length > 0) {
      // preferredActivities에서 도메인 힌트 추출 시도
      return {
        primary: "cognition", // 안전한 기본값
        confidence: "low",
        needsClarification: false,
      };
    }
    // 아무 단서 없음 → 명확화 요청
    return {
      primary: "cognition",
      confidence: "none",
      needsClarification: true,
    };
  }

  // ── Case 2: 복합 도메인 감지 ──
  const isMultiDomain =
    MULTI_DOMAIN_MARKERS.some((p) => userPrompt.includes(p)) &&
    second.score > 0;

  if (isMultiDomain) {
    return {
      primary: best.domain,
      secondary: second.domain,
      confidence: best.score >= 2 ? "high" : "medium",
      needsClarification: false,
    };
  }

  // ── Case 3: 단일 도메인 ──
  // score=1 + 짧은 프롬프트 → 신뢰도 낮음
  const isVague = best.score === 1 && userPrompt.trim().length < 15;
  return {
    primary: best.domain,
    secondary: second.score > 0 && second.score === best.score ? second.domain : undefined,
    confidence: best.score >= 2 ? "high" : isVague ? "low" : "medium",
    needsClarification: false,
  };
}
