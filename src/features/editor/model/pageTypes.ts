/**
 * 문서/페이지 저장 구조와 편집 상태 타입을 정의하는 모듈.
 */
import type { CanvasElement } from "./canvasTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { StoryItem } from "../ai/generateEmotionStory";
import type { BannerPhase } from "../store/emotionSceneStore";
import type { FocusedAiModeMeta } from "../store/aiGenerationModeStore";
import type { WorksheetComponentType, WorksheetConfig } from "@/features/worksheet-editor/model/types";

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
