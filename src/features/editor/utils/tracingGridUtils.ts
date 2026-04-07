/**
 * 어휘 학습 카드에서 목표 어휘를 추출하고
 * 따라쓰기 그리드 페이지를 생성하는 유틸리티.
 */
import type { CanvasElement, ShapeElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import { withLogoCanvasElements } from "./logoElement";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// ────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────

export type VocabCellSize = "small" | "medium" | "large";

export type VocabItem = {
  label: string;
  imageUrl: string;
};

// ────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────

const TRACING_FONT_FAMILY = "Hakgyoansim Badasseugi";

/** 셀 크기 프리셋 */
export const CELL_SIZE_PRESETS: Record<
  VocabCellSize,
  { cellMm: number; guideFontSize: number; label: string }
> = {
  small: { cellMm: 13, guideFontSize: 32, label: "작게" },
  medium: { cellMm: 16, guideFontSize: 40, label: "중간" },
  large: { cellMm: 20, guideFontSize: 48, label: "크게" },
};

const MAX_REPEAT_COUNT = 3;
const ROW_GAP_MM = 2;
const REP_GAP_MM = 3;
const IMAGE_TO_GRID_GAP_MM = 3;
const IMAGE_SIZE_MM = 48;
const SECTION_GAP_MM = 5;
const SIDE_MARGIN_MM = 10;
const PAGE_TOP_MARGIN_MM = 16;
const PAGE_BOTTOM_MARGIN_MM = 16;
const DYNAMIC_GAP_MAX_MM = 20;

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

const CELL_BORDER_COLOR = "#9CA3AF";
const CELL_BORDER_WIDTH = 1.2;
const CELL_FILL = "#FFFFFF";
const GUIDE_TEXT_COLOR = "#D1D5DB";

const DEFAULT_LABEL_TEXT = "목표 어휘";

// ────────────────────────────────────────────
// 타입 가드
// ────────────────────────────────────────────

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

// ────────────────────────────────────────────
// 데이터 추출
// ────────────────────────────────────────────

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

  return [...new Set(labels)];
};

/**
 * 어휘 학습 카드 페이지에서 단어 + 이미지 URL을 함께 추출한다.
 * 따라쓰기 그리드에 이미지를 표시하기 위해 사용.
 */
export const extractVocabData = (elements: CanvasElement[]): VocabItem[] => {
  const imageSlots = elements.filter(isImageSlotWithLabel);
  const seen = new Set<string>();
  const items: VocabItem[] = [];

  for (const slot of imageSlots) {
    const textEl = elements.find(
      (el) => el.type === "text" && el.id === slot.labelId,
    );
    if (
      !textEl ||
      textEl.type !== "text" ||
      textEl.text.trim() === "" ||
      textEl.text === DEFAULT_LABEL_TEXT
    ) {
      continue;
    }

    const label = textEl.text.trim();
    if (seen.has(label)) continue;
    seen.add(label);

    // fill은 "url(...)" 또는 "data:..." 형식 — 그대로 사용
    const imageUrl =
      slot.fill.startsWith("url(") || slot.fill.startsWith("data:")
        ? slot.fill
        : "";

    items.push({ label, imageUrl });
  }

  return items;
};

// ────────────────────────────────────────────
// 버튼 활성화 검증 (기존 유지)
// ────────────────────────────────────────────

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

// ────────────────────────────────────────────
// A4 폭 적합성 검증
// ────────────────────────────────────────────

/** 그리드에 사용할 수 있는 가용 폭(mm) */
const availableGridWidthMm = () =>
  PAGE_WIDTH_MM - SIDE_MARGIN_MM - IMAGE_SIZE_MM - IMAGE_TO_GRID_GAP_MM - SIDE_MARGIN_MM;

/**
 * 주어진 글자 수와 셀 크기에서 가능한 반복 횟수를 계산한다.
 * 글자 수가 적으면 반복 횟수가 많고, 글자 수가 많으면 줄어든다. 최소 1회 보장.
 */
export const calcRepeatCount = (
  charCount: number,
  cellMm: number,
): number => {
  const oneRepMm = charCount * cellMm;
  const available = availableGridWidthMm();
  // (N × oneRep) + (N-1) × gap ≤ available → N ≤ (available + gap) / (oneRep + gap)
  const maxReps = Math.floor((available + REP_GAP_MM) / (oneRepMm + REP_GAP_MM));
  return Math.min(Math.max(maxReps, 1), MAX_REPEAT_COUNT);
};

/** 주어진 글자 수와 셀 크기가 A4 폭에 최소 1회라도 들어가는지 검증 */
export const canFitInPage = (
  maxCharCount: number,
  cellSize: VocabCellSize,
): boolean => {
  const { cellMm } = CELL_SIZE_PRESETS[cellSize];
  return calcRepeatCount(maxCharCount, cellMm) >= 1;
};

// ────────────────────────────────────────────
// 그리드 레이아웃 생성
// ────────────────────────────────────────────

/** 단어 하나의 섹션 높이(mm) — 이미지와 그리드 중 큰 쪽 */
const sectionHeightMm = (cellMm: number) =>
  Math.max(IMAGE_SIZE_MM, 2 * cellMm + ROW_GAP_MM);

/** 단어 목록을 페이지별로 분할 (그리디 채우기) */
const splitItemsIntoPages = (
  items: VocabItem[],
  cellMm: number,
): VocabItem[][] => {
  const availableHeight =
    PAGE_HEIGHT_MM - PAGE_TOP_MARGIN_MM - PAGE_BOTTOM_MARGIN_MM;
  const secHeight = sectionHeightMm(cellMm);
  const pageGroups: VocabItem[][] = [];
  let currentGroup: VocabItem[] = [];
  let currentHeight = 0;

  for (const item of items) {
    const needed = secHeight + (currentGroup.length > 0 ? SECTION_GAP_MM : 0);
    if (currentHeight + needed > availableHeight && currentGroup.length > 0) {
      pageGroups.push(currentGroup);
      currentGroup = [item];
      currentHeight = secHeight;
    } else {
      currentGroup.push(item);
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
 * 왼쪽: 이미지 (정사각형, 고정 크기)
 * 오른쪽: N열 × 2행 (1행: 가이드 글자, 2행: 빈칸)
 * 반복 횟수는 글자 수에 따라 동적으로 결정된다.
 */
const buildWordSection = (
  item: VocabItem,
  sectionY: number,
  cellMm: number,
  guideFontSize: number,
): CanvasElement[] => {
  const chars = [...item.label];
  const charCount = chars.length;
  const cellSizePx = mmToPx(cellMm);
  const repGapPx = mmToPx(REP_GAP_MM);
  const rowGapPx = mmToPx(ROW_GAP_MM);
  const imageToGridGapPx = mmToPx(IMAGE_TO_GRID_GAP_MM);

  const imageSizePx = mmToPx(IMAGE_SIZE_MM);
  const gridHeightPx = 2 * cellSizePx + rowGapPx;

  // 섹션 높이는 이미지와 그리드 중 큰 쪽
  const sectionHeightPx = Math.max(imageSizePx, gridHeightPx);

  // 글자 수에 따른 동적 반복 횟수
  const repeatCount = calcRepeatCount(charCount, cellMm);

  // 좌측 정렬
  const startXPx = mmToPx(SIDE_MARGIN_MM);
  const sectionYPx = mmToPx(sectionY);

  // 그리드를 이미지 높이 기준으로 세로 중앙 정렬
  const gridYOffset = (sectionHeightPx - gridHeightPx) / 2;

  const elements: CanvasElement[] = [];

  // ── 이미지 요소 (테두리 없음) ──
  const hasImage = item.imageUrl.length > 0;
  elements.push({
    id: crypto.randomUUID(),
    type: "roundRect" as const,
    x: startXPx,
    y: sectionYPx,
    w: imageSizePx,
    h: imageSizePx,
    fill: hasImage ? item.imageUrl : "#F3F4F6",
    radius: mmToPx(1.5),
    ...(hasImage
      ? {
          imageBox: { x: 0, y: 0, w: imageSizePx, h: imageSizePx },
          isStandaloneImage: true as const,
        }
      : {}),
  });

  // ── 그리드 시작 X ──
  const repWidthPx = charCount * cellSizePx;
  const gridStartX = startXPx + imageSizePx + imageToGridGapPx;

  // ── 2행 × N묶음 셀 (N = 글자 수에 따른 동적 반복 횟수) ──
  for (let row = 0; row < 2; row++) {
    const rowY = sectionYPx + gridYOffset + row * (cellSizePx + rowGapPx);

    for (let rep = 0; rep < repeatCount; rep++) {
      const repStartX = gridStartX + rep * (repWidthPx + repGapPx);

      for (let ci = 0; ci < charCount; ci++) {
        const cellX = repStartX + ci * cellSizePx;

        // 셀 배경
        elements.push({
          id: crypto.randomUUID(),
          type: "roundRect" as const,
          x: cellX,
          y: rowY,
          w: cellSizePx,
          h: cellSizePx,
          fill: CELL_FILL,
          radius: mmToPx(1),
          border: {
            enabled: true,
            color: CELL_BORDER_COLOR,
            width: CELL_BORDER_WIDTH,
            style: "solid" as const,
          },
        });

        // 가이드 글자 (1행에만)
        if (row === 0) {
          elements.push({
            id: crypto.randomUUID(),
            type: "text" as const,
            x: cellX,
            y: rowY,
            w: cellSizePx,
            h: cellSizePx,
            text: chars[ci],
            style: {
              fontSize: guideFontSize,
              fontWeight: 700,
              fontFamily: TRACING_FONT_FAMILY,
              color: GUIDE_TEXT_COLOR,
              underline: false as const,
              alignX: "center" as const,
              alignY: "middle" as const,
            },
          });
        }
      }
    }
  }

  return elements;
};

/**
 * 단어+이미지 목록으로부터 따라쓰기 그리드 페이지 배열을 생성한다.
 */
export const buildVocabTracingPages = (
  vocabItems: VocabItem[],
  orientation: "horizontal" | "vertical" = "vertical",
  cellSize: VocabCellSize = "medium",
): Page[] => {
  if (vocabItems.length === 0) return [];

  const { cellMm, guideFontSize } = CELL_SIZE_PRESETS[cellSize];
  const secHeight = sectionHeightMm(cellMm);
  const pageGroups = splitItemsIntoPages(vocabItems, cellMm);

  return pageGroups.map((group) => {
    const availableHeight =
      PAGE_HEIGHT_MM - PAGE_TOP_MARGIN_MM - PAGE_BOTTOM_MARGIN_MM;
    const totalContentHeight = group.length * secHeight;
    const remainingSpace = availableHeight - totalContentHeight;

    // 동적 간격 계산
    const dynamicGap =
      group.length > 1
        ? Math.min(remainingSpace / (group.length - 1), DYNAMIC_GAP_MAX_MM)
        : 0;

    // 세로 중앙 배치
    const totalWithGaps = totalContentHeight + dynamicGap * (group.length - 1);
    const startY =
      PAGE_TOP_MARGIN_MM + (availableHeight - totalWithGaps) / 2;

    const pageElements: CanvasElement[] = [];

    group.forEach((item, index) => {
      const sectionY = startY + index * (secHeight + dynamicGap);
      pageElements.push(
        ...buildWordSection(item, sectionY, cellMm, guideFontSize),
      );
    });

    return {
      id: crypto.randomUUID(),
      pageNumber: 0,
      templateId: null,
      orientation,
      elements: withLogoCanvasElements(pageElements),
      rev: 0,
    };
  });
};
