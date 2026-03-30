/**
 * 입력 안전 검사 — 위기 키워드, 금지 행위, 범위 초과 감지.
 * Gemini 호출 전에 실행하여 부적절한 요청을 차단한다.
 */
import type { SafetyCheckResult } from "../model/therapyTypes";
import { CRISIS_KEYWORDS, CRISIS_HOTLINES } from "../model/therapyConstants";

// 금지 행위 패턴 — 진단, 약물, 치료 중단
const PROHIBITED_PATTERNS = [
  { pattern: /진단해|진단\s*내려/, message: "진단은 의료 전문가만 할 수 있습니다. 소아과 또는 발달 전문 병원에 문의하세요." },
  { pattern: /약물|처방|약\s*추천/, message: "약물 관련 상담은 소아과 전문의에게 문의하세요." },
  { pattern: /치료\s*중단|그만\s*두/, message: "치료 중단 결정은 담당 치료사와 직접 상의하세요." },
];

// 범위 초과 패턴 — 삼킴장애, 속화 등
const OUT_OF_SCOPE_PATTERNS = [
  { pattern: /삼킴\s*장애|연하\s*곤란|삼킴/, message: "삼킴 장애는 전문 의료기관의 직접 평가가 필요합니다." },
  { pattern: /속화|말\s*빠른/, message: "속화(클러터링)는 유창성 전문가의 직접 평가가 필요합니다." },
];

export function checkSafety(userMessage: string): SafetyCheckResult {
  const text = userMessage.toLowerCase();

  // 위기 키워드 감지
  for (const keyword of CRISIS_KEYWORDS) {
    if (text.includes(keyword)) {
      const hotlineText = CRISIS_HOTLINES
        .map((h) => `- ${h.name}: ${h.number}`)
        .join("\n");
      return {
        isSafe: false,
        crisisDetected: true,
        message: `위기 상황이 감지되었습니다. 즉시 전문 기관에 연락하세요.\n\n${hotlineText}`,
        hotlines: CRISIS_HOTLINES.map((h) => h.number),
      };
    }
  }

  // 금지 행위 감지
  for (const { pattern, message } of PROHIBITED_PATTERNS) {
    if (pattern.test(text)) {
      return { isSafe: false, crisisDetected: false, message };
    }
  }

  // 범위 초과 감지
  for (const { pattern, message } of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(text)) {
      return { isSafe: false, crisisDetected: false, message };
    }
  }

  return { isSafe: true, crisisDetected: false };
}
