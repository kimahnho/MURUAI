/**
 * PII 익명화 — Gemini API 호출 전 개인 식별 정보를 제거한다.
 * Google이 보는 정보: 나이, 진단 코드, 도메인, 난이도, 주제, 활동 유형
 * Google이 보지 않는 정보: 아동 이름, 생년월일, 센터명, 치료사명, 연락처
 */

// 생년월일 패턴
const DOB_PATTERNS = [
  /\d{4}[-./]\d{1,2}[-./]\d{1,2}/g, // 2020-01-15
  /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/g, // 2020년 1월 15일
];

// 전화번호 패턴
const PHONE_PATTERNS = [
  /01[016789]-?\d{3,4}-?\d{4}/g,
  /0\d{1,2}-?\d{3,4}-?\d{4}/g,
];

// 이메일 패턴
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/g;

interface AnonymizeResult {
  text: string;
  removedNames: string[];
}

/**
 * 텍스트에서 PII를 제거한다.
 * - 한국 이름 → "[아동]" 또는 "[치료사]"
 * - 생년월일 → "[생년월일]"
 * - 전화번호 → "[연락처]"
 * - 이메일 → "[이메일]"
 *
 * studentName이 지정되면 해당 이름을 정확히 매칭하여 치환한다.
 */
export function anonymizeForLLM(
  text: string,
  studentName?: string,
  therapistName?: string,
): AnonymizeResult {
  let result = text;
  const removedNames: string[] = [];

  // 특정 아동 이름 치환 (정확 매칭)
  if (studentName) {
    const nameRegex = new RegExp(escapeRegex(studentName), "g");
    if (nameRegex.test(result)) {
      removedNames.push(studentName);
      result = result.replace(nameRegex, "[아동]");
    }
  }

  // 특정 치료사 이름 치환
  if (therapistName) {
    const nameRegex = new RegExp(escapeRegex(therapistName), "g");
    result = result.replace(nameRegex, "[치료사]");
  }

  // 생년월일 치환
  for (const pattern of DOB_PATTERNS) {
    result = result.replace(pattern, "[생년월일]");
  }

  // 전화번호 치환
  for (const pattern of PHONE_PATTERNS) {
    result = result.replace(pattern, "[연락처]");
  }

  // 이메일 치환
  result = result.replace(EMAIL_PATTERN, "[이메일]");

  return { text: result, removedNames };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
