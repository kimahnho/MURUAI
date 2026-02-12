import type { CanvasElement } from "./canvasTypes";
import type { TemplateId } from "../templates/templateRegistry";

export type PageTemplateId = TemplateId | "aacBoard";

export interface Page {
  id: string;
  pageNumber: number;
  templateId?: PageTemplateId | null;
  elements: CanvasElement[];
  orientation?: "horizontal" | "vertical";
  rev?: number;
}

export type CanvasDocument = {
  pages: Page[];
};
