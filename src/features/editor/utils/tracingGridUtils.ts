/**
 * 어휘 학습 카드에서 목표 어휘를 추출하고
 * 따라쓰기 그리드 페이지를 생성하는 유틸리티.
 */
import type { CanvasElement, ShapeElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import { withLogoCanvasElements } from "./logoElement";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// PRD 기술 상수
const TRACING_FONT_FAMILY = "Hakgyoansim Badasseugi";
const VOCAB_CELL_SIZE_MM = 13;
const REPEAT_COUNT = 3;
const REP_GAP_MM = 3;
const WORD_LABEL_HEIGHT_MM = 8;
const LABEL_TO_GRID_GAP_MM = 2;
const SECTION_GAP_MM = 5;
const PAGE_TOP_MARGIN_MM = 16;
const PAGE_BOTTOM_MARGIN_MM = 16;
const DYNAMIC_GAP_MAX_MM = 20;

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

const CELL_BORDER_COLOR = "#9CA3AF";
const CELL_BORDER_WIDTH = 1.2;
const CELL_FILL = "#FFFFFF";
const GUIDE_TEXT_COLOR = "#D1D5DB";
const LABEL_FONT_SIZE = 18;
const GUIDE_FONT_SIZE = 32;

const DEFAULT_LABEL_TEXT = "목표 어휘";

// imageSlot ShapeElement 타입 가드
const isImageSlotWithLabel = (
  el: CanvasElement,
): el is ShapeElement & { labelId: string } =>
  (el.type === "rect" ||
    el.type === "roundRect" ||
    el.type === "ellipse" ||
    el.type === "mosaic" ||
    el.type === "circleMosaic") &&
  (el as ShapeElement).subType === "imageSlot" &&
  typeof (el as ShapeElement).labelId === "string" &&
  (el as ShapeElement).labelId!.length > 0;

/**
 * 어휘 학습 카드 페이지에서 목표 어휘 텍스트를 추출한다.
 * 기본값("목표 어휘") 및 빈 문자열은 제외한다.
 */
export const extractVocabLabels = (elements: CanvasElement[]): string[] => {
  const imageSlots = elements.filter(isImageSlotWithLabel);
  const labels: string[] = [];

  for (const slot of imageSlots) {
    const textEl = elements.find(
      (el) => el.type === "text" && el.id === slot.labelId,
    );
    if (
      textEl &&
      textEl.type === "text" &&
      textEl.text.trim() !== "" &&
      textEl.text !== DEFAULT_LABEL_TEXT
    ) {
      labels.push(textEl.text.trim());
    }
  }

  // 중복 제거
  return [...new Set(labels)];
};

/**
 * 모든 imageSlot에 이미지가 삽입되고, 연결된 라벨 텍스트가 기본값에서 변경되었는지 확인한다.
 * 버튼 활성화 조건 판별용.
 */
export const isAllVocabFilled = (elements: CanvasElement[]): boolean => {
  const imageSlots = elements.filter(isImageSlotWithLabel);
  if (imageSlots.length === 0) return false;

  return imageSlots.every((slot) => {
    const hasImage =
      slot.fill.startsWith("url(") || slot.fill.startsWith("data:");
    if (!hasImage) return false;

    const textEl = elements.find(
      (el) => el.type === "text" && el.id === slot.labelId,
    );
    return (
      textEl &&
      textEl.type === "text" &&
      textEl.text.trim() !== "" &&
      textEl.text !== DEFAULT_LABEL_TEXT
    );
  });
};

/**
 * 어휘 카드 미충족 사유를 반환한다.
 * 배너 안내 문구 분기용.
 */
export const getVocabUnfilledReason = (
  elements: CanvasElement[],
): "filled" | "missing-image" | "missing-label" => {
  const imageSlots = elements.filter(isImageSlotWithLabel);
  if (imageSlots.length === 0) return "missing-label";

  const hasEmptyImage = imageSlots.some(
    (slot) =>
      !slot.fill.startsWith("url(") && !slot.fill.startsWith("data:"),
  );
  if (hasEmptyImage) return "missing-image";

  const hasEmptyLabel = imageSlots.some((slot) => {
    const textEl = elements.find(
      (el) => el.type === "text" && el.id === slot.labelId,
    );
    return (
      !textEl ||
      textEl.type !== "text" ||
      textEl.text.trim() === "" ||
      textEl.text === DEFAULT_LABEL_TEXT
    );
  });
  if (hasEmptyLabel) return "missing-label";

  return "filled";
};

// 단어 하나의 섹션 높이(mm)
const SECTION_HEIGHT_MM =
  WORD_LABEL_HEIGHT_MM + LABEL_TO_GRID_GAP_MM + VOCAB_CELL_SIZE_MM;

/**
 * 단어 목록을 페이지별로 분할한다 (그리디 채우기).
 */
const splitWordsIntoPages = (words: string[]): string[][] => {
  const availableHeight =
    PAGE_HEIGHT_MM - PAGE_TOP_MARGIN_MM - PAGE_BOTTOM_MARGIN_MM;
  const pageGroups: string[][] = [];
  let currentGroup: string[] = [];
  let currentHeight = 0;

  for (const word of words) {
    const needed =
      SECTION_HEIGHT_MM + (currentGroup.length > 0 ? SECTION_GAP_MM : 0);
    if (currentHeight + needed > availableHeight && currentGroup.length > 0) {
      pageGroups.push(currentGroup);
      currentGroup = [word];
      currentHeight = SECTION_HEIGHT_MM;
    } else {
      currentGroup.push(word);
      currentHeight += needed;
    }
  }

  if (currentGroup.length > 0) {
    pageGroups.push(currentGroup);
  }

  return pageGroups;
};

/**
 * 단어 하나에 대한 따라쓰기 섹션 요소들을 생성한다.
 * 가이드 1묶음 + 빈 칸 2묶음 = 3회 반복.
 */
const buildWordSection = (
  word: string,
  sectionY: number,
): CanvasElement[] => {
  const chars = [...word];
  const charCount = chars.length;
  const cellSizePx = mmToPx(VOCAB_CELL_SIZE_MM);
  const repGapPx = mmToPx(REP_GAP_MM);

  // 가로 폭 계산: 3 × (글자수 × 셀크기) + 2 × 묶음간격
  const repWidthPx = charCount * cellSizePx;
  const totalWidthPx = REPEAT_COUNT * repWidthPx + (REPEAT_COUNT - 1) * repGapPx;
  const startXPx = (mmToPx(PAGE_WIDTH_MM) - totalWidthPx) / 2;

  const elements: CanvasElement[] = [];

  // 단어 라벨 텍스트
  const labelYPx = mmToPx(sectionY);
  elements.push({
    id: crypto.randomUUID(),
    type: "text",
    x: startXPx,
    y: labelYPx,
    w: totalWidthPx,
    h: mmToPx(WORD_LABEL_HEIGHT_MM),
    text: word,
    style: {
      fontSize: LABEL_FONT_SIZE,
      fontWeight: "bold",
      fontFamily: TRACING_FONT_FAMILY,
      color: "#111827",
      underline: false,
      alignX: "left",
      alignY: "middle",
    },
  });

  // 셀 그리드 시작 Y
  const gridYPx = mmToPx(sectionY + WORD_LABEL_HEIGHT_MM + LABEL_TO_GRID_GAP_MM);

  for (let rep = 0; rep < REPEAT_COUNT; rep++) {
    const repStartX = startXPx + rep * (repWidthPx + repGapPx);

    for (let ci = 0; ci < charCount; ci++) {
      const cellX = repStartX + ci * cellSizePx;

      // 셀 배경 (roundRect)
      elements.push({
        id: crypto.randomUUID(),
        type: "roundRect",
        x: cellX,
        y: gridYPx,
        w: cellSizePx,
        h: cellSizePx,
        fill: CELL_FILL,
        radius: mmToPx(1),
        border: {
          enabled: true,
          color: CELL_BORDER_COLOR,
          width: CELL_BORDER_WIDTH,
          style: "solid",
        },
      });

      // 가이드 글자 (첫 번째 묶음에만)
      if (rep === 0) {
        elements.push({
          id: crypto.randomUUID(),
          type: "text",
          x: cellX,
          y: gridYPx,
          w: cellSizePx,
          h: cellSizePx,
          text: chars[ci],
          style: {
            fontSize: GUIDE_FONT_SIZE,
            fontWeight: 700,
            fontFamily: TRACING_FONT_FAMILY,
            color: GUIDE_TEXT_COLOR,
            underline: false,
            alignX: "center",
            alignY: "middle",
          },
        });
      }
    }
  }

  return elements;
};

/**
 * 단어 목록으로부터 따라쓰기 그리드 페이지 배열을 생성한다.
 */
export const buildVocabTracingPages = (
  words: string[],
  orientation: "horizontal" | "vertical" = "vertical",
): Page[] => {
  if (words.length === 0) return [];

  const pageGroups = splitWordsIntoPages(words);

  return pageGroups.map((group) => {
    const availableHeight =
      PAGE_HEIGHT_MM - PAGE_TOP_MARGIN_MM - PAGE_BOTTOM_MARGIN_MM;
    const totalContentHeight = group.length * SECTION_HEIGHT_MM;
    const remainingSpace = availableHeight - totalContentHeight;

    // 동적 간격 계산
    const dynamicGap =
      group.length > 1
        ? Math.min(remainingSpace / (group.length - 1), DYNAMIC_GAP_MAX_MM)
        : 0;

    // 콘텐츠 블록을 세로 중앙에 배치
    const totalWithGaps =
      totalContentHeight + dynamicGap * (group.length - 1);
    const startY =
      PAGE_TOP_MARGIN_MM + (availableHeight - totalWithGaps) / 2;

    const pageElements: CanvasElement[] = [];

    group.forEach((word, index) => {
      const sectionY = startY + index * (SECTION_HEIGHT_MM + dynamicGap);
      pageElements.push(...buildWordSection(word, sectionY));
    });

    return {
      id: crypto.randomUUID(),
      pageNumber: 0, // 삽입 시 재부여됨
      templateId: null,
      orientation,
      elements: withLogoCanvasElements(pageElements),
      rev: 0,
    };
  });
};
