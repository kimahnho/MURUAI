/**
 * 문서/페이지 저장 구조와 편집 상태 타입을 정의하는 모듈.
 */
import type { CanvasElement } from "./canvasTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { StoryItem } from "../ai/generateEmotionStory";
import type { BannerPhase } from "../store/emotionSceneStore";
import type { FocusedAiModeMeta } from "../store/aiGenerationModeStore";

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
}

export type EmotionSceneMeta = {
  stories: StoryItem[];
  storyPageIds: string[];
  bannerPhase: BannerPhase;
};

export type CanvasDocument = {
  pages: Page[];
  swappedPageIds?: string[];
  emotionSceneMeta?: EmotionSceneMeta[];
  focusedAiMode?: FocusedAiModeMeta;
};
