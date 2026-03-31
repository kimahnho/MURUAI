/**
 * Living Agent — 아동 자동 인식, 프로필 추출, 능동 제안.
 * 사용자 입력에서 아동 이름/나이/진단을 추출하여 프로필 매칭 또는 생성을 제안한다.
 */
import type { TherapyStudentProfile, DiagnosisCode, DiagnosisProfile } from "../model/therapyTypes";
import { DIAGNOSIS_ADAPTATIONS } from "../model/therapyConstants";

// ── 진단 패턴 (한국어 → DiagnosisCode) — Main 3 17종 ──

const DIAGNOSIS_PATTERNS: Array<{ pattern: RegExp; code: DiagnosisCode; offsetMonths: number }> = [
  { pattern: /ASD\s*(?:Level\s*|L)3|자폐\s*3급|자폐\s*중증/i, code: "ASD_L3", offsetMonths: -24 },
  { pattern: /ASD\s*(?:Level\s*|L)2|자폐\s*2급/i, code: "ASD_L2", offsetMonths: -18 },
  { pattern: /ASD\s*(?:Level\s*|L)1|자폐\s*1급|아스퍼거|고기능\s*ASD|고기능\s*자폐/i, code: "ASD_L1", offsetMonths: -12 },
  { pattern: /ADHD|주의력결핍|과잉행동/i, code: "ADHD", offsetMonths: -6 },
  { pattern: /지적장애\s*중도|지적장애\s*중증|지적장애\s*심도|ID\s*severe/i, code: "ID_severe", offsetMonths: -36 },
  { pattern: /지적장애\s*중등도|ID\s*moderate/i, code: "ID_moderate", offsetMonths: -30 },
  { pattern: /지적장애\s*경도|지적장애|ID\s*mild/i, code: "ID_mild", offsetMonths: -18 },
  { pattern: /다운증후군|다운/i, code: "down", offsetMonths: -18 },
  { pattern: /언어발달지연|언어지연/i, code: "language_delay", offsetMonths: -6 },
  { pattern: /뇌성마비|CP/i, code: "CP", offsetMonths: -24 },
  { pattern: /발달성\s*협응장애|DCD/i, code: "DCD", offsetMonths: -12 },
  // ─── 확장 진단 패턴 ───
  { pattern: /경계선\s*지능|경계\s*지능|borderline\s*intellectual/i, code: "borderline_intellectual", offsetMonths: -12 },
  { pattern: /선택적\s*함묵|함묵증|selective\s*mutism/i, code: "selective_mutism", offsetMonths: -6 },
  { pattern: /말더듬|유창성\s*장애|stuttering/i, code: "stuttering", offsetMonths: 0 },
  { pattern: /청각장애|난청|hearing\s*impair/i, code: "hearing_impaired", offsetMonths: -12 },
  { pattern: /구개열|구순열|cleft/i, code: "cleft_palate", offsetMonths: -6 },
  { pattern: /전반적\s*발달\s*지연|GDD|global\s*developmental/i, code: "global_developmental_delay", offsetMonths: -18 },
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
  let totalOffset = 0;

  for (const { pattern, code, offsetMonths } of DIAGNOSIS_PATTERNS) {
    if (pattern.test(text)) {
      codes.push(code);
      totalOffset = Math.min(totalOffset, offsetMonths); // 가장 심한 보정 적용
    }
  }

  // 진단별 적응 전략 수집 + 중복 제거
  const adaptations = [...new Set(codes.flatMap((c) => DIAGNOSIS_ADAPTATIONS[c] ?? []))];

  return {
    primary: codes[0],
    comorbidities: codes.slice(1),
    functionalAgeOffset: totalOffset,
    adaptations,
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

  // DiagnosisProfile에 이미 계산된 functionalAgeOffset 사용 (모든 매칭 코드의 min)
  const offset = diagnosis.functionalAgeOffset ?? 0;

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
    diagnosis: info.diagnosis ?? { comorbidities: [], functionalAgeOffset: 0, adaptations: [], rawText: "" },
    functionalAge: info.age ? calculateFunctionalAge(info.age, info.diagnosis) : 0,
    therapyGoals: [],
    articulationTargets: [],
    interests: [],
    sensoryTraits: [],
  };
}
