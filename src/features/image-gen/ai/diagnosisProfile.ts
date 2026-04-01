/**
 * 진단 추출 + 기능연령 계산
 * therapy/ai/therapyAgent.ts의 extractDiagnosis 로직을 경량화하여 이식.
 */
import type {
  DiagnosisProfile,
  VisualStyle,
  ColorSensitivity,
  BackgroundLevel,
} from "../model/types";

// ═══ 진단 패턴 (한국어 + 영문 코드) ═══

const DIAGNOSIS_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
  {
    pattern: /ASD\s*(?:L|Level\s*|레벨\s*)3|자폐\s*3급|중증\s*자폐/i,
    code: "ASD_L3",
  },
  { pattern: /ASD\s*(?:L|Level\s*|레벨\s*)2|자폐\s*2급/i, code: "ASD_L2" },
  {
    pattern: /ASD\s*(?:L|Level\s*|레벨\s*)1|자폐\s*1급|경증\s*자폐|아스퍼거/i,
    code: "ASD_L1",
  },
  { pattern: /ASD|자폐|자폐\s*스펙트럼/i, code: "ASD_L1" },
  { pattern: /ADHD|주의력\s*결핍|과잉\s*행동/i, code: "ADHD" },
  { pattern: /지적\s*장애\s*(?:중도|심도)|ID\s*severe/i, code: "ID_severe" },
  { pattern: /지적\s*장애\s*중등도|ID\s*moderate/i, code: "ID_moderate" },
  { pattern: /지적\s*장애|ID\s*mild|지적\s*장애\s*경도/i, code: "ID_mild" },
  { pattern: /다운\s*증후군|Down/i, code: "down" },
  { pattern: /언어\s*발달\s*지연|언어\s*지연/i, code: "language_delay" },
  { pattern: /뇌성\s*마비|CP/i, code: "CP" },
  { pattern: /발달\s*성\s*협응\s*장애|DCD/i, code: "DCD" },
  { pattern: /경계선\s*지능|경계\s*지능/i, code: "borderline_intellectual" },
  { pattern: /선택적\s*함묵|함묵증/i, code: "selective_mutism" },
  { pattern: /말더듬|유창성/i, code: "stuttering" },
  { pattern: /청각\s*장애|난청/i, code: "hearing_impaired" },
  { pattern: /구개열/i, code: "cleft_palate" },
  { pattern: /전반적\s*발달\s*지연/i, code: "global_developmental_delay" },
];

// ═══ 기능연령 보정 (개월 단위) ═══

const AGE_OFFSET: Record<string, number> = {
  ASD_L1: -12,
  ASD_L2: -18,
  ASD_L3: -24,
  ADHD: -6,
  ID_mild: -18,
  ID_moderate: -30,
  ID_severe: -36,
  down: -24,
  language_delay: -12,
  CP: -12,
  DCD: -6,
  borderline_intellectual: -12,
  global_developmental_delay: -18,
};

// ═══ 진단 → 시각 스타일 매핑 ═══

export interface VisualDefaults {
  style: VisualStyle;
  colorSensitivity: ColorSensitivity;
  backgroundLevel: BackgroundLevel;
  complexity: number; // 1-5
}

const VISUAL_DEFAULTS: Record<string, VisualDefaults> = {
  ASD_L3: {
    style: "pastel",
    colorSensitivity: "muted",
    backgroundLevel: "none",
    complexity: 1,
  },
  ASD_L2: {
    style: "pastel",
    colorSensitivity: "muted",
    backgroundLevel: "simple",
    complexity: 2,
  },
  ASD_L1: {
    style: "flat",
    colorSensitivity: "normal",
    backgroundLevel: "simple",
    complexity: 3,
  },
  ADHD: {
    style: "high_contrast",
    colorSensitivity: "high_contrast",
    backgroundLevel: "none",
    complexity: 3,
  },
  ID_severe: {
    style: "realistic",
    colorSensitivity: "normal",
    backgroundLevel: "none",
    complexity: 1,
  },
  ID_moderate: {
    style: "realistic",
    colorSensitivity: "normal",
    backgroundLevel: "none",
    complexity: 2,
  },
  ID_mild: {
    style: "flat",
    colorSensitivity: "normal",
    backgroundLevel: "simple",
    complexity: 3,
  },
  down: {
    style: "flat",
    colorSensitivity: "normal",
    backgroundLevel: "simple",
    complexity: 2,
  },
  language_delay: {
    style: "flat",
    colorSensitivity: "normal",
    backgroundLevel: "simple",
    complexity: 3,
  },
};

const DEFAULT_VISUAL: VisualDefaults = {
  style: "flat",
  colorSensitivity: "normal",
  backgroundLevel: "simple",
  complexity: 3,
};

/** 텍스트에서 진단 추출 */
export function extractDiagnosis(text: string): DiagnosisProfile {
  const codes: string[] = [];
  for (const { pattern, code } of DIAGNOSIS_PATTERNS) {
    if (pattern.test(text) && !codes.includes(code)) {
      codes.push(code);
    }
  }

  const primary = codes[0] ?? null;
  const comorbidities = codes.slice(1);

  return {
    primary,
    comorbidities,
    functionalAgeMonths: null, // 실제 나이와 합산은 호출자가
    adaptations: codes.flatMap((c) =>
      VISUAL_DEFAULTS[c]?.style ? [`${c} 시각 조절`] : [],
    ),
  };
}

/** 생활연령(년) + 진단 → 기능연령(개월) */
export function calcFunctionalAge(
  chronoYears: number,
  diagnosisCode: string | null,
): number {
  const chronoMonths = chronoYears * 12;
  const offset = diagnosisCode ? (AGE_OFFSET[diagnosisCode] ?? 0) : 0;
  return Math.max(18, chronoMonths + offset); // 최소 18개월
}

/** 진단 코드 → 시각 기본값 */
export function getVisualDefaults(
  diagnosisCode: string | null,
): VisualDefaults {
  if (!diagnosisCode) return DEFAULT_VISUAL;
  return VISUAL_DEFAULTS[diagnosisCode] ?? DEFAULT_VISUAL;
}
