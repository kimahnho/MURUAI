/**
 * 특수교육용 이미지 소재 생성 — 타입 정의
 *
 * 학습지 레이아웃이 아닌, 학습지에 '사용할' 개별 이미지 소재 생성.
 * 아동별 agent가 진단/감각 특성에 맞는 그림체를 자동 적용.
 */

// ═══ 시각 스타일 ═══

/** 5-tier 시각 스타일 */
export type VisualStyle =
  | "flat"            // 기본: 굵은 테두리, 밝은 단색, 둥근 형태
  | "pastel"          // 감각과민: 파스텔, 회색 테두리, 자극 최소
  | "realistic"       // 지적장애 중등도+: 실물 사진 스타일
  | "high_contrast"   // ADHD: 고대비, 선명한 초점, 굵은 윤곽
  | "line_art";       // 선긋기/색칠용: 흑백 선화

/** 색상 민감도 */
export type ColorSensitivity = "normal" | "muted" | "high_contrast";

/** 배경 복잡도 */
export type BackgroundLevel = "none" | "simple" | "contextual";

// ═══ 치료 도메인 ═══

export type TherapyDomain = "emotion" | "language" | "cognition" | "motor" | "social" | "play";

// ═══ 진단 ═══

export interface DiagnosisProfile {
  primary: string | null;
  comorbidities: string[];
  functionalAgeMonths: number | null;
  adaptations: string[];
}

// ═══ 아동별 시각 Agent ═══

export interface ChildVisualAgent {
  id: string;
  childId: string;
  userId: string;

  // 진단 기반 기본값 (자동 설정)
  diagnosis: string | null;
  functionalAgeMonths: number | null;
  baseStyle: VisualStyle;

  // 학습된 선호 (피드백으로 업데이트)
  preferredStyle: VisualStyle;
  colorSensitivity: ColorSensitivity;
  backgroundLevel: BackgroundLevel;
  optimalComplexity: number;        // 1-5 (요소 수/디테일)
  effectiveThemes: string[];
  avoidThemes: string[];

  // 통계
  generationCount: number;
  likedCount: number;
  dislikedCount: number;
  modifiedCount: number;
  regenerateCount: number;
  lastGeneratedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

/** 재생성 과정에서 학습된 패턴 */
export interface LearnedPattern {
  /** 원본 프롬프트 (한국어) */
  originalPrompt: string;
  /** 수정된 프롬프트 또는 변경된 설정 */
  correction: string;
  /** 어떤 파라미터가 바뀌었는지 */
  changedParams: Partial<{
    style: VisualStyle;
    background: BackgroundLevel;
    colorSensitivity: ColorSensitivity;
    complexity: number;
    additionalInstruction: string; // "배경 제거해줘", "더 단순하게" 등
  }>;
  /** 수정 후 좋아요 받았는지 */
  wasAccepted: boolean;
  createdAt: string;
}

// ═══ 생성 요청/결과 ═══

export interface ImageGenRequest {
  prompt: string;                   // 치료사 입력 (한국어)
  childId: string;                  // 선택된 아동
  styleOverride?: VisualStyle;      // 이번만 스타일 변경
  backgroundOverride?: BackgroundLevel;
}

export interface GeneratedImage {
  id: string;
  childId: string;
  userId: string;
  imageUrl: string;
  prompt: string;                   // 원본 한국어
  resolvedPrompt: string;           // 최종 영어 프롬프트
  style: VisualStyle;
  backgroundLevel: BackgroundLevel;
  complexity: number;
  feedback: "liked" | "disliked" | "modified" | null;
  referenceImageUrl?: string;       // 참고 이미지 Cloudinary URL (이력 표시용)
  createdAt: string;
}

// ═══ 세션 ═══

export type ImageGenSessionStatus = "active" | "completed" | "archived";

export interface ImageGenSession {
  id: string;
  userId: string;
  studentId: string | null;
  title: string | null;
  status: ImageGenSessionStatus;
  createdAt: string;
  updatedAt: string;
}

// ═══ 채팅 메시지 ═══

export type ImageGenMessageRole = "user" | "assistant";

export interface ImageGenMessageMetadata {
  type?: "prompt" | "image" | "error" | "clarify";
  imageUrl?: string;
  referenceImageUrl?: string;
  style?: VisualStyle;
  backgroundLevel?: BackgroundLevel;
  complexity?: number;
  resolvedPrompt?: string;
  imageId?: string;
}

export interface ImageGenMessage {
  id: string;
  sessionId: string;
  role: ImageGenMessageRole;
  content: string;
  metadata?: ImageGenMessageMetadata;
  createdAt: string;
}

// ═══ 스토어 상태 ═══

export type ImageGenPhase = "idle" | "building" | "generating" | "uploading" | "done" | "error";
