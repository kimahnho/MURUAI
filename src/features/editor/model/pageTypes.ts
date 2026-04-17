/**
 * 문서/페이지 저장 구조와 편집 상태 타입을 정의하는 모듈.
 */
import type { CanvasElement } from "./canvasTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { StoryItem } from "../ai/generateEmotionStory";
import type { BannerPhase } from "../store/emotionSceneStore";
import type { FocusedAiModeMeta } from "../store/aiGenerationModeStore";
import type {
  StorybookBannerPhase,
  StorybookPageMeta,
  StorybookPendingGeneration,
} from "@/features/storybook/store/storybookSceneStore";
import type { WorksheetComponentType, WorksheetConfig } from "@/features/worksheet-editor/model/types";
import type { CoverData } from "../covers/coverTypes";

export type PageTemplateId = TemplateId | "aacBoard" | "aacBoardV2";

export type PageBackground =
  | { type: "none" }
  | { type: "color"; color: string }
  | { type: "image"; imageUrl: string; scale?: number; offsetX?: number; offsetY?: number };

export type PageNumberFormat = "number" | "dash" | "korean" | "english";
export type PageNumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface PageNumbering {
  enabled: boolean;
  format: PageNumberFormat;
  position: PageNumberPosition;
  // 넘버링을 시작할 페이지 위치 (기본값 1 = 첫 페이지부터)
  startPage: number;
}

/** 페이지에 삽입된 워크시트 컴포넌트 메타 — canvas_data에 영속화 */
export interface PageWorksheetComponent {
  id: string;
  type: WorksheetComponentType;
  config: WorksheetConfig;
  elementIds: string[];
}

export interface Page {
  id: string;
  pageNumber: number;
  templateId?: PageTemplateId | null;
  elements: CanvasElement[];
  background?: PageBackground;
  numbering?: PageNumbering;
  orientation?: "horizontal" | "vertical";
  rev?: number;
  isSwapped?: boolean;
  /** 이 페이지에 삽입된 워크시트 컴포넌트 목록 — 기존 문서에 없으면 undefined */
  worksheetComponents?: PageWorksheetComponent[];
  /** 표지 데이터 — 존재하면 DesignPaper가 커버 HTML을 렌더링 */
  coverData?: CoverData;
}

export type EmotionSceneMeta = {
  stories: StoryItem[];
  storyPageIds: string[];
  bannerPhase: BannerPhase;
};

/** canvas_data에 저장할 스토리북 세트 메타 — 새로고침/재접속 시 배너 복원용 */
export type StorybookSceneMeta = {
  setKey: string;
  storyPageIds: string[];
  bannerPhase: StorybookBannerPhase;
  bookTitle: string;
  characterImageUrl: string;
  artStyleId: StorybookPendingGeneration["artStyleId"];
  customPromptTemplate?: string;
  layout: StorybookPendingGeneration["layout"];
  pageMeta: StorybookPageMeta[];
};

export type CanvasDocument = {
  pages: Page[];
  swappedPageIds?: string[];
  emotionSceneMeta?: EmotionSceneMeta[];
  storybookSceneMeta?: StorybookSceneMeta[];
  focusedAiMode?: FocusedAiModeMeta;
};
