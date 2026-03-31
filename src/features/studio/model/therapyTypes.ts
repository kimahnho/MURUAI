/**
 * Studio(치료 AI) 기능 전반의 타입 정의.
 */

// ── 도메인 ──

export type TherapyDomain =
  | "emotion"
  | "language"
  | "cognition"
  | "motor"
  | "social"
  | "play";

export const THERAPY_DOMAIN_LABELS: Record<TherapyDomain, string> = {
  emotion: "감정",
  language: "언어",
  cognition: "인지",
  motor: "소근육",
  social: "사회성",
  play: "놀이",
};

// ── 진단 ──

export type DiagnosisCode =
  | "ASD_L1"
  | "ASD_L2"
  | "ASD_L3"
  | "ID_MILD"
  | "ID_MODERATE"
  | "ID_SEVERE"
  | "LANG_DELAY"
  | "ADHD"
  | "DOWN"
  | "CP"
  | "DCD"
  | "BORDERLINE_INTELLECTUAL"
  | "SELECTIVE_MUTISM"
  | "STUTTERING"
  | "HEARING_IMPAIRED"
  | "CLEFT_PALATE"
  | "GLOBAL_DEVELOPMENTAL_DELAY"
  | "OTHER";

export interface DiagnosisProfile {
  primary?: DiagnosisCode;
  comorbidities: DiagnosisCode[];
  functionalAgeOffset?: number;
  adaptations?: string[];
  rawText: string;
}

// ── 학생 프로필 (치료 전용) ──

export interface TherapyStudentProfile {
  id: string;
  userId: string;
  studentId: string;
  diagnosis: DiagnosisProfile;
  functionalAge: number;
  therapyGoals: string[];
  articulationTargets: string[];
  interests: string[];
  sensoryTraits: string[];
  autoLearned?: AutoLearnedData;
  createdAt: string;
  updatedAt: string;
}

export interface AutoLearnedData {
  preferredActivities: string[];
  avoidedThemes: string[];
  effectiveDifficulty: string;
  sessionCount: number;
  lastUpdated: string;
}

// ── 채팅 ──

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageType =
  | "text"
  | "sessionSet"
  | "worksheetPreview"
  | "clarification"
  | "safetyAlert"
  | "suggestion"
  | "imagePrompt"
  | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  type: ChatMessageType;
  metadata?: ChatMessageMetadata;
  createdAt: string;
}

export interface ImagePromptEntry {
  index: number;
  title: string;
  prompt: string;
}

export interface ChatMessageMetadata {
  domain?: TherapyDomain;
  confidence?: number;
  worksheetSuggestion?: WorksheetSuggestion;
  sessionSet?: SessionSet;
  quickActions?: QuickAction[];
  imagePrompts?: ImagePromptEntry[];
}

export interface QuickAction {
  label: string;
  action: string;
}

// ── 세션 ──

export type SessionStatus = "active" | "completed" | "archived";

export interface TherapySession {
  id: string;
  userId: string;
  studentId?: string;
  title?: string;
  sheets?: WorksheetSuggestion[];
  domain: TherapyDomain;
  status: SessionStatus;
  messages: ChatMessage[];
  evaluation?: SessionEvaluation;
  durationSeconds?: number;
  createdAt: string;
  completedAt?: string;
}

export interface SessionEvaluation {
  scores: Record<string, number>;
  notes?: string;
  grade?: string;
}

// ── 학습지 ──

export type WorksheetType =
  | "findSame"
  | "matchPairs"
  | "spotDifference"
  | "categorize"
  | "emotionInference"
  | "lineConnect"
  | "sequencing";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface WorksheetSuggestion {
  title: string;
  worksheetType: WorksheetType;
  domain: TherapyDomain;
  difficulty: DifficultyLevel;
  itemCount: number;
  description: string;
  imagePrompt?: string;
}

export interface SessionSet {
  id: string;
  studentName?: string;
  domain: TherapyDomain;
  sheets: WorksheetSuggestion[];
}

// ── 학습지 작업 상태 (workspace) ──

export type WorksheetStatus = "pending" | "editing" | "generating" | "completed";

export interface WorkspaceSheet {
  index: number;
  suggestion: WorksheetSuggestion;
  status: WorksheetStatus;
  imageUrl?: string;
  modifiedTitle?: string;
  modifiedDescription?: string;
}

// ── 파이프라인 ──

export interface TherapyRequest {
  messages: ChatMessage[];
  studentProfile?: TherapyStudentProfile;
  domain?: TherapyDomain;
  studentDiagnosis?: string;
}

export interface TherapyResponse {
  content: string;
  domain?: TherapyDomain;
  confidence?: number;
  worksheetSuggestion?: WorksheetSuggestion;
  sessionSet?: SessionSet;
  type: ChatMessageType;
}

// ── 가드레일 ──

export type GuardrailAction = "warn" | "override" | "block";

export interface GuardrailResult {
  action: GuardrailAction;
  ruleId: string;
  message: string;
  original?: string;
  corrected?: string;
}

// ── 안전 검사 ──

export interface SafetyCheckResult {
  isSafe: boolean;
  crisisDetected: boolean;
  message?: string;
  hotlines?: string[];
}

// ── 신뢰도 점수 ──

export interface ConfidenceScore {
  domainDetection: number;
  activityMatch: number;
  difficultyCalibration: number;
  overall: number;
  flags: string[];
  dataMaturity: "initial" | "developing" | "established";
}

// ── 세션 평가 데이터 ──

export interface SessionEvaluationData {
  sessionSummary: {
    accuracy: number;
    totalItems: number;
    correct: number;
    incorrect: number;
    noResponse: number;
  };
  errorAnalysis: {
    confusedPairs: string[];
    pattern: string;
    possibleCause: string;
  };
  progressVsPrevious: {
    previousAccuracy: number;
    change: string;
    trend: "improving" | "declining" | "stable";
    interpretation: string;
  };
  nextSessionRecommendation: {
    domain: TherapyDomain;
    level: number;
    focus: string;
    suggestedActivity: string;
    difficulty: DifficultyLevel;
    theme: string;
  };
  parentReportSummary: string;
}

// ── 오버레이 ──

export type OverlayType = "student" | "therapist";

export interface AgentOverlay {
  id: string;
  type: OverlayType;
  targetId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
