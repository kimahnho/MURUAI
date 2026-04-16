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

const CLOUDINARY_BASE = "https://res.cloudinary.com/dabbfycew/image/upload";
const TRAIN_TEMPLATE_BG_1 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template/page_1_webp.webp`;
const TRAIN_TEMPLATE_BG_2 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template/page_2_webp.webp`;
const TRAIN_TEMPLATE2_BG_1 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template-2/page_1_webp.webp`;
const TRAIN_TEMPLATE2_BG_2 = `${CLOUDINARY_BASE}/muru-templates/admin/train-template-2/page_2_webp.webp`;

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
  // buildStorySequenceElements가 ID 포함 CanvasElement[]를 반환하므로 로고만 추가
  const rawElements = buildStorySequenceElements(config);
  const elementsWithLogo = withLogoCanvasElements(rawElements);
  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId: null,
      // 이야기 순서 맞추기는 무조건 가로 모드
      orientation: "horizontal",
      elements: elementsWithLogo,
      rev: 0,
    };
    return [...prevPages, newPage];
  });
  return { id: newPageId, orientation: "horizontal" as const };
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

// 날짜&이름 칸 배경 스타일 정의
const DATE_NAME_BG_STYLES: Record<string, { fill: string; borderColor: string; radius: number }> = {
  round_mint: { fill: "#ecfdf5", borderColor: "#a7f3d0", radius: 12 },
  round_lavender: { fill: "#f5f3ff", borderColor: "#ddd6fe", radius: 12 },
  round_peach: { fill: "#fff7ed", borderColor: "#fed7aa", radius: 12 },
};

export const addDateNameFieldElement = ({
  pageId,
  layout = "inline",
  showDay = true,
  background = "none",
  fontSize = 17,
  setPages,
  getOrientation: _getOrientation,
}: {
  pageId: string;
  layout?: "inline" | "stacked";
  showDay?: boolean;
  background?: "none" | "round_mint" | "round_lavender" | "round_peach";
  fontSize?: number;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}): string[] => {
  void _getOrientation; // 시그니처 유지 — 현재 레이아웃은 고정 px 기반
  const groupId = crypto.randomUUID();

  const FONT_SIZE = fontSize;
  const LABEL_COLOR = "#444444";
  // 폰트 크기에 비례한 간격 배율 (기준 17px = 1.0)
  const S = FONT_SIZE / 17;

  // 모든 요소를 (0, 0) 기준으로 생성 후, 최종 배치 위치로 이동
  const elements: CanvasElement[] = [];

  if (layout === "inline") {
    // 1열 가로 배치: [  ]월  [  ]일  [  ]요일    이름:[          ]
    const ROW_H = Math.round(36 * S);
    const FIELD_W = Math.round(60 * S);   // 쓰기 공간 포함 라벨 너비
    const FIELD_GAP = Math.round(8 * S);  // 라벨 사이 간격
    const NAME_GAP = Math.round(20 * S);  // 요일/일 뒤 → 이름 사이 간격
    let curX = 0;

    // "월"
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: curX, y: 0, w: FIELD_W, h: ROW_H,
      text: "월",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "right", alignY: "middle" },
    });
    curX += FIELD_W + FIELD_GAP;

    // "일"
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: curX, y: 0, w: Math.round(50 * S), h: ROW_H,
      text: "일",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "right", alignY: "middle" },
    });
    curX += Math.round(50 * S) + FIELD_GAP;

    // "요일" (선택)
    if (showDay) {
      elements.push({
        id: crypto.randomUUID(), type: "text", groupId,
        x: curX, y: 0, w: Math.round(64 * S), h: ROW_H,
        text: "요일",
        style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "right", alignY: "middle" },
      });
      curX += Math.round(64 * S) + FIELD_GAP;
    }

    // "이름:"
    const nameX = curX + NAME_GAP;
    const nameLabelW = Math.round(48 * S);
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: nameX, y: 0, w: nameLabelW, h: ROW_H,
      text: "이름:",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "left", alignY: "middle" },
    });
    // 이름 뒤 쓰기 공간까지 포함한 컨텐츠 끝점
    const contentRight = nameX + nameLabelW + Math.round(70 * S);

    // 배경 — 컨텐츠 바운딩 박스 기반 크기
    if (background !== "none") {
      const bgStyle = DATE_NAME_BG_STYLES[background];
      const BG_PAD_X = 10;
      const BG_PAD_Y = 6;
      elements.unshift({
        id: crypto.randomUUID(), type: "roundRect", groupId,
        x: -BG_PAD_X, y: -BG_PAD_Y,
        w: contentRight + BG_PAD_X * 2,
        h: ROW_H + BG_PAD_Y * 2,
        fill: bgStyle.fill, radius: bgStyle.radius,
        border: { enabled: true, color: bgStyle.borderColor, width: 1.5, style: "solid" },
      });
    }
  } else {
    // 2열 세로 배치 (270px)
    const ROW_H = Math.round(40 * S);
    const ROW_GAP = Math.round(8 * S);
    const LABEL_W = Math.round(42 * S);
    const FIELD_GAP = Math.round(6 * S);

    // Row 1: 날짜: [  ]월 [  ]일 [  ]요일
    let curX = 0;
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: curX, y: 0, w: LABEL_W, h: ROW_H,
      text: "날짜:",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "left", alignY: "middle" },
    });
    curX += LABEL_W + Math.round(4 * S);

    const monthW = Math.round(56 * S);
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: curX, y: 0, w: monthW, h: ROW_H,
      text: "월",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "right", alignY: "middle" },
    });
    curX += monthW + FIELD_GAP;

    const dayW = Math.round(46 * S);
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: curX, y: 0, w: dayW, h: ROW_H,
      text: "일",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "right", alignY: "middle" },
    });
    curX += dayW + FIELD_GAP;

    if (showDay) {
      const dowW = Math.round(56 * S);
      elements.push({
        id: crypto.randomUUID(), type: "text", groupId,
        x: curX, y: 0, w: dowW, h: ROW_H,
        text: "요일",
        style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "right", alignY: "middle" },
      });
      curX += dowW;
    }
    // Row 1 컨텐츠 오른쪽 끝
    const row1Right = curX;

    // Row 2: 이름:
    const row2Y = ROW_H + ROW_GAP;
    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: 0, y: row2Y, w: LABEL_W, h: ROW_H,
      text: "이름:",
      style: { fontSize: FONT_SIZE, fontWeight: "normal", color: LABEL_COLOR, underline: false, alignX: "left", alignY: "middle" },
    });
    // 이름 뒤 쓰기 공간 포함
    const row2Right = LABEL_W + Math.round(100 * S);

    // 배경 — 두 행 중 넓은 쪽 기준
    const totalH = ROW_H * 2 + ROW_GAP;
    const contentW = Math.max(row1Right, row2Right);
    if (background !== "none") {
      const bgStyle = DATE_NAME_BG_STYLES[background];
      const BG_PAD_X = 10;
      const BG_PAD_Y = 6;
      elements.unshift({
        id: crypto.randomUUID(), type: "roundRect", groupId,
        x: -BG_PAD_X, y: -BG_PAD_Y,
        w: contentW + BG_PAD_X * 2,
        h: totalH + BG_PAD_Y * 2,
        fill: bgStyle.fill, radius: bgStyle.radius,
        border: { enabled: true, color: bgStyle.borderColor, width: 1.5, style: "solid" },
      });
    }
  }

  // 최종 배치 위치: 페이지 좌상단 마진 위치 (사용자가 자유롭게 이동 가능)
  const offsetX = mmToPx(15);
  const offsetY = mmToPx(15);
  for (const el of elements) {
    if ("x" in el && "y" in el) {
      (el as { x: number; y: number }).x += offsetX;
      (el as { y: number }).y += offsetY;
    }
  }

  const ids = elements.map((el) => el.id);

  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({
            ...page,
            elements: [...page.elements, ...elements],
          })
        : page
    )
  );

  return ids;
};

// --- 시계 컴포넌트 ---

const CLOCK_COLORS: Record<string, { bg: string; border: string; numColor: string }> = {
  white: { bg: "#ffffff", border: "#333333", numColor: "#333333" },
  pastel_blue: { bg: "#eff6ff", border: "#93c5fd", numColor: "#1e40af" },
  pastel_yellow: { bg: "#fefce8", border: "#fde68a", numColor: "#92400e" },
};

const CLOCK_SIZES: Record<string, { analog: number; digitalW: number; digitalH: number }> = {
  small: { analog: mmToPx(40), digitalW: 100, digitalH: 50 },
  medium: { analog: mmToPx(60), digitalW: 140, digitalH: 65 },
  large: { analog: mmToPx(80), digitalW: 180, digitalH: 80 },
};

const clockAngleToXY = (angleDeg: number, length: number, cx: number, cy: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + length * Math.cos(rad), y: cy + length * Math.sin(rad) };
};

export const addClockFaceElement = ({
  pageId,
  config,
  setPages,
}: {
  pageId: string;
  config: {
    clock_type: "analog" | "digital";
    hour: number;
    minute: number;
    show_answer_line: boolean;
    size: "small" | "medium" | "large";
    variant: "blank" | "hour_only" | "full";
    shape: "circle" | "square";
    color_theme: "white" | "pastel_blue" | "pastel_yellow";
    show_numbers: boolean;
    digital_format: "time_only" | "ampm" | "blank";
    digital_color?: "black_green" | "white_black" | "blue_dark";
  };
  setPages: Dispatch<SetStateAction<Page[]>>;
}): string[] => {
  const groupId = crypto.randomUUID();
  const elements: CanvasElement[] = [];
  const sizeSpec = CLOCK_SIZES[config.size];
  const ANSWER_H = 28;
  const ANSWER_GAP = 8;

  if (config.clock_type === "analog") {
    const d = sizeSpec.analog;
    const r = d / 2;
    const cx = r;
    const cy = r;
    const colors = CLOCK_COLORS[config.color_theme];

    // 외곽 프레임
    if (config.shape === "circle") {
      elements.push({
        id: crypto.randomUUID(), type: "ellipse", groupId,
        x: 0, y: 0, w: d, h: d,
        fill: colors.bg,
        border: { enabled: true, color: colors.border, width: 2, style: "solid" },
      });
    } else {
      elements.push({
        id: crypto.randomUUID(), type: "roundRect", groupId,
        x: 0, y: 0, w: d, h: d,
        fill: colors.bg, radius: 12,
        border: { enabled: true, color: colors.border, width: 2, style: "solid" },
      });
    }

    // 눈금 12개 (시간 마커)
    const TICK_OUTER = r * 0.88;
    const TICK_INNER = r * 0.78;
    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const outer = clockAngleToXY(angle, TICK_OUTER, cx, cy);
      const inner = clockAngleToXY(angle, TICK_INNER, cx, cy);
      elements.push({
        id: crypto.randomUUID(), type: "line", groupId,
        start: { x: inner.x, y: inner.y },
        end: { x: outer.x, y: outer.y },
        stroke: { color: colors.border, width: 1.5, style: "solid" },
      });
    }

    // 숫자 1~12
    if (config.show_numbers) {
      const NUM_R = r * 0.66;
      const numSize = Math.max(12, Math.round(d * 0.1));
      for (let i = 1; i <= 12; i++) {
        const angle = i * 30;
        const pos = clockAngleToXY(angle, NUM_R, cx, cy);
        const tw = numSize * 1.5;
        const th = numSize * 1.4;
        elements.push({
          id: crypto.randomUUID(), type: "text", groupId,
          x: pos.x - tw / 2, y: pos.y - th / 2, w: tw, h: th,
          text: String(i),
          style: { fontSize: numSize, fontWeight: "bold", color: colors.numColor, underline: false, alignX: "center", alignY: "middle" },
        });
      }
    }

    // 중심점
    const dotSize = Math.max(4, d * 0.03);
    elements.push({
      id: crypto.randomUUID(), type: "ellipse", groupId,
      x: cx - dotSize / 2, y: cy - dotSize / 2, w: dotSize, h: dotSize,
      fill: colors.border,
    });

    // 시침 — 굵고 짧게
    if (config.variant !== "blank") {
      const hourAngle = (config.hour % 12) * 30 + config.minute * 0.5;
      const hourEnd = clockAngleToXY(hourAngle, r * 0.38, cx, cy);
      elements.push({
        id: crypto.randomUUID(), type: "line", groupId,
        start: { x: cx, y: cy },
        end: { x: hourEnd.x, y: hourEnd.y },
        stroke: { color: colors.border, width: 4, style: "solid" },
      });
    }

    // 분침 — 숫자 영역 침범하지 않도록 길이 조정
    if (config.variant === "full") {
      const minAngle = config.minute * 6;
      const minEnd = clockAngleToXY(minAngle, r * 0.58, cx, cy);
      elements.push({
        id: crypto.randomUUID(), type: "line", groupId,
        start: { x: cx, y: cy },
        end: { x: minEnd.x, y: minEnd.y },
        stroke: { color: colors.border, width: 2, style: "solid" },
      });
    }

    // 답안 빈칸
    if (config.show_answer_line) {
      elements.push({
        id: crypto.randomUUID(), type: "text", groupId,
        x: 0, y: d + ANSWER_GAP, w: d, h: ANSWER_H,
        text: "(    시    분)",
        style: { fontSize: 15, fontWeight: "normal", color: "#666666", underline: false, alignX: "center", alignY: "middle" },
      });
    }
  } else {
    // 전자시계 — AM/PM 시 더 넓은 크기 + 작은 폰트
    const isAmpm = config.digital_format === "ampm";
    const dw = Math.round(sizeSpec.digitalW * (isAmpm ? 1.3 : 1));
    const dh = sizeSpec.digitalH;
    const fontSize = Math.round(dh * (isAmpm ? 0.40 : 0.52));

    // 컬러 테마
    const digitalColors: Record<string, { bg: string; border: string; text: string }> = {
      black_green: { bg: "#1a1a2e", border: "#4a4a5a", text: "#4ade80" },
      white_black: { bg: "#ffffff", border: "#333333", text: "#1a1a1a" },
      blue_dark: { bg: "#e0f2fe", border: "#7dd3fc", text: "#1e3a5f" },
    };
    const dc = digitalColors[config.digital_color ?? "black_green"];

    // 외곽
    elements.push({
      id: crypto.randomUUID(), type: "roundRect", groupId,
      x: 0, y: 0, w: dw, h: dh,
      fill: dc.bg, radius: 8,
      border: { enabled: true, color: dc.border, width: 2, style: "solid" },
    });

    // 디스플레이 텍스트
    let displayText: string;
    if (config.digital_format === "blank") {
      displayText = "  :  ";
    } else {
      const h = config.hour;
      const m = String(config.minute).padStart(2, "0");
      if (config.digital_format === "ampm") {
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        displayText = `${h12}:${m} ${period}`;
      } else {
        displayText = `${h}:${m}`;
      }
    }

    elements.push({
      id: crypto.randomUUID(), type: "text", groupId,
      x: 4, y: 0, w: dw - 8, h: dh,
      text: displayText,
      style: { fontSize, fontWeight: "bold", color: dc.text, underline: false, alignX: "center", alignY: "middle" },
    });

    // 답안 빈칸
    if (config.show_answer_line) {
      elements.push({
        id: crypto.randomUUID(), type: "text", groupId,
        x: 0, y: dh + ANSWER_GAP, w: dw, h: ANSWER_H,
        text: "(    시    분)",
        style: { fontSize: 15, fontWeight: "normal", color: "#666666", underline: false, alignX: "center", alignY: "middle" },
      });
    }
  }

  // 페이지 좌상단 마진 위치에 배치
  const offsetX = mmToPx(15);
  const offsetY = mmToPx(15);
  for (const el of elements) {
    if ("x" in el && "y" in el) {
      (el as { x: number; y: number }).x += offsetX;
      (el as { y: number }).y += offsetY;
    }
    if ("start" in el && "end" in el) {
      const lineEl = el as { start: { x: number; y: number }; end: { x: number; y: number } };
      lineEl.start.x += offsetX;
      lineEl.start.y += offsetY;
      lineEl.end.x += offsetX;
      lineEl.end.y += offsetY;
    }
  }

  const ids = elements.map((el) => el.id);

  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? bumpPageRevision({ ...page, elements: [...page.elements, ...elements] })
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
