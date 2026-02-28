/**
 * 문서/템플릿 기반 페이지 생성과 삽입 규칙을 제공하는 모듈.
 */
import type { Dispatch, SetStateAction } from "react";
import type { CanvasDocument, Page } from "../model/pageTypes";
import type { CanvasElement, TableCell } from "../model/canvasTypes";
import fiveSpaceWritingNoteBg from "../templates/template_pdf/five-space-writing-note/preview.png";
import tenSpaceWritingNoteBg from "../templates/template_pdf/ten-space-writing-note/preview.png";
import lineNoteWideBg from "../templates/template_pdf/line-note-wide/preview.png";
import lineNoteMediumBg from "../templates/template_pdf/line-note-medium/preview.png";
import lineNoteNarrowBg from "../templates/template_pdf/line-note-narrow/preview.png";
import emotionDiaryBg from "../templates/template_pdf/emotion-diary/preview.png";
import pictureDiaryLineNoteBg from "../templates/template_pdf/picture-diary-line-note/preview.png";
import dictationPracticeBg from "../templates/template_pdf/dictation-practice/preview.png";
import yellowDiaryLinesBg from "../templates/template_pdf/yellow-diary-lines/preview.png";
import { instantiateTemplate } from "../templates/instantiateTemplate";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "../templates/templateRegistry";
import {
  buildAacBoardElements,
  type AacBoardConfig,
  type AacBoardElement,
} from "./aacBoardUtils";
import {
  withLogoCanvasElements,
  withLogoTemplateElements,
} from "./logoElement";
import {
  buildStorySequenceElements,
  type StorySequenceConfig,
} from "./storySequenceUtils";
import { measureTextBoxSize } from "./textMeasure";
import { normalizeOrientationValue } from "./orientationUtils";
import { bumpPageRevision, ensurePageRevision } from "./pageRevision";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const getTemplateBackground = (
  templateId: TemplateId
): Page["background"] | undefined => {
  if (templateId === "fiveSpaceWritingNote") {
    return { type: "image", imageUrl: fiveSpaceWritingNoteBg };
  }
  if (templateId === "tenSpaceWritingNote") {
    return { type: "image", imageUrl: tenSpaceWritingNoteBg };
  }
  if (templateId === "lineNoteWide") {
    return { type: "image", imageUrl: lineNoteWideBg };
  }
  if (templateId === "lineNoteMedium") {
    return { type: "image", imageUrl: lineNoteMediumBg };
  }
  if (templateId === "lineNoteNarrow") {
    return { type: "image", imageUrl: lineNoteNarrowBg };
  }
  if (templateId === "emotionDiary") {
    return { type: "image", imageUrl: emotionDiaryBg };
  }
  if (templateId === "pictureDiaryLineNote") {
    return { type: "image", imageUrl: pictureDiaryLineNoteBg };
  }
  if (templateId === "dictationPractice") {
    return { type: "image", imageUrl: dictationPracticeBg };
  }
  if (templateId === "yellowDiaryLines") {
    return { type: "image", imageUrl: yellowDiaryLinesBg };
  }
  return undefined;
};

export const buildInitialPages = (
  document: CanvasDocument | null,
  fallbackOrientation: "horizontal" | "vertical"
) => {
  const nextPages = Array.isArray(document?.pages) ? document.pages : [];
  if (nextPages.length === 0) {
    // 초기 문서가 비어 있어도 편집 진입점이 항상 존재하도록 기본 1페이지를 보장한다.
    return [
      {
        id: "1",
        pageNumber: 1,
        templateId: null,
        elements: withLogoCanvasElements([]),
        orientation: fallbackOrientation,
        rev: 0,
      },
    ];
  }
  return nextPages.map((page, index) => ({
    ...ensurePageRevision(page),
    pageNumber: page.pageNumber ?? index + 1,
    orientation: normalizeOrientationValue(
      page.orientation,
      fallbackOrientation
    ),
    elements: Array.isArray(page.elements) ? page.elements : [],
  }));
};

export const applyTemplateToCurrentPage = ({
  templateId,
  currentPageId,
  fallbackOrientation,
  setPages,
}: {
  templateId: TemplateId;
  currentPageId: string;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const templateDefinition = TEMPLATE_REGISTRY[templateId];
  const templates =
    "pages" in templateDefinition && templateDefinition.pages?.length
      ? templateDefinition.pages
      : [templateDefinition.template];
  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;
  const templateBackground = getTemplateBackground(templateId);

  setPages((prevPages) => {
    const currentIndex = prevPages.findIndex(
      (page) => page.id === currentPageId
    );
    if (currentIndex < 0) return prevPages;

    const nextPages = [...prevPages];
    const basePage = nextPages[currentIndex];
    nextPages[currentIndex] = {
      ...bumpPageRevision(basePage),
      templateId,
      orientation: nextOrientation,
      background: templateBackground,
      elements: withLogoCanvasElements(
        instantiateTemplate(templates[0])
      ),
    };

    if (templates.length > 1) {
      // 다중 페이지 템플릿은 현재 페이지 다음 인덱스부터 연속 삽입한다.
      const insertedPages = templates.slice(1).map((template) => ({
        id: crypto.randomUUID(),
        pageNumber: 0,
        templateId,
        orientation: nextOrientation,
        background: templateBackground,
        elements: withLogoCanvasElements(
          instantiateTemplate(template)
        ),
        rev: 0,
      }));
      nextPages.splice(currentIndex + 1, 0, ...insertedPages);
    }

    return nextPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));
  });
  return { id: currentPageId, orientation: nextOrientation };
};

export const addTemplatePage = ({
  templateId,
  fallbackOrientation,
  setPages,
}: {
  templateId: TemplateId;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const templateDefinition = TEMPLATE_REGISTRY[templateId];
  const templates =
    "pages" in templateDefinition && templateDefinition.pages?.length
      ? templateDefinition.pages
      : [templateDefinition.template];
  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;
  const templateBackground = getTemplateBackground(templateId);
  const firstPageId = crypto.randomUUID();
  setPages((prevPages) => {
    const nextPages = [...prevPages];
    templates.forEach((template, index) => {
      const pageId = index === 0 ? firstPageId : crypto.randomUUID();
      nextPages.push({
        id: pageId,
        pageNumber: nextPages.length + 1,
        templateId,
        orientation: nextOrientation,
        background: templateBackground,
        elements: withLogoCanvasElements(
          instantiateTemplate(template)
        ),
        rev: 0,
      });
    });
    return nextPages;
  });
  return { id: firstPageId, orientation: nextOrientation };
};

export const addAacBoardPage = ({
  config,
  setPages,
}: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = Date.now().toString();
  const aacElements = buildAacBoardElements(config);

  const idMap = new Map<string, string>();
  // tempId 기반 연결(labelId)을 유지하기 위해 먼저 새 ID 매핑을 일괄 생성한다.
  aacElements.forEach((element) => {
    if (element.tempId) {
      idMap.set(element.tempId, crypto.randomUUID());
    }
  });

  const elementsWithLogo = (
    withLogoTemplateElements(aacElements) as AacBoardElement[]
  ).map((element) => {
    const newId = element.tempId
      ? idMap.get(element.tempId)
      : crypto.randomUUID();
    const newLabelId = element.labelId
      ? idMap.get(element.labelId)
      : undefined;
    return {
      ...element,
      id: newId ?? crypto.randomUUID(),
      labelId: newLabelId,
    };
  });

  let firstSelectableElementId: string | null = null;
  elementsWithLogo.forEach((element) => {
    if (firstSelectableElementId) return;
    if (
      element.type === "rect" ||
      element.type === "roundRect" ||
      element.type === "ellipse"
    ) {
      firstSelectableElementId = element.id;
    }
  });

  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId: "aacBoard",
      orientation: config.orientation,
      elements: elementsWithLogo,
      rev: 0,
    };
    return [...prevPages, newPage];
  });
  return {
    id: newPageId,
    orientation: config.orientation,
    firstElementId: firstSelectableElementId ?? undefined,
  };
};

export const addStoryBoardPage = ({
  config,
  setPages,
}: {
  config: StorySequenceConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = Date.now().toString();
  const elementsWithLogo = withLogoTemplateElements(
    buildStorySequenceElements(config)
  ).map((element) => ({
    ...element,
    id: crypto.randomUUID(),
  }));
  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId: null,
      orientation: config.orientation,
      elements: elementsWithLogo,
      rev: 0,
    };
    return [...prevPages, newPage];
  });
  return { id: newPageId, orientation: config.orientation };
};

export const addShapeElement = ({
  pageId,
  elementType,
  setPages,
  getOrientation,
}: {
  pageId: string;
  elementType: "rect" | "roundRect" | "ellipse";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const size = mmToPx(78);
  const x = (pageWidth - size) / 2;
  const y = (pageHeight - size) / 2;
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: elementType,
    x,
    y,
    w: size,
    h: size,
    fill: "#b7c3ff",
    radius: elementType === "roundRect" ? mmToPx(8) : 0,
    border: {
      enabled: false,
      color: "#000000",
      width: 2,
      style: "solid",
    },
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({
            ...page,
            elements: [...page.elements, nextElement],
          })
        : page
    )
  );
  return nextElement.id;
};

export const addTextElement = ({
  pageId,
  preset,
  setPages,
  getOrientation,
}: {
  pageId: string;
  preset: {
    text: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    alignX?: "left" | "center" | "right" | "justify";
    alignY?: "top" | "middle" | "bottom";
    widthMode?: "auto" | "fixed" | "element";
  };
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const canvasPadding = 20;
  const maxAllowedWidth = pageWidth - canvasPadding;
  const { width: measuredWidth, height: measuredHeight } =
    measureTextBoxSize(preset.text, preset.fontSize, preset.fontWeight, {
      lineHeight: 1.2,
      maxWidth: maxAllowedWidth,
    });
  // 추가되는 텍스트는 측정된 크기로 중앙 배치해 첫 편집 진입 시 화면 밖 생성을 방지한다.
  const textWidth = Math.max(measuredWidth, 1);
  const textHeight = Math.max(measuredHeight, 1);
  const x = (pageWidth - textWidth) / 2;
  const y = (pageHeight - textHeight) / 2;
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: "text",
    x,
    y,
    w: textWidth,
    h: textHeight,
    text: preset.text,
    widthMode: preset.widthMode ?? "element",
    style: {
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      color: "#000000",
      underline: false,
      alignX: preset.alignX ?? "center",
      alignY: preset.alignY ?? "middle",
    },
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({
            ...page,
            elements: [...page.elements, nextElement],
          })
        : page
    )
  );
  return nextElement.id;
};

export const addLineElement = ({
  pageId,
  elementType,
  setPages,
  getOrientation,
}: {
  pageId: string;
  elementType: "line" | "arrow";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const length = mmToPx(80);
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: elementType,
    start: { x: centerX - length / 2, y: centerY },
    end: { x: centerX + length / 2, y: centerY },
    stroke: {
      color: "#000000",
      width: 2,
    },
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({
            ...page,
            elements: [...page.elements, nextElement],
          })
        : page
    )
  );
  return nextElement.id;
};

export const addTableElement = ({
  pageId,
  rows,
  cols,
  setPages,
  getOrientation,
}: {
  pageId: string;
  rows: number;
  cols: number;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const w = pageWidth * 0.6;
  const cellHeight = mmToPx(12);
  const h = cellHeight * rows;
  const x = (pageWidth - w) / 2;
  const y = (pageHeight - h) / 2;
  const cells: TableCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ text: "" }))
  );
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: "table",
    x,
    y,
    w,
    h,
    rows,
    cols,
    cells,
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({
            ...page,
            elements: [...page.elements, nextElement],
          })
        : page
    )
  );
  return nextElement.id;
};

export const addSelectedTemplatePages = ({
  templateId,
  selectedIndices,
  fallbackOrientation,
  setPages,
}: {
  templateId: TemplateId;
  selectedIndices: number[];
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const templateDefinition = TEMPLATE_REGISTRY[templateId];
  const allTemplates =
    "pages" in templateDefinition && templateDefinition.pages?.length
      ? templateDefinition.pages
      : [templateDefinition.template];

  const selectedTemplates = selectedIndices
    .filter((index) => index >= 0 && index < allTemplates.length)
    .map((index) => allTemplates[index]);

  if (selectedTemplates.length === 0) {
    return null;
  }

  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;
  const templateBackground = getTemplateBackground(templateId);

  const firstPageId = crypto.randomUUID();

  setPages((prevPages) => {
    const nextPages = [...prevPages];
    selectedTemplates.forEach((template, index) => {
      const pageId = index === 0 ? firstPageId : crypto.randomUUID();
      nextPages.push({
        id: pageId,
        pageNumber: nextPages.length + 1,
        templateId,
        orientation: nextOrientation,
        background: templateBackground,
        elements: withLogoCanvasElements(instantiateTemplate(template)),
        rev: 0,
      });
    });
    return nextPages;
  });

  return { id: firstPageId, orientation: nextOrientation };
};
