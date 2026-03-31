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
  DOWN: "다운증후군",
  CP: "뇌성마비",
  DCD: "발달성 협응장애",
  BORDERLINE_INTELLECTUAL: "경계선 지능",
  SELECTIVE_MUTISM: "선택적 함묵증",
  STUTTERING: "유창성장애 (말더듬)",
  HEARING_IMPAIRED: "청각장애",
  CLEFT_PALATE: "구개열/구순열",
  GLOBAL_DEVELOPMENTAL_DELAY: "전반적 발달 지연",
  OTHER: "기타",
};

// ── 도메인 우선순위 (동점 해소용) ──

export const DOMAIN_PRIORITY: TherapyDomain[] = [
  "language",
  "cognition",
  "emotion",
  "motor",
  "social",
  "play",
];

// ── 진단별 적응 전략 ──

export const DIAGNOSIS_ADAPTATIONS: Partial<Record<DiagnosisCode, string[]>> = {
  ASD_L1: ["시각적 구조화", "명확한 지시"],
  ASD_L2: ["저자극 스타일", "시각적 구조화", "선택지 차이 극대화"],
  ASD_L3: ["저자극 스타일", "감각놀이 수준", "2항목 제한"],
  ID_MILD: ["구체적 사물", "반복 연습"],
  ID_MODERATE: ["실물 사진 스타일", "단순 레이아웃"],
  ID_SEVERE: ["실물 사진 스타일", "최소 항목", "감각 기반"],
  LANG_DELAY: ["시각 보조", "AAC 병행"],
  ADHD: ["짧은 과제", "시각적 타이머", "작업기억 부하 감소"],
  DOWN: ["실물 사진", "반복 연습", "시각 보조"],
  CP: ["큰 타겟 영역", "단순 동작"],
  DCD: ["넓은 선긋기 가이드", "단순 동작"],
  BORDERLINE_INTELLECTUAL: ["구체적 사물", "단계적 난이도"],
  SELECTIVE_MUTISM: ["비구어 활동 우선", "점진적 노출"],
  STUTTERING: ["감정 표현 중심", "말하기 압박 최소화"],
  HEARING_IMPAIRED: ["텍스트 라벨 필수", "시각 중심"],
  CLEFT_PALATE: ["조음 목표 조정"],
  GLOBAL_DEVELOPMENTAL_DELAY: ["기능연령 기준", "다감각 접근"],
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
