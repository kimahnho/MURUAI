/**
 * 문서/페이지 저장 구조와 편집 상태 타입을 정의하는 모듈.
 */
import type { CanvasElement } from "./canvasTypes";
import type { TemplateId } from "../templates/templateRegistry";

export type PageTemplateId = TemplateId | "aacBoard";

export type PageBackground =
  | { type: "none" }
  | { type: "color"; color: string }
  | { type: "image"; imageUrl: string };

export type PageNumberFormat = "number" | "dash" | "korean" | "english";
export type PageNumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface PageNumbering {
  enabled: boolean;
  format: PageNumberFormat;
  position: PageNumberPosition;
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

export type CanvasDocument = {
  pages: Page[];
  swappedPageIds?: string[];
};
