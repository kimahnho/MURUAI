/**
 * 입력 안전 검사 — 위기 키워드, 금지 행위, 범위 초과 감지.
 * Gemini 호출 전에 실행하여 부적절한 요청을 차단한다.
 *
 * v2: regex 기반 (한국어 동사 활용형 대응)
 */
import type { SafetyCheckResult } from "../model/therapyTypes";
import { CRISIS_HOTLINES } from "../model/therapyConstants";

/** 공백 제거 후 키워드 매칭용 정규화 */
function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

// ── 위기 감지 — 정규식 기반 (한국어 동사 활용형 대응) ──

const CRISIS_PATTERNS: RegExp[] = [
  /자해/, /머리.*박|머리박/, /깨물|깨문|물어|물고|물었/,
  /자살|죽고싶|죽을/, /학대|방치/,
  /때리|때린|때려|때렸|맞았|맞고/,
  /폭력|폭행/, /피흘|피나|출혈/,
  /칼|흉기/, /성폭력|성학대|성추행/,
  /화상|골절|멍/, /아동보호/,
  /위험|응급|위기/,
  /벽에.*박|머리를.*벽|박아/,
];

// ── 금지 요청 감지 — 정규식 기반 ──

type ProhibitionType = "diagnosis" | "medical" | "treatment_decision";

const PROHIBITION_PATTERNS: Array<{ pattern: RegExp; type: ProhibitionType; message: string }> = [
  // 진단 요청
  { pattern: /진단해|진단.*해줘|진단.*주세요/, type: "diagnosis", message: "진단은 의료 전문가만 할 수 있습니다. 소아과 또는 발달 전문 병원에 문의하세요." },
  { pattern: /자폐.*인가요|장애.*인가요|진단.*맞나|진단.*확인/, type: "diagnosis", message: "진단 확인은 의료 전문가의 영역입니다. 발달 전문 병원에 문의하세요." },
  { pattern: /자폐.*맞나|장애.*맞나|자폐.*인지|자폐.*아닌지/, type: "diagnosis", message: "진단 여부 판단은 의료 전문가만 할 수 있습니다." },
  { pattern: /이거.*맞나요.*진단|진단.*받았는데.*맞/, type: "diagnosis", message: "기존 진단의 재확인도 의료 전문가와 상의하세요." },
  // 의료 판단
  { pattern: /약물|처방|약.*용량|용량.*조절|복용|투약/, type: "medical", message: "약물 관련 상담은 소아과 전문의에게 문의하세요." },
  // 치료 결정
  { pattern: /치료.*중단|치료.*종결|치료.*그만|치료.*안받|그만두/, type: "treatment_decision", message: "치료 중단 결정은 담당 치료사와 직접 상의하세요." },
];

// ── 범위 초과 패턴 ──

const OUT_OF_SCOPE_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /삼킴\s*장애|연하\s*곤란|연하\s*장애|삼킴/, message: "삼킴 장애는 전문 의료기관의 직접 평가가 필요합니다." },
  { pattern: /속화|말\s*빠른|클러터링/, message: "속화(클러터링)는 유창성 전문가의 직접 평가가 필요합니다." },
];

export function checkSafety(userMessage: string): SafetyCheckResult {
  const n = normalize(userMessage);
  const raw = userMessage;

  // 위기 감지: regex로 동사 활용형까지 대응
  const isCrisis = CRISIS_PATTERNS.some((p) => p.test(n) || p.test(raw));
  if (isCrisis) {
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

  // 금지 요청 감지
  for (const { pattern, message } of PROHIBITION_PATTERNS) {
    if (pattern.test(n) || pattern.test(raw)) {
      return { isSafe: false, crisisDetected: false, message };
    }
  }

  // 범위 초과 감지
  for (const { pattern, message } of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(n) || pattern.test(raw)) {
      return { isSafe: false, crisisDetected: false, message };
    }
  }

  return { isSafe: true, crisisDetected: false };
}
