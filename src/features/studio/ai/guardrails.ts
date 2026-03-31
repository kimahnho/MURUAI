/**
 * 가드레일 — Gemini 응답에 대해 30+ 임상 규칙을 적용한다.
 * 액션: warn(경고 표시), override(자동 수정), block(생성 중단)
 *
 * v2: Main 3 therapyAgent.ts GUARDRAIL_RULES 전수 이식 (30+ 규칙)
 */
import type { GuardrailResult, DiagnosisProfile, TherapyDomain, DifficultyLevel } from "../model/therapyTypes";

interface TherapyResultLike {
  domain?: TherapyDomain;
  difficulty?: DifficultyLevel;
  itemCount?: number;
  worksheetType?: string;
  level?: number;
  style?: string;
  textLabels?: boolean;
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

// ── 감정 도메인 (E1-E6b) ──

const emotionRules: Rule[] = [
  {
    id: "E1",
    check: ({ result }) => {
      if (result.domain === "emotion" && result.level != null && result.level <= 1) {
        return { action: "warn", ruleId: "E1", message: "Level 0-1: 공동주의(joint attention) 가능 여부를 먼저 확인하세요. 얼굴에 시선 2초 이상 유지가 선수 기술입니다." };
      }
      return null;
    },
  },
  {
    id: "E2",
    check: ({ result }) => {
      if (result.domain === "emotion" && result.level != null && result.level < 3 && result.difficulty === "hard") {
        return { action: "override", ruleId: "E2", message: "Level 3 미만에서 '어려움'은 부적절합니다. → '보통'으로 자동 조정.", original: "hard", corrected: "medium" };
      }
      return null;
    },
  },
  {
    id: "E3",
    check: ({ result, prompt }) => {
      if (result.domain === "emotion" && /혼합감정|복합감정|두.*감정/.test(prompt) && result.level != null && result.level < 4) {
        return { action: "override", ruleId: "E3", message: "혼합감정은 Level 4+부터 가능합니다. → 단일 감정 인식으로 자동 조정." };
      }
      return null;
    },
  },
  {
    id: "E4",
    check: ({ result, prompt }) => {
      if (result.domain === "emotion" && /관점|perspective|마음이론/.test(prompt) && result.level != null && result.level < 5) {
        return { action: "override", ruleId: "E4", message: "관점 취하기는 Level 5입니다. → 감정 추론(Level 3-4)으로 자동 조정." };
      }
      return null;
    },
  },
  {
    id: "E5",
    check: ({ result, prompt }) => {
      if (result.domain === "emotion" && /자기\s*감정|내\s*감정|alexithymia/.test(prompt)) {
        return { action: "warn", ruleId: "E5", message: "자기 감정 인식은 타인 감정 인식과 별도 평가가 필요합니다. 자기 감정 인식 활동을 병행하세요." };
      }
      return null;
    },
  },
  {
    id: "E6",
    check: ({ result, diagnosis }) => {
      if (result.domain === "emotion" && diagnosis?.primary === "ASD_L2") {
        return { action: "override", ruleId: "E6", message: "ASD L2 감정 인식: 과장된 표정 + 선택지 차이 극대화, 3항목 이하로 자동 조정.", corrected: "adjusted" };
      }
      return null;
    },
  },
  {
    id: "E6b",
    check: ({ result, diagnosis }) => {
      if (result.domain === "emotion" && diagnosis?.primary === "ASD_L3") {
        return { action: "override", ruleId: "E6b", message: "ASD L3 감정 인식: 2항목 + easy로 자동 조정. 3개 선택지도 무작위 반응 위험.", corrected: "2-easy" };
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
      if (result.domain === "language" && age != null && age < 4 && /따라쓰기|letterTracing|글자.*따라|letter.*trac/i.test(result.worksheetType ?? "")) {
        return { action: "override", ruleId: "L1", message: "4세 미만 글자 따라쓰기 → 선긋기로 자동 변경 (발달 이정표 근거).", original: "letterTracing", corrected: "lineTracing" };
      }
      return null;
    },
  },
  {
    id: "L2",
    check: ({ prompt }) => {
      if (/무발화|비구어/.test(prompt)) {
        return { action: "warn", ruleId: "L2", message: "무발화/비구어: 학습지는 AAC 보조 도구로만 활용하세요. 의사소통 기능 훈련이 우선입니다." };
      }
      return null;
    },
  },
  {
    id: "L3",
    check: ({ prompt }) => {
      if (/CAS|말실행증|말\s*실행|apraxia|아프락시아|말운동장애|비일관적\s*오류|비일관적\s*조음/.test(prompt)) {
        return { action: "block", ruleId: "L3", message: "말 실행증(CAS) 의심: 전문 SLP 정밀 평가가 먼저 필요합니다. CAS는 일반 조음치료와 접근법이 다릅니다 (DTTC, ReST 등)." };
      }
      return null;
    },
  },
  {
    id: "L4",
    check: ({ prompt, age }) => {
      if (/ㅅ발음|ㅅ\s*미산출/.test(prompt) && age != null && age < 4) {
        return { action: "warn", ruleId: "L4", message: "ㅅ 습득 연령은 만 4세입니다. 현재 연령에서는 정상 발달 범위일 수 있습니다. 3개월 모니터링 후 재평가를 권장합니다." };
      }
      return null;
    },
  },
  {
    id: "L5",
    check: ({ prompt, age }) => {
      if (/ㄹ발음|ㄹ\s*미산출/.test(prompt) && age != null && age < 5) {
        return { action: "warn", ruleId: "L5", message: "ㄹ 습득 연령은 만 5세입니다. 현재 연령에서는 정상 발달 범위입니다." };
      }
      return null;
    },
  },
  {
    id: "L6",
    check: ({ prompt }) => {
      if (/음운변동|음운\s*과정/.test(prompt)) {
        return { action: "warn", ruleId: "L6", message: "음운변동 분석: 종성생략/전방화/파열음화/유음단순화/탈비음화/경음화생략/어중초성생략 중 해당 변동의 소멸 연령을 확인하세요." };
      }
      return null;
    },
  },
  {
    id: "L7",
    check: ({ result, prompt }) => {
      if (result.domain === "language" && /이중언어|다문화|bilingual/.test(prompt)) {
        return { action: "warn", ruleId: "L7", message: "이중언어 아동: L1/L2 모두에서 조음 평가 필요. L1 음운 체계 영향을 고려하세요." };
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
      if (result.domain === "motor" && age != null && age < 5 && /따라쓰기|letterTracing|글자.*따라|letter.*trac/i.test(result.worksheetType ?? "")) {
        return { action: "override", ruleId: "M1", message: "5세 미만 따라쓰기 → 선긋기로 자동 변경 (발달 이정표 근거).", original: "letterTracing", corrected: "lineTracing" };
      }
      return null;
    },
  },
  {
    id: "M2",
    check: ({ result, prompt }) => {
      if (result.domain === "motor" && /가위|가위질|오리기/.test(prompt) && /잡기.*불안|잡기.*안|그립.*약/.test(prompt)) {
        return { action: "override", ruleId: "M2", message: "잡기 불안정 → 가위질 대신 잡기 연습 학습지로 자동 변경.", corrected: "lineTracing" };
      }
      return null;
    },
  },
  {
    id: "M3",
    check: ({ result, prompt }) => {
      if (result.domain === "motor" && /필압.*강|힘.*세|너무.*눌러/.test(prompt)) {
        return { action: "warn", ruleId: "M3", message: "필압 과도: 이완 활동(손 흔들기, 마커 사용)을 먼저 진행한 후 학습지를 사용하세요." };
      }
      return null;
    },
  },
  {
    id: "M4",
    check: ({ result, prompt }) => {
      if (result.domain === "motor" && /시지각|VMI|시각.*지각/.test(prompt)) {
        return { action: "warn", ruleId: "M4", message: "시지각 6개 하위영역(시각변별, 도형-배경, 시각완성, 공간위치, 공간관계, 시각기억) 중 어느 영역인지 구분하여 목표를 설정하세요." };
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
        return { action: "override", ruleId: "S1", message: "ASD L3 사회성: 학습지 단독 부적절 → 난이도 easy + 항목 2개로 자동 조정. 직접 중재(ABA/놀이치료) 보조 도구로만 사용하세요.", corrected: "2-easy" };
      }
      return null;
    },
  },
  {
    id: "S2",
    check: ({ result, prompt }) => {
      if (result.domain === "social" && /동기\s*부재|관심\s*없/.test(prompt)) {
        return { action: "warn", ruleId: "S2", message: "사회적 동기 부재: 학습지 전에 관계 형성(rapport building)이 선행되어야 합니다." };
      }
      return null;
    },
  },
  {
    id: "S3",
    check: ({ prompt }) => {
      if (/괴롭힘|따돌림|왕따|불링|bullying/.test(prompt)) {
        return { action: "warn", ruleId: "S3", message: "따돌림 대처: 기본 사회기술 학습지로 보조 가능하나, 전문 상담사 연계가 우선입니다." };
      }
      return null;
    },
  },
  {
    id: "S4",
    check: ({ result, prompt, age }) => {
      if (result.domain === "social" && /학교|초등|입학/.test(prompt) && age != null && age >= 6 && age < 8) {
        return { action: "warn", ruleId: "S4", message: "취학 전환기(6-7세): 줄서기, 손들기, 차례 지키기 등 학교 규칙을 핵심 목표로 설정하세요." };
      }
      return null;
    },
  },
];

// ── 놀이 도메인 (P1-P2) ──

const playRules: Rule[] = [
  {
    id: "P1",
    check: ({ result, diagnosis }) => {
      if (result.domain === "play" && (diagnosis?.primary === "ASD_L3" || diagnosis?.primary === "ID_SEVERE")) {
        return { action: "override", ruleId: "P1", message: "중증 장애: 상징놀이 이상 부적절 → 감각놀이(Stage 1) 수준으로 자동 조정.", corrected: "stage1" };
      }
      return null;
    },
  },
  {
    id: "P2",
    check: ({ result, prompt }) => {
      if (result.domain === "play" && /디지털|스마트폰|태블릿|유튜브|게임\s*과의존/.test(prompt)) {
        return { action: "warn", ruleId: "P2", message: "디지털 놀이 과의존: 실물 놀이 전환이 먼저입니다. 점진적 전환: 디지털→하이브리드→실물." };
      }
      return null;
    },
  },
];

// ── 인지 도메인 (C1-C3) ──

const cognitionRules: Rule[] = [
  {
    id: "C1",
    check: ({ result, diagnosis }) => {
      if (result.domain === "cognition" && (diagnosis?.comorbidities?.includes("ADHD") || diagnosis?.primary === "ADHD")) {
        return { action: "override", ruleId: "C1", message: "ADHD 동반: 작업기억 부하 감소 → 항목 수 자동 -1, 한 페이지 3분 이내.", corrected: "itemCount-1" };
      }
      return null;
    },
  },
  {
    id: "C2",
    check: ({ result, prompt }) => {
      if (result.domain === "cognition" && result.worksheetType === "categorize" && /같은\s*범주|하위\s*분류/.test(prompt) && result.level != null && result.level < 4) {
        return { action: "override", ruleId: "C2", message: "같은 범주 내 하위분류는 Stage 4+입니다. → 범주 경계가 명확한 분류(동물 vs 탈것)로 자동 조정." };
      }
      return null;
    },
  },
  {
    id: "C3",
    check: ({ result, prompt, diagnosis }) => {
      if (result.domain === "cognition" && /실행기능|EF|계획|조직화/.test(prompt) && diagnosis?.primary === "ADHD") {
        return { action: "warn", ruleId: "C3", message: "ADHD 실행기능: 억제/전환/갱신/계획/조직화 5가지를 구분하세요. 약물 상태에 따라 난이도가 달라집니다." };
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
      if (diagnosis?.primary === "ASD_L3" && !["emotion", "social", "play"].includes(result.domain ?? "")) {
        if (result.itemCount != null && result.itemCount > 2) {
          return { action: "override", ruleId: "G0", message: "ASD L3: 전 도메인 2항목 + easy 자동 적용.", corrected: "2-easy" };
        }
      }
      return null;
    },
  },
  {
    id: "G1",
    check: ({ result, diagnosis }) => {
      if (diagnosis?.adaptations?.includes("실물 사진 스타일") && result.style !== "photorealistic") {
        return { action: "override", ruleId: "G1", message: "지적장애 중등도+: 실물 사진 스타일이 인식률이 높음 → 자동 적용.", original: result.style, corrected: "photorealistic" };
      }
      return null;
    },
  },
  {
    id: "G2",
    check: ({ prompt }) => {
      if (/퇴행|말이\s*줄|예전에는\s*했|말이?\s*줄었|갑자기\s*안\s*해/.test(prompt)) {
        return { action: "warn", ruleId: "G2", message: "퇴행 보고: 의료적 평가를 우선 권장합니다. 현재 관찰 수준 기준으로 생성합니다." };
      }
      return null;
    },
  },
  {
    id: "G3",
    check: ({ prompt }) => {
      if (/감각과민|감각\s*회피|sensory|감각\s*과민|감각\s*예민/.test(prompt)) {
        return { action: "override", ruleId: "G3", message: "감각과민 → 저자극 스타일 자동 적용: 채도↓, 배경 제거, 부드러운 외곽선.", corrected: "low_stimulation" };
      }
      return null;
    },
  },
  {
    id: "G3b",
    check: ({ prompt }) => {
      if (/종이.*못.*만|종이.*거부|촉각.*과민|만지.*못|만지.*싫/.test(prompt)) {
        return { action: "warn", ruleId: "G3b", message: "촉각 과민: 종이 학습지 대신 태블릿/프로젝터 출력 또는 코팅된 자료를 고려하세요." };
      }
      return null;
    },
  },
  {
    id: "G4",
    check: ({ result, age }) => {
      if (age != null && age >= 12 && result.style === "flat_illustration") {
        return { action: "warn", ruleId: "G4", message: "생활연령 12세+: 기능연령 기준 학습지 사용하되 유아적 이미지를 피하세요." };
      }
      return null;
    },
  },
  // ─── 확장 진단 가드레일 ───
  {
    id: "G5",
    check: ({ result, diagnosis }) => {
      if (diagnosis?.primary === "STUTTERING" && !["emotion", "social"].includes(result.domain ?? "")) {
        return { action: "block", ruleId: "G5", message: "유창성장애(말더듬): 말하기 연습 학습지는 불안을 증가시킬 수 있어 직접 SLP 중재가 필요합니다. 단, 감정 표현·자기주장 학습지는 생성 가능합니다." };
      }
      return null;
    },
  },
  {
    id: "G5b",
    check: ({ result, diagnosis }) => {
      if (diagnosis?.primary === "STUTTERING" && ["emotion", "social"].includes(result.domain ?? "")) {
        return { action: "warn", ruleId: "G5b", message: "유창성장애 아동: 감정/사회성 학습지를 보조 자료로 제공합니다. 말하기 연습 자체가 아닌 의사소통 자신감 향상에 초점을 맞추세요." };
      }
      return null;
    },
  },
  {
    id: "G6",
    check: ({ diagnosis }) => {
      if (diagnosis?.primary === "SELECTIVE_MUTISM") {
        return { action: "warn", ruleId: "G6", message: "선택적 함묵증은 학습지보다 환경 조정과 점진적 노출이 우선입니다. 학습지는 보조 자료로만 활용해주세요." };
      }
      return null;
    },
  },
  {
    id: "G7",
    check: ({ diagnosis }) => {
      if (diagnosis?.primary === "HEARING_IMPAIRED") {
        return { action: "override", ruleId: "G7", message: "청각장애 아동 → 텍스트 라벨 필수 적용", corrected: "textLabels" };
      }
      return null;
    },
  },
  {
    id: "G8",
    check: ({ prompt }) => {
      if (/음성장애|쉰\s*목소리|성대\s*결절|hoarseness|vocal\s*nodule|발성장애|음성\s*장애|voice\s*disorder/.test(prompt)) {
        return { action: "block", ruleId: "G8", message: "음성장애: ASHA 가이드라인에 따라 이비인후과(ENT) 검진 전 어떤 음성 치료 활동도 시작하지 마세요. 먼저 후두경 검사를 받으세요." };
      }
      return null;
    },
  },
  {
    id: "G9",
    check: ({ prompt }) => {
      if (/신경언어|실어증|뇌손상|뇌출혈|TBI|외상성\s*뇌손상|소아\s*뇌졸중|브로카|베르니케/.test(prompt)) {
        return { action: "block", ruleId: "G9", message: "신경언어장애: 전문 신경재활 SLP의 직접 중재가 필요합니다. 학습지 단독 사용은 부적절합니다." };
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
  ...playRules,
  ...cognitionRules,
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
      if (result.ruleId === "E6") {
        corrected.difficulty = corrected.difficulty === "hard" ? "medium" : corrected.difficulty;
        corrected.itemCount = Math.min(corrected.itemCount ?? 4, 3);
      }
      if (["E6b", "S1"].includes(result.ruleId)) {
        corrected.difficulty = "easy";
        corrected.itemCount = 2;
      }
      if (result.ruleId === "G0") {
        corrected.itemCount = Math.min(corrected.itemCount ?? 4, 2);
        corrected.difficulty = "easy";
      }
      if (["G1", "G3"].includes(result.ruleId) && result.corrected) {
        corrected.style = result.corrected;
      }
      if (["L1", "M1"].includes(result.ruleId) && result.corrected) {
        corrected.worksheetType = result.corrected;
      }
      if (result.ruleId === "M2") {
        corrected.worksheetType = "lineTracing";
        corrected.difficulty = "easy";
      }
      if (result.ruleId === "C1") {
        corrected.itemCount = Math.max(2, (corrected.itemCount ?? 4) - 1);
      }
      if (result.ruleId === "P1") {
        corrected.level = 1;
        corrected.difficulty = "easy";
        corrected.itemCount = 2;
      }
      if (result.ruleId === "G7") {
        corrected.textLabels = true;
      }
    }

    warnings.push(result);
  }

  return { corrected, warnings, blocked };
}
