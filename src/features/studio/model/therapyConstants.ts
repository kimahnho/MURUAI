/**
 * Studio(치료 AI) 기능 상수 정의.
 */
import type { TherapyDomain, DiagnosisCode } from "./therapyTypes";

// ── 도메인 감지 키워드 ──

export const DOMAIN_KEYWORDS: Record<TherapyDomain, string[]> = {
  emotion: ["감정", "표정", "감정추론", "감정인식", "감정표현", "기분"],
  language: ["조음", "발음", "어휘", "문장", "언어", "말", "의사소통", "자음", "모음"],
  cognition: ["인지", "사물인지", "분류", "변별", "패턴", "순서", "매칭"],
  motor: ["선긋기", "소근육", "따라그리기", "가위질", "색칠", "쓰기"],
  social: ["사회성", "친구", "차례", "규칙", "인사", "대화"],
  play: ["놀이", "블록", "역할놀이", "구성놀이", "상상놀이"],
};

// ── 진단 표시 라벨 ──

export const DIAGNOSIS_LABELS: Record<DiagnosisCode, string> = {
  ASD_L1: "자폐 스펙트럼 1수준",
  ASD_L2: "자폐 스펙트럼 2수준",
  ASD_L3: "자폐 스펙트럼 3수준",
  ID_MILD: "지적장애 (경도)",
  ID_MODERATE: "지적장애 (중등도)",
  ID_SEVERE: "지적장애 (중도)",
  LANG_DELAY: "언어 발달 지연",
  ADHD: "ADHD",
  OTHER: "기타",
};

// ── 위기 키워드 (safety check) ──

export const CRISIS_KEYWORDS = [
  "자해", "머리박기", "자살", "학대", "피", "죽고싶",
  "때리", "물어뜯", "할퀴", "목졸",
];

export const CRISIS_HOTLINES = [
  { name: "자살예방상담전화", number: "1393" },
  { name: "정신건강위기상담전화", number: "1577-0199" },
  { name: "학교폭력신고", number: "117" },
  { name: "아동학대신고", number: "112" },
];

// ── 파이프라인 설정 ──

export const GEMINI_TIMEOUT_MS = 30_000;
export const MAX_RETRY_COUNT = 3;
export const MAX_MESSAGES_CONTEXT = 15;
export const MAX_MESSAGE_CONTENT_LENGTH = 300;
export const MAX_SESSIONS_PER_USER = 500;
export const MAX_MESSAGES_PER_SESSION = 50;

// ── 학습지 ──

export const DEFAULT_SHEET_COUNT = 5;

export const WORKSHEET_TYPE_LABELS: Record<string, string> = {
  findSame: "같은 것 찾기",
  matchPairs: "짝 맞추기",
  spotDifference: "틀린 그림 찾기",
  categorize: "카테고리 분류",
  emotionInference: "감정 추론",
  lineConnect: "선 연결하기",
  sequencing: "순서 맞추기",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};
