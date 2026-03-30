/**
 * Living Agent — 아동 자동 인식, 프로필 추출, 능동 제안.
 * 사용자 입력에서 아동 이름/나이/진단을 추출하여 프로필 매칭 또는 생성을 제안한다.
 */
import type { TherapyStudentProfile, DiagnosisCode, DiagnosisProfile } from "../model/therapyTypes";

// ── 진단 패턴 (한국어 → DiagnosisCode) ──

const DIAGNOSIS_PATTERNS: Array<{ pattern: RegExp; code: DiagnosisCode; offsetMonths: number }> = [
  { pattern: /ASD\s*(?:Level\s*|L)?3|자폐\s*3급|자폐\s*3수준/i, code: "ASD_L3", offsetMonths: -24 },
  { pattern: /ASD\s*(?:Level\s*|L)?2|자폐\s*2급|자폐\s*2수준/i, code: "ASD_L2", offsetMonths: -18 },
  { pattern: /ASD\s*(?:Level\s*|L)?1|자폐\s*1급|아스퍼거/i, code: "ASD_L1", offsetMonths: -12 },
  { pattern: /ADHD|주의력\s*결핍/i, code: "ADHD", offsetMonths: -6 },
  { pattern: /지적\s*장애\s*중도|지적\s*장애\s*중증/i, code: "ID_SEVERE", offsetMonths: -36 },
  { pattern: /지적\s*장애\s*중등도/i, code: "ID_MODERATE", offsetMonths: -30 },
  { pattern: /지적\s*장애(?:\s*경도)?/i, code: "ID_MILD", offsetMonths: -18 },
  { pattern: /언어\s*발달\s*지연|언어\s*지연/i, code: "LANG_DELAY", offsetMonths: -6 },
];

// ── 이름 추출 ──

const NAME_PATTERNS = [
  /([가-힣]{2,4})(?:이|가|는|을|를|에게|한테)\s/,
  /([가-힣]{2,4})\s*(?:아동|학생|아이)/,
  /([가-힣]{2,4})\s*(?:\d+세|\d+살)/,
];

// ── 나이 추출 ──

const AGE_PATTERNS = [
  /(\d+)\s*세/,
  /(\d+)\s*살/,
  /만\s*(\d+)\s*세/,
];

export interface ExtractedStudentInfo {
  name?: string;
  age?: number;
  diagnosis?: DiagnosisProfile;
}

/**
 * 사용자 입력에서 아동 정보를 추출한다.
 */
export function extractStudentInfo(text: string): ExtractedStudentInfo {
  const info: ExtractedStudentInfo = {};

  // 이름 추출
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      info.name = match[1];
      break;
    }
  }

  // 나이 추출
  for (const pattern of AGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      info.age = Number.parseInt(match[1], 10);
      break;
    }
  }

  // 진단 추출
  info.diagnosis = extractDiagnosis(text);

  return info;
}

/**
 * 텍스트에서 진단 코드를 추출한다.
 */
export function extractDiagnosis(text: string): DiagnosisProfile {
  const codes: DiagnosisCode[] = [];
  let minOffset = 0;

  for (const { pattern, code, offsetMonths } of DIAGNOSIS_PATTERNS) {
    if (pattern.test(text)) {
      codes.push(code);
      minOffset = Math.min(minOffset, offsetMonths);
    }
  }

  return {
    primary: codes[0],
    comorbidities: codes.slice(1),
    rawText: text,
  };
}

/**
 * 기능연령을 계산한다 (실제 나이 + 진단별 오프셋).
 */
export function calculateFunctionalAge(
  ageYears: number,
  diagnosis?: DiagnosisProfile,
): number {
  const ageMonths = ageYears * 12;
  if (!diagnosis?.primary) return ageMonths;

  const match = DIAGNOSIS_PATTERNS.find((p) => p.code === diagnosis.primary);
  const offset = match?.offsetMonths ?? 0;

  return Math.max(18, ageMonths + offset);
}

/**
 * 기존 학생 프로필 목록에서 이름으로 정확 매칭한다 (fuzzy 매칭 금지).
 */
export function findStudentsByName(
  name: string,
  profiles: TherapyStudentProfile[],
): TherapyStudentProfile[] {
  return profiles.filter((p) => {
    // profile_data에서 이름 필드 확인 — 구조에 따라 조정 필요
    const profileName = (p as unknown as Record<string, unknown>).name;
    return profileName === name;
  });
}

/**
 * 추출된 정보로 임시 프로필 객체를 생성한다 (저장하지 않음 — 확인 후 저장).
 */
export function buildTemporaryProfile(
  info: ExtractedStudentInfo,
  userId: string,
): Partial<TherapyStudentProfile> {
  return {
    userId,
    diagnosis: info.diagnosis ?? { comorbidities: [], rawText: "" },
    functionalAge: info.age ? calculateFunctionalAge(info.age, info.diagnosis) : 0,
    therapyGoals: [],
    articulationTargets: [],
    interests: [],
    sensoryTraits: [],
  };
}
