/**
 * 스토리북 생성기 도메인 타입, 상수, 라벨 정의.
 */

// ─── 아동 정보 ───

export interface ChildInfo {
  id: string;
  studentId?: string;
  name?: string;
  gender?: "male" | "female";
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

export interface SavedCharacter {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  artStyleId: ArtStyleId | null;
  promptTemplate: string | null;
  childInfoSnapshot: ChildInfo | null;
  createdAt: string;
}

// ─── 그림체 ───

export type ArtStyleId =
  | "watercolor-fairytale"
  | "pixar-style"
  | "cozy-sketch"
  | "crayon-sketch"
  | "minimal-illustration"
  | "custom";

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

// ─── 캐스팅 (서브캐릭터 자동 분석) ───

export interface CastCharacter {
  role: string;
  appearance: string;
  personality: string;
  pages: number[];
  imageBase64?: string;
}

export interface CastingNote {
  characters: CastCharacter[];
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
  characterPrompt?: string;
  customPromptTemplate?: string;
  selectedCharacterId?: string;
  castingNote?: CastingNote | null;
}

// ─── 상수 ───

export const STORYBOOK_PAGE_COUNT = 10;

export const DEFAULT_FONT_FAMILY = "Pretendard";

/** 나이별 주제 추천 — 발달 단계에 맞는 예시 */
export const TOPIC_PRESETS_BY_AGE: Record<string, string[]> = {
  "3-4": [
    "아기 곰이 엄마를 찾아가는 이야기",
    "달님 안녕",
    "강아지와 산책하기",
    "잃어버린 양말을 찾아서",
    "비눗방울 놀이",
    "배고픈 애벌레",
  ],
  "5-6": [
    "처음 만난 친구와 인사하는 법",
    "내 감정을 말로 표현하기",
    "무지개 물고기",
    "비 오는 날 우산을 잃어버린 아이",
    "토끼와 거북이",
    "유치원에서 처음 혼자 자는 날",
  ],
  "7-8": [
    "실수를 두려워하지 않는 마음",
    "학교에서 발표하기가 무서운 아이",
    "전학 온 첫날 친구 사귀기",
    "거짓말쟁이 양치기 소년",
    "비밀 편지를 받은 날",
    "숲속에서 길을 잃은 모험",
  ],
  "9+": [
    "친구의 비밀을 지켜야 할까?",
    "다른 사람의 입장에서 생각하기",
    "포기하고 싶을 때 다시 일어서는 법",
    "이상한 나라의 앨리스",
    "새로운 동네로 이사한 날",
    "시험에서 떨어졌지만 배운 것들",
  ],
};

/** 나이에 맞는 주제 프리셋을 반환한다 */
export const getTopicPresetsForAge = (age: number): string[] => {
  if (age <= 4) return TOPIC_PRESETS_BY_AGE["3-4"];
  if (age <= 6) return TOPIC_PRESETS_BY_AGE["5-6"];
  if (age <= 8) return TOPIC_PRESETS_BY_AGE["7-8"];
  return TOPIC_PRESETS_BY_AGE["9+"];
};

/** @deprecated getTopicPresetsForAge 사용 */
export const TOPIC_PRESETS = TOPIC_PRESETS_BY_AGE["5-6"];

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
  characterPrompt: undefined,
  customPromptTemplate: undefined,
  selectedCharacterId: undefined,
  castingNote: null,
};
