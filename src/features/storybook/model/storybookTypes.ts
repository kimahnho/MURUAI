/**
 * 스토리북 생성기 도메인 타입, 상수, 라벨 정의.
 */

// ─── 아동 정보 ───

export interface ChildInfo {
  id: string;
  studentId?: string;
  name: string;
  gender: "male" | "female";
  age: number;
  diagnosis?: string;
  learningGoal?: string;
}

// ─── 기획서 (AI 생성 결과) ───

export interface StoryPageOutline {
  pageNumber: number;
  sceneDescription: string;
  textContent: string;
}

export interface StoryProposal {
  id: string;
  title: string;
  summary: string;
  pages: StoryPageOutline[];
}

// ─── 최종 스토리북 ───

export interface StoryBookPage {
  id: string;
  pageNumber: number;
  imageUrl: string;
  text: string;
  sceneDescription: string;
  sceneGroup: number;
}

export interface StoryBook {
  id: string;
  title: string;
  childInfo: ChildInfo;
  artStyle: ArtStyleId;
  layout: PageLayout;
  fontFamily: string;
  pages: StoryBookPage[];
  createdAt: string;
}

// ─── 그림체 ───

export type ArtStyleId =
  | "watercolor-fairytale"
  | "pixar-style"
  | "cozy-sketch"
  | "crayon-sketch"
  | "minimal-illustration";

export interface ArtStylePreset {
  id: ArtStyleId;
  label: string;
  description: string;
  promptTemplate: string;
  modelParams?: string;
  previewImage: string;
}

// ─── 레이아웃 ───

export type PageLayout = "vertical" | "horizontal";

export interface LayoutOption {
  id: PageLayout;
  label: string;
  description: string;
}

// ─── 위자드 ───

export type WizardStep = 1 | 2 | 3 | 4 | 45 | 5 | 6;

export interface WizardFormData {
  childInfo: ChildInfo | null;
  topic: string;
  layout: PageLayout;
  fontFamily: string;
  selectedProposalId: string | null;
  proposals: StoryProposal[];
  artStyle: ArtStyleId | null;
  editedProposal: StoryProposal | null;
  referenceImageBase64?: string;
}

// ─── 상수 ───

export const STORYBOOK_PAGE_COUNT = 10;

export const DEFAULT_FONT_FAMILY = "Pretendard";

export const TOPIC_PRESETS = [
  "실수를 두려워하지 않는 마음",
  "학교는 무서운 곳이 아니야",
  "처음 만난 친구와 인사하는 법",
  "내 감정을 말로 표현하기",
  "순서를 기다리는 연습",
  "다른 사람의 마음 이해하기",
] as const;

export const TOPIC_MIN_LENGTH = 2;
export const TOPIC_MAX_LENGTH = 500;

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "vertical",
    label: "세로형",
    description: "상단 이미지 + 하단 텍스트",
  },
  {
    id: "horizontal",
    label: "가로형",
    description: "좌측 이미지 + 우측 텍스트",
  },
];

export const STEP_LABELS: Record<WizardStep, string> = {
  1: "아동 정보",
  2: "주제 입력",
  3: "기획서 선택",
  4: "스타일 설정",
  45: "참고 이미지",
  5: "생성 중",
  6: "완료",
};

export const GENERATING_MESSAGES = [
  "이야기를 구상하고 있어요",
  "장면을 그리고 있어요",
  "색을 입히고 있어요",
  "글을 다듬고 있어요",
  "마무리하고 있어요",
] as const;

export const GENERATING_MESSAGE_INTERVAL_MS = 3000;

export const INITIAL_FORM_DATA: WizardFormData = {
  childInfo: null,
  topic: "",
  layout: "vertical",
  fontFamily: DEFAULT_FONT_FAMILY,
  selectedProposalId: null,
  proposals: [],
  artStyle: null,
  editedProposal: null,
  referenceImageBase64: undefined,
};
