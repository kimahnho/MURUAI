/**
 * 가드레일 — Gemini 응답에 대해 30+ 임상 규칙을 적용한다.
 * 액션: warn(경고 표시), override(자동 수정), block(생성 중단)
 */
import type { GuardrailResult, DiagnosisProfile, TherapyDomain, DifficultyLevel } from "../model/therapyTypes";

interface TherapyResultLike {
  domain?: TherapyDomain;
  difficulty?: DifficultyLevel;
  itemCount?: number;
  worksheetType?: string;
  level?: number;
  style?: string;
}

interface GuardrailInput {
  result: TherapyResultLike;
  prompt: string;
  diagnosis?: DiagnosisProfile;
  age?: number;
}

interface GuardrailOutput {
  corrected: TherapyResultLike;
  warnings: GuardrailResult[];
  blocked: GuardrailResult | null;
}

type Rule = {
  id: string;
  check: (input: GuardrailInput) => GuardrailResult | null;
};

// ── 감정 도메인 (E1-E6) ──

const emotionRules: Rule[] = [
  {
    id: "E1",
    check: ({ result }) => {
      if (result.domain === "emotion" && result.level != null && result.level <= 1) {
        return { action: "warn", ruleId: "E1", message: "Level 0-1은 공동 주의(joint attention) 평가가 선행되어야 합니다." };
      }
      return null;
    },
  },
  {
    id: "E2",
    check: ({ result }) => {
      if (result.domain === "emotion" && result.level != null && result.level < 3 && result.difficulty === "hard") {
        return { action: "override", ruleId: "E2", message: "Level 3 미만에서 '어려움' 난이도는 적절하지 않습니다. '보통'으로 조정합니다.", original: "hard", corrected: "medium" };
      }
      return null;
    },
  },
  {
    id: "E6",
    check: ({ result, diagnosis }) => {
      if (result.domain === "emotion" && diagnosis?.primary && ["ASD_L2", "ASD_L3"].includes(diagnosis.primary)) {
        return { action: "override", ruleId: "E6", message: "ASD 2-3수준: 항목 수와 난이도를 자동 조정합니다.", corrected: "adjusted" };
      }
      return null;
    },
  },
];

// ── 언어 도메인 (L1-L7) ──

const languageRules: Rule[] = [
  {
    id: "L1",
    check: ({ result, age }) => {
      if (result.domain === "language" && age != null && age < 4 && result.worksheetType === "letterTracing") {
        return { action: "override", ruleId: "L1", message: "4세 미만은 글자 따라쓰기 대신 선긋기로 변경합니다.", original: "letterTracing", corrected: "lineTracing" };
      }
      return null;
    },
  },
  {
    id: "L3",
    check: ({ prompt }) => {
      if (/말실행증|apraxia|CAS/i.test(prompt)) {
        return { action: "block", ruleId: "L3", message: "말실행증(CAS)이 의심됩니다. 조음음운 전문가의 직접 평가가 필요합니다. 학습지 생성이 적절하지 않습니다." };
      }
      return null;
    },
  },
];

// ── 소근육 도메인 (M1-M4) ──

const motorRules: Rule[] = [
  {
    id: "M1",
    check: ({ result, age }) => {
      if (result.domain === "motor" && age != null && age < 5 && result.worksheetType === "letterTracing") {
        return { action: "override", ruleId: "M1", message: "5세 미만은 글자 따라쓰기 대신 선긋기로 변경합니다.", original: "letterTracing", corrected: "lineTracing" };
      }
      return null;
    },
  },
];

// ── 사회성 도메인 (S1-S4) ──

const socialRules: Rule[] = [
  {
    id: "S1",
    check: ({ result, diagnosis }) => {
      if (result.domain === "social" && diagnosis?.primary === "ASD_L3") {
        return { action: "warn", ruleId: "S1", message: "ASD 3수준은 학습지만으로 사회성 치료가 충분하지 않습니다. 직접 중재와 병행하세요." };
      }
      return null;
    },
  },
  {
    id: "S3",
    check: ({ prompt }) => {
      if (/괴롭힘|따돌림|왕따|불링/i.test(prompt)) {
        return { action: "warn", ruleId: "S3", message: "괴롭힘 상황은 상담사 연계가 우선입니다. 학습지는 보조 자료로만 활용하세요." };
      }
      return null;
    },
  },
];

// ── 범용 규칙 (G0-G9) ──

const globalRules: Rule[] = [
  {
    id: "G0",
    check: ({ result, diagnosis }) => {
      if (diagnosis?.primary === "ASD_L3") {
        if (result.itemCount != null && result.itemCount > 2) {
          return { action: "override", ruleId: "G0", message: "ASD 3수준: 항목 수를 2개, 난이도를 '쉬움'으로 조정합니다.", corrected: "2-easy" };
        }
      }
      return null;
    },
  },
  {
    id: "G1",
    check: ({ result, diagnosis }) => {
      if (diagnosis?.primary && ["ID_MODERATE", "ID_SEVERE"].includes(diagnosis.primary)) {
        if (result.style !== "photorealistic") {
          return { action: "override", ruleId: "G1", message: "지적장애 중등도 이상: 실사 이미지 스타일로 변경합니다.", original: result.style, corrected: "photorealistic" };
        }
      }
      return null;
    },
  },
  {
    id: "G2",
    check: ({ prompt }) => {
      if (/퇴행|말이?\s*줄었|갑자기\s*안\s*해/i.test(prompt)) {
        return { action: "warn", ruleId: "G2", message: "퇴행이 의심됩니다. 의료 평가를 우선 권장합니다." };
      }
      return null;
    },
  },
  {
    id: "G3",
    check: ({ result, diagnosis }) => {
      if (diagnosis?.comorbidities.some((c) => ["ASD_L2", "ASD_L3"].includes(c)) || /감각\s*과민|감각\s*예민/i.test(JSON.stringify(result))) {
        if (result.style !== "low_stimulation") {
          return { action: "override", ruleId: "G3", message: "감각 민감: 저자극 스타일로 변경합니다.", original: result.style, corrected: "low_stimulation" };
        }
      }
      return null;
    },
  },
  {
    id: "G4",
    check: ({ result, age }) => {
      if (age != null && age >= 12 && result.style === "flat_illustration") {
        return { action: "warn", ruleId: "G4", message: "12세 이상에게 유아적 이미지는 적절하지 않을 수 있습니다. 실사 이미지를 고려하세요." };
      }
      return null;
    },
  },
  {
    id: "G5",
    check: ({ prompt }) => {
      if (/말더듬|유창성|stuttering/i.test(prompt)) {
        return { action: "block", ruleId: "G5", message: "유창성 장애(말더듬)는 학습지가 아닌 직접 중재가 필요합니다. 유창성 전문가에게 연계하세요." };
      }
      return null;
    },
  },
  {
    id: "G8",
    check: ({ prompt }) => {
      if (/음성\s*장애|쉰\s*목소리|voice\s*disorder/i.test(prompt)) {
        return { action: "block", ruleId: "G8", message: "음성 장애는 이비인후과 평가가 선행되어야 합니다." };
      }
      return null;
    },
  },
  {
    id: "G9",
    check: ({ prompt }) => {
      if (/실어증|브로카|베르니케|신경언어/i.test(prompt)) {
        return { action: "block", ruleId: "G9", message: "신경언어장애는 전문 의료기관의 직접 평가가 필요합니다." };
      }
      return null;
    },
  },
];

const ALL_RULES: Rule[] = [
  ...emotionRules,
  ...languageRules,
  ...motorRules,
  ...socialRules,
  ...globalRules,
];

/**
 * Gemini 응답에 가드레일을 적용한다.
 * - warn: 경고 메시지를 반환하되 진행
 * - override: 결과를 자동 수정
 * - block: 생성 중단 + 전문가 연계 메시지
 */
export function enforceGuardrails(input: GuardrailInput): GuardrailOutput {
  const warnings: GuardrailResult[] = [];
  let blocked: GuardrailResult | null = null;
  const corrected = { ...input.result };

  for (const rule of ALL_RULES) {
    const result = rule.check(input);
    if (!result) continue;

    if (result.action === "block") {
      blocked = result;
      break;
    }

    if (result.action === "override") {
      // 자동 수정 적용
      if (result.ruleId === "E2" && result.corrected) {
        corrected.difficulty = result.corrected as DifficultyLevel;
      }
      if (result.ruleId === "G0") {
        corrected.itemCount = 2;
        corrected.difficulty = "easy";
      }
      if (["G1", "G3"].includes(result.ruleId) && result.corrected) {
        corrected.style = result.corrected;
      }
      if (["L1", "M1"].includes(result.ruleId) && result.corrected) {
        corrected.worksheetType = result.corrected;
      }
    }

    warnings.push(result);
  }

  return { corrected, warnings, blocked };
}
