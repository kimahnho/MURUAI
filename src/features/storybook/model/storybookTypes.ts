/**
 * 스토리북 생성기 도메인 타입, 상수, 라벨 정의.
 *
 * 2단계 재구성:
 *  - Step 1 설정 (나이 + 주제 + 그림체 + 폰트 + 레이아웃 + 저장 주인공)
 *  - Step 2 주인공 확인 (주인공 + 기획서 좌우 분할)
 *  - Step 5 생성 중 (비인터랙티브)
 *  - Step 6 완료 (비인터랙티브)
 */

// ─── 아동 정보 ───

// 서비스 철학: 나이만 입력. 나머지 필드는 구데이터 호환용으로만 유지.
export interface ChildInfo {
  id: string;
  age: number;
  studentId?: string;
  name?: string;
  gender?: "male" | "female";
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
  /** 이미지 생성 실패한 페이지 index 목록 — 부분 실패 복구 UI 용 */
  failedIndices?: number[];
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

// 6종 레이아웃 지원
export type PageLayout =
  | "vertical"
  | "horizontal"
  | "fullscreen-bottom"
  | "fullscreen-top"
  | "text-left"
  | "text-top";

export interface LayoutOption {
  id: PageLayout;
  label: string;
  description: string;
}

/** 레이아웃에 따른 기본 방향(가로/세로) */
export const isLandscapeLayout = (layout: PageLayout): boolean =>
  layout === "horizontal" || layout === "text-left";

// ─── 캐스팅 (서브캐릭터) ───

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

/** 유저가 수동으로 추가하는 서브캐릭터 (Step 2 주인공 확인 단계에서 선택) */
export interface ManualSubCharacter {
  id: string;
  name: string;
  appearance: string;
  imageBase64?: string;
  savedCharacterId?: string;
}

// ─── 위자드 ───

// 2단계로 간소화된 인터랙티브 스텝 + 생성/완료
export type WizardStep = 1 | 2 | 5 | 6;

export interface WizardFormData {
  childInfo: ChildInfo | null;
  topic: string;
  pageCount: number;
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
  manualSubCharacters?: ManualSubCharacter[];
  /** 위자드 호출 직전에 활성화된 에디터 페이지 id — 생성 결과를 이 페이지 바로 뒤에 삽입 */
  insertAfterPageId?: string;
}

// ─── 상수 ───

export const STORYBOOK_PAGE_COUNT = 10;
export const PAGE_COUNT_MIN = 3;
export const PAGE_COUNT_MAX = 15;
export const PAGE_COUNT_DEFAULT = 10;

export const DEFAULT_FONT_FAMILY = "Pretendard";

/** 나이별 주제 추천 — 랜덤 6개 셔플용 풀 */
export const TOPIC_PRESETS_BY_AGE: Record<string, string[]> = {
  "3-4": [
    "아기 곰이 엄마를 찾아가는 이야기",
    "달님 안녕",
    "강아지와 산책하기",
    "잃어버린 양말을 찾아서",
    "비눗방울 놀이",
    "배고픈 애벌레",
    "목욕 시간이 싫은 아기 오리",
    "장난감 기차의 모험",
    "무서운 천둥소리가 나는 밤",
    "할머니 집에 놀러 가는 날",
    "처음 본 무당벌레",
    "모래성 쌓기 대작전",
    "숨바꼭질하는 토끼 가족",
    "빨간 장화를 신고 물웅덩이 점프",
    "엄마 품이 그리운 아기 펭귄",
    "구름 위에서 낮잠 자기",
    "생일 케이크 만들기",
    "나비가 된 애벌레의 하루",
  ],
  "5-6": [
    "처음 만난 친구와 인사하는 법",
    "내 감정을 말로 표현하기",
    "무지개 물고기",
    "비 오는 날 우산을 잃어버린 아이",
    "토끼와 거북이",
    "유치원에서 처음 혼자 자는 날",
    "동물원에서 길을 잃은 아이",
    "요리사가 되고 싶은 곰돌이",
    "색깔 요정과 무지개 마을",
    "밤하늘 별을 세는 고양이",
    "용감한 소방관이 되고 싶어",
    "친구에게 사과하는 법",
    "겨울에 찾아온 작은 새",
    "마법의 크레파스로 그린 세상",
    "사이좋게 나눠 먹는 쿠키",
    "내 동생이 태어난 날",
    "잠이 오지 않는 밤의 모험",
    "공원에서 만난 무지개 달팽이",
  ],
  "7-8": [
    "실수를 두려워하지 않는 마음",
    "학교에서 발표하기가 무서운 아이",
    "전학 온 첫날 친구 사귀기",
    "거짓말쟁이 양치기 소년",
    "비밀 편지를 받은 날",
    "숲속에서 길을 잃은 모험",
    "시간 여행을 떠난 아이",
    "마을을 구한 작은 영웅",
    "외계인 친구가 찾아온 날",
    "보물 지도를 따라가는 탐험",
    "약속을 지키는 것의 소중함",
    "다른 나라 음식 맛보기 대회",
    "반려동물이 아프면 어떡하지",
    "꿈속에서 만난 용감한 기사",
    "내 일기장의 비밀",
    "혼자서도 할 수 있어",
    "자연을 지키는 어린이 탐정",
    "우리 반 장기자랑 대회",
  ],
  "9+": [
    "친구의 비밀을 지켜야 할까?",
    "다른 사람의 입장에서 생각하기",
    "포기하고 싶을 때 다시 일어서는 법",
    "이상한 나라의 앨리스",
    "새로운 동네로 이사한 날",
    "시험에서 떨어졌지만 배운 것들",
    "SNS에서 진짜 친구를 찾기",
    "꿈을 향해 한 걸음씩",
    "편견 없이 바라보기",
    "미래에서 온 편지",
    "나만의 비밀 아지트",
    "실패해도 괜찮은 이유",
    "지구를 지키는 작은 실천",
    "전설 속 보물을 찾아서",
    "왜 사람마다 생각이 다를까",
    "처음으로 혼자 떠난 캠프",
    "우정이 깊어지는 순간",
    "로봇 친구와의 하루",
  ],
};

/** 나이에 맞는 주제 프리셋 풀을 반환한다 */
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
    label: "상하 분할",
    description: "상단 이미지 + 하단 텍스트",
  },
  {
    id: "horizontal",
    label: "좌우 분할",
    description: "좌측 이미지 + 우측 텍스트",
  },
  {
    id: "fullscreen-bottom",
    label: "전체 + 하단",
    description: "전체 이미지 위에 하단 텍스트",
  },
  {
    id: "fullscreen-top",
    label: "전체 + 상단",
    description: "전체 이미지 위에 상단 텍스트",
  },
  {
    id: "text-left",
    label: "좌측 텍스트",
    description: "좌측 텍스트 + 우측 이미지",
  },
  {
    id: "text-top",
    label: "상단 텍스트",
    description: "상단 텍스트 + 하단 이미지",
  },
];

export const STEP_LABELS: Record<WizardStep, string> = {
  1: "설정",
  2: "주인공 확인",
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
  pageCount: PAGE_COUNT_DEFAULT,
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
  manualSubCharacters: [],
  insertAfterPageId: undefined,
};
