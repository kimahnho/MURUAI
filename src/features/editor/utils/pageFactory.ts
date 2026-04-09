/**
 * 문서/템플릿 기반 페이지 생성과 삽입 규칙을 제공하는 모듈.
 */
import type { Dispatch, SetStateAction } from "react";
import type { CanvasDocument, Page } from "../model/pageTypes";
import type { AacCardElement, CanvasElement, EmotionCardElement, TableCell } from "../model/canvasTypes";
import fiveSpaceWritingNoteBg from "../templates/template_pdf/five-space-writing-note/preview.png";
import tenSpaceWritingNoteBg from "../templates/template_pdf/ten-space-writing-note/preview.png";
import lineNoteWideBg from "../templates/template_pdf/line-note-wide/preview.png";
import lineNoteMediumBg from "../templates/template_pdf/line-note-medium/preview.png";
import lineNoteNarrowBg from "../templates/template_pdf/line-note-narrow/preview.png";
import emotionDiaryBg from "../templates/template_pdf/emotion-diary/preview.png";
import pictureDiaryLineNoteBg from "../templates/template_pdf/picture-diary-line-note/preview.png";
import dictationPracticeBg from "../templates/template_pdf/dictation-practice/preview.png";
import yellowDiaryLinesBg from "../templates/template_pdf/yellow-diary-lines/preview.png";
import coloring1Bg from "../templates/template_pdf/coloring-1/preview.png";
import coloring2Bg from "../templates/template_pdf/coloring-2/preview.png";
import coloring3Bg from "../templates/template_pdf/coloring-3/preview.png";
import coloring4Bg from "../templates/template_pdf/coloring-4/preview.png";
import coloring5Bg from "../templates/template_pdf/coloring-5/preview.png";
import dotTracing1Bg from "../templates/template_pdf/dot-tracing-1/preview.png";
import dotTracing2Bg from "../templates/template_pdf/dot-tracing-2/preview.png";
import dotTracing3Bg from "../templates/template_pdf/dot-tracing-3/preview.png";
import dotTracing4Bg from "../templates/template_pdf/dot-tracing-4/preview.png";
import dotTracing5Bg from "../templates/template_pdf/dot-tracing-5/preview.png";
import { stripStyleTags } from "../sections/canvas/elements/text/textContentUtils";
import { instantiateTemplate } from "../templates/instantiateTemplate";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "../templates/templateRegistry";
import {
  buildAacBoardElements,
  buildAacBoardElementsV2,
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

const CLOUDINARY_BASE = "https://res.cloudinary.com/dabbfycew/image/upload/f_auto,q_auto";
const TRAIN_TEMPLATE_BG_1 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template/page_1`;
const TRAIN_TEMPLATE_BG_2 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template/page_2`;
const TRAIN_TEMPLATE2_BG_1 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template-2/page_1`;
const TRAIN_TEMPLATE2_BG_2 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template-2/page_2`;

const getTemplateBackground = (
  templateId: TemplateId,
  pageIndex?: number,
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
  if (templateId === "trainTemplate") {
    return {
      type: "image",
      imageUrl: pageIndex === 1 ? TRAIN_TEMPLATE_BG_2 : TRAIN_TEMPLATE_BG_1,
    };
  }
  if (templateId === "trainTemplate2") {
    return {
      type: "image",
      imageUrl: pageIndex === 1 ? TRAIN_TEMPLATE2_BG_2 : TRAIN_TEMPLATE2_BG_1,
    };
  }
  if (templateId === "coloringPage1") return { type: "image", imageUrl: coloring1Bg };
  if (templateId === "coloringPage2") return { type: "image", imageUrl: coloring2Bg };
  if (templateId === "coloringPage3") return { type: "image", imageUrl: coloring3Bg };
  if (templateId === "coloringPage4") return { type: "image", imageUrl: coloring4Bg };
  if (templateId === "coloringPage5") return { type: "image", imageUrl: coloring5Bg };
  if (templateId === "dotTracingPage1") return { type: "image", imageUrl: dotTracing1Bg };
  if (templateId === "dotTracingPage2") return { type: "image", imageUrl: dotTracing2Bg };
  if (templateId === "dotTracingPage3") return { type: "image", imageUrl: dotTracing3Bg };
  if (templateId === "dotTracingPage4") return { type: "image", imageUrl: dotTracing4Bg };
  if (templateId === "dotTracingPage5") return { type: "image", imageUrl: dotTracing5Bg };
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
    elements: Array.isArray(page.elements)
      ? page.elements.map((el) => {
          if (el.type === "text" && el.richText) {
            const cleaned = stripStyleTags(el.richText, "fontFamily");
            return cleaned !== el.richText ? { ...el, richText: cleaned } : el;
          }
          return el;
        })
      : [],
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
      background: getTemplateBackground(templateId, 0),
      elements: withLogoCanvasElements(
        instantiateTemplate(templates[0])
      ),
    };

    if (templates.length > 1) {
      const insertedPages = templates.slice(1).map((template, i) => ({
        id: crypto.randomUUID(),
        pageNumber: 0,
        templateId,
        orientation: nextOrientation,
        background: getTemplateBackground(templateId, i + 1),
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

/**
 * 대시보드 빠른 시작용: 빈 1페이지 + 템플릿 페이지를 미리 생성하여 반환한다.
 * 문서 저장 시 canvas_data에 포함되므로 DB 로드 후에도 유지된다.
 */
export const buildTemplatePages = (
  templateId: TemplateId,
  fallbackOrientation: "horizontal" | "vertical" = "vertical",
): Page[] => {
  const blank = buildInitialPages(null, fallbackOrientation);
  const templateDef = TEMPLATE_REGISTRY[templateId];
  const templates =
    "pages" in templateDef && templateDef.pages?.length
      ? templateDef.pages
      : [templateDef.template];
  const orientation =
    templateDef.orientation === "vertical-only"
      ? "vertical"
      : templateDef.orientation === "horizontal-only"
        ? "horizontal"
        : fallbackOrientation;
  const templatePages: Page[] = templates.map((t, i) => ({
    id: crypto.randomUUID(),
    pageNumber: 0,
    templateId,
    orientation,
    background: getTemplateBackground(templateId, i),
    elements: withLogoCanvasElements(instantiateTemplate(t)),
    rev: 0,
  }));

  return [...blank, ...templatePages].map((p, i) => ({
    ...p,
    pageNumber: i + 1,
  }));
};

export const addTemplatePage = ({
  templateId,
  fallbackOrientation,
  setPages,
  afterPageId,
}: {
  templateId: TemplateId;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
  afterPageId?: string;
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
  const firstPageId = crypto.randomUUID();
  setPages((prevPages) => {
    const nextPages = [...prevPages];
    const foundIndex = afterPageId
      ? nextPages.findIndex((p) => p.id === afterPageId)
      : -1;
    const insertAt = foundIndex >= 0 ? foundIndex + 1 : nextPages.length;

    const newPages = templates.map((template, index) => ({
      id: index === 0 ? firstPageId : crypto.randomUUID(),
      pageNumber: 0,
      templateId,
      orientation: nextOrientation as "horizontal" | "vertical",
      background: getTemplateBackground(templateId, index),
      elements: withLogoCanvasElements(instantiateTemplate(template)),
      rev: 0,
    }));

    nextPages.splice(insertAt, 0, ...newPages);
    nextPages.forEach((p, i) => {
      p.pageNumber = i + 1;
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
  const newPageId = crypto.randomUUID();
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

export const addAacBoardPageV2 = ({
  config,
  setPages,
}: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = crypto.randomUUID();
  const aacElements = buildAacBoardElementsV2(config);

  const canvasElements = withLogoCanvasElements(
    aacElements.map((el) => ({ ...el, id: crypto.randomUUID() })),
  );

  const firstElementId = canvasElements.find(
    (el) => el.type === "aacCard",
  )?.id;

  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId: "aacBoardV2",
      orientation: config.orientation,
      elements: canvasElements,
      rev: 0,
    };
    return [...prevPages, newPage];
  });
  return {
    id: newPageId,
    orientation: config.orientation,
    firstElementId: firstElementId ?? undefined,
  };
};

export const addStoryBoardPage = ({
  config,
  setPages,
}: {
  config: StorySequenceConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = crypto.randomUUID();
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
  elementType: "rect" | "roundRect" | "ellipse" | "mosaic" | "circleMosaic";
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
    ...(elementType === "mosaic" || elementType === "circleMosaic" ? { mosaicLevel: 8 } : {}),
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

export const addSyllableBoxElement = ({
  pageId,
  setPages,
  getOrientation,
}: {
  pageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}): string[] => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);

  const groupId = crypto.randomUUID();

  // 전체 프레임 (초록 배경) — 60% 크기
  const parentW = mmToPx(30);
  const parentH = mmToPx(36);
  const parentX = (pageWidth - parentW) / 2;
  const parentY = (pageHeight - parentH) / 2;

  // 초성 영역 (분홍, 좌상단)
  const pinkW = parentW * 0.53;
  const pinkH = parentH * 0.4;

  // 종성 영역 (노랑, 하단 전체 너비)
  const yellowH = parentH * 0.33;

  const parentRect: CanvasElement = {
    id: crypto.randomUUID(),
    type: "rect",
    x: parentX,
    y: parentY,
    w: parentW,
    h: parentH,
    fill: "#FFFFFF",
    radius: 0,
    groupId,
    border: {
      enabled: true,
      color: "#000000",
      width: 2,
      style: "dashed",
    },
  };

  const pinkRect: CanvasElement = {
    id: crypto.randomUUID(),
    type: "rect",
    x: parentX,
    y: parentY,
    w: pinkW,
    h: pinkH,
    fill: "#FFFFFF",
    radius: 0,
    groupId,
    border: {
      enabled: true,
      color: "#000000",
      width: 2,
      style: "dashed",
    },
  };

  const yellowRect: CanvasElement = {
    id: crypto.randomUUID(),
    type: "rect",
    x: parentX,
    y: parentY + parentH - yellowH,
    w: parentW,
    h: yellowH,
    fill: "#FFFFFF",
    radius: 0,
    groupId,
    border: {
      enabled: true,
      color: "#000000",
      width: 2,
      style: "dashed",
    },
  };

  const ids = [parentRect.id, pinkRect.id, yellowRect.id];

  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({
            ...page,
            elements: [...page.elements, parentRect, pinkRect, yellowRect],
          })
        : page
    )
  );

  return ids;
};

export const addAacCardElement = ({
  pageId,
  setPages,
  getOrientation,
}: {
  pageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const size = mmToPx(40);
  const x = (pageWidth - size) / 2;
  const y = (pageHeight - size) / 2;
  const nextElement: AacCardElement = {
    id: crypto.randomUUID(),
    type: "aacCard",
    x,
    y,
    w: size,
    h: size,
    fill: "#ffffff",
    radius: mmToPx(4),
    border: {
      enabled: true,
      color: "#E5E7EB",
      width: 2,
      style: "solid",
    },
    label: {
      text: "단어",
      position: "bottom",
      style: { fontSize: 18, fontWeight: "normal", color: "#000000" },
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

export const addEmotionCardElement = ({
  pageId,
  setPages,
  getOrientation,
}: {
  pageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  // 감정 추론 템플릿 3페이지의 감정 어휘 카드 디자인 (28mm x 40mm)
  const cardW = mmToPx(28);
  const cardH = mmToPx(40);
  const x = (pageWidth - cardW) / 2;
  const y = (pageHeight - cardH) / 2;
  const nextElement: EmotionCardElement = {
    id: crypto.randomUUID(),
    type: "emotionCard",
    x,
    y,
    w: cardW,
    h: cardH,
    fill: "#FFFFFF",
    radius: mmToPx(4),
    border: {
      enabled: true,
      color: "#A5B4FC",
      width: 1.5,
      style: "solid",
    },
    label: {
      text: "(감정)",
      position: "bottom",
      style: { fontSize: 14, fontWeight: "normal", color: "#111827" },
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

  const validIndices = selectedIndices.filter(
    (index) => index >= 0 && index < allTemplates.length,
  );

  if (validIndices.length === 0) {
    return null;
  }

  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;
  const firstPageId = crypto.randomUUID();

  setPages((prevPages) => {
    const nextPages = [...prevPages];
    validIndices.forEach((originalIndex, loopIndex) => {
      const pageId = loopIndex === 0 ? firstPageId : crypto.randomUUID();
      nextPages.push({
        id: pageId,
        pageNumber: nextPages.length + 1,
        templateId,
        orientation: nextOrientation,
        background: getTemplateBackground(templateId, originalIndex),
        elements: withLogoCanvasElements(
          instantiateTemplate(allTemplates[originalIndex]),
        ),
        rev: 0,
      });
    });
    return nextPages;
  });

  return { id: firstPageId, orientation: nextOrientation };
};
