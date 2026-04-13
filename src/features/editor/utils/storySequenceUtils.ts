/**
 * 이야기 순서 맞추기 카드 생성 유틸.
 * 카드 수별 자동 최적화 레이아웃 + imageSlot + 번호 뱃지 + 화살표 자동 생성.
 */
import type { TemplateElement } from "../model/canvasTypes";

export type StoryDirection = "left-to-right" | "top-to-bottom";
export type StoryCardRatio = "4:3" | "16:9";

export type StorySequenceConfig = {
  count: number;
  direction: StoryDirection;
  orientation: "horizontal" | "vertical";
  ratio: StoryCardRatio;
};

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// 카드 수별 최적 레이아웃 (행당 카드 수 배열)
const LAYOUTS_LTR: Record<number, number[]> = {
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [4, 3],
  8: [4, 4],
};

// 위→아래 방향: 열당 카드 수 배열
const LAYOUTS_TTB: Record<number, number[]> = {
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [4, 3],
  8: [4, 4],
};

type CardPosition = {
  x: number; // mm
  y: number;
  w: number;
  h: number;
  index: number;
  row: number;
  col: number;
};

/**
 * 카드 위치 배열을 계산한다.
 */
const computeCardPositions = (
  config: StorySequenceConfig,
  contentWidthMm: number,
  contentHeightMm: number,
  startXmm: number,
  startYmm: number,
): CardPosition[] => {
  const { count, direction, ratio } = config;
  const gapMm = 6;
  const cappedCount = Math.max(4, Math.min(count, 8));
  const ratioValue = ratio === "16:9" ? 16 / 9 : 4 / 3;

  if (direction === "left-to-right") {
    const rowLayout = LAYOUTS_LTR[cappedCount] ?? [cappedCount];
    const maxCols = Math.max(...rowLayout);
    const numRows = rowLayout.length;

    const cellWidthMm = (contentWidthMm - gapMm * (maxCols - 1)) / maxCols;
    const cellHeightMm = (contentHeightMm - gapMm * (numRows - 1)) / numRows;

    const cardWidthMm = Math.min(cellWidthMm, cellHeightMm * ratioValue);
    const cardHeightMm = cardWidthMm / ratioValue;

    const gridWidthMm = maxCols * cellWidthMm + (maxCols - 1) * gapMm;
    const gridHeightMm = numRows * cellHeightMm + (numRows - 1) * gapMm;
    const gridOffsetX = (contentWidthMm - gridWidthMm) / 2;
    const gridOffsetY = (contentHeightMm - gridHeightMm) / 2;

    const positions: CardPosition[] = [];
    let cardIndex = 0;
    for (let r = 0; r < numRows; r++) {
      const cardsInRow = rowLayout[r];
      const rowWidthMm = cardsInRow * cellWidthMm + (cardsInRow - 1) * gapMm;
      const rowOffsetX = (gridWidthMm - rowWidthMm) / 2;

      for (let c = 0; c < cardsInRow; c++) {
        const cellX = startXmm + gridOffsetX + rowOffsetX + c * (cellWidthMm + gapMm);
        const cellY = startYmm + gridOffsetY + r * (cellHeightMm + gapMm);
        positions.push({
          x: cellX + (cellWidthMm - cardWidthMm) / 2,
          y: cellY + (cellHeightMm - cardHeightMm) / 2,
          w: cardWidthMm,
          h: cardHeightMm,
          index: cardIndex,
          row: r,
          col: c,
        });
        cardIndex++;
      }
    }
    return positions;
  }

  // top-to-bottom: 열 우선
  const colLayout = LAYOUTS_TTB[cappedCount] ?? [cappedCount];
  const maxRows = Math.max(...colLayout);
  const numCols = colLayout.length;

  const cellWidthMm = (contentWidthMm - gapMm * (numCols - 1)) / numCols;
  const cellHeightMm = (contentHeightMm - gapMm * (maxRows - 1)) / maxRows;

  const cardWidthMm = Math.min(cellWidthMm, cellHeightMm * ratioValue);
  const cardHeightMm = cardWidthMm / ratioValue;

  const gridWidthMm = numCols * cellWidthMm + (numCols - 1) * gapMm;
  const gridHeightMm = maxRows * cellHeightMm + (maxRows - 1) * gapMm;
  const gridOffsetX = (contentWidthMm - gridWidthMm) / 2;
  const gridOffsetY = (contentHeightMm - gridHeightMm) / 2;

  const positions: CardPosition[] = [];
  let cardIndex = 0;
  for (let c = 0; c < numCols; c++) {
    const cardsInCol = colLayout[c];
    const colHeightMm = cardsInCol * cellHeightMm + (cardsInCol - 1) * gapMm;
    const colOffsetY = (gridHeightMm - colHeightMm) / 2;

    for (let r = 0; r < cardsInCol; r++) {
      const cellX = startXmm + gridOffsetX + c * (cellWidthMm + gapMm);
      const cellY = startYmm + gridOffsetY + colOffsetY + r * (cellHeightMm + gapMm);
      positions.push({
        x: cellX + (cellWidthMm - cardWidthMm) / 2,
        y: cellY + (cellHeightMm - cardHeightMm) / 2,
        w: cardWidthMm,
        h: cardHeightMm,
        index: cardIndex,
        row: r,
        col: c,
      });
      cardIndex++;
    }
  }
  return positions;
};

/**
 * 이야기 순서 맞추기 템플릿 요소를 생성한다.
 */
export const buildStorySequenceElements = (
  config: StorySequenceConfig,
): TemplateElement[] => {
  const { count, direction, orientation } = config;
  const paddingMm = 6;
  const titleHeightMm = 7;
  const titleGapMm = 3;
  const badgeSizeMm = 5;
  const arrowPaddingMm = 1;

  // 6개 이상이면 가로 모드 강제 — 카드 크기 최대화
  const effectiveOrientation = count >= 6 ? "horizontal" : orientation;
  const pageWidthMm = effectiveOrientation === "horizontal" ? 297 : 210;
  const pageHeightMm = effectiveOrientation === "horizontal" ? 210 : 297;
  const contentWidthMm = pageWidthMm - paddingMm * 2;
  const contentHeightMm = pageHeightMm - paddingMm * 2 - titleHeightMm - titleGapMm;
  const startXmm = paddingMm;
  const startYmm = paddingMm + titleHeightMm + titleGapMm;

  const positions = computeCardPositions(config, contentWidthMm, contentHeightMm, startXmm, startYmm);

  const elements: TemplateElement[] = [];

  // 타이틀
  elements.push({
    type: "text",
    x: mmToPx(paddingMm),
    y: mmToPx(paddingMm),
    w: mmToPx(contentWidthMm),
    h: mmToPx(titleHeightMm),
    text: "이야기 장면 순서 맞추기",
    style: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#111827",
      underline: false,
      alignX: "center",
      alignY: "middle",
    },
  });

  // 카드 생성
  for (const pos of positions) {
    const cardX = mmToPx(pos.x);
    const cardY = mmToPx(pos.y);
    const cardW = mmToPx(pos.w);
    const cardH = mmToPx(pos.h);
    const radius = Math.min(mmToPx(6), Math.min(cardW, cardH) / 2);

    // 이미지 슬롯 (드래그 앤 드롭 대상)
    elements.push({
      type: "roundRect",
      subType: "imageSlot",
      x: cardX,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: "#F3F4F6",
      radius,
      border: {
        enabled: true,
        color: "#D1D5DB",
        width: 2,
        style: "dashed",
      },
    });

    // 번호 뱃지 (좌상단)
    const badgeSize = mmToPx(badgeSizeMm);
    const badgeX = cardX + mmToPx(2);
    const badgeY = cardY + mmToPx(2);

    elements.push({
      type: "ellipse",
      x: badgeX,
      y: badgeY,
      w: badgeSize,
      h: badgeSize,
      fill: "#7C3AED",
      locked: true,
      selectable: false,
    });

    elements.push({
      type: "text",
      x: badgeX,
      y: badgeY,
      w: badgeSize,
      h: badgeSize,
      text: String(pos.index + 1),
      locked: true,
      selectable: false,
      style: {
        fontSize: Math.max(10, Math.min(14, badgeSize * 0.6)),
        fontWeight: "bold",
        color: "#FFFFFF",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    });
  }

  // 화살표 자동 생성 (연속 카드 사이)
  for (let i = 0; i < positions.length - 1; i++) {
    const curr = positions[i];
    const next = positions[i + 1];
    const currPx = { x: mmToPx(curr.x), y: mmToPx(curr.y), w: mmToPx(curr.w), h: mmToPx(curr.h) };
    const nextPx = { x: mmToPx(next.x), y: mmToPx(next.y), w: mmToPx(next.w), h: mmToPx(next.h) };
    const pad = mmToPx(arrowPaddingMm);

    let start: { x: number; y: number };
    let end: { x: number; y: number };

    const sameRow = direction === "left-to-right" && curr.row === next.row;
    const sameCol = direction === "top-to-bottom" && curr.col === next.col;

    if (direction === "left-to-right") {
      if (sameRow) {
        // 같은 행: →
        start = { x: currPx.x + currPx.w + pad, y: currPx.y + currPx.h / 2 };
        end = { x: nextPx.x - pad, y: nextPx.y + nextPx.h / 2 };
      } else {
        // 행 전환: ↓
        start = { x: currPx.x + currPx.w / 2, y: currPx.y + currPx.h + pad };
        end = { x: nextPx.x + nextPx.w / 2, y: nextPx.y - pad };
      }
    } else {
      if (sameCol) {
        // 같은 열: ↓
        start = { x: currPx.x + currPx.w / 2, y: currPx.y + currPx.h + pad };
        end = { x: nextPx.x + nextPx.w / 2, y: nextPx.y - pad };
      } else {
        // 열 전환: →
        start = { x: currPx.x + currPx.w + pad, y: currPx.y + currPx.h / 2 };
        end = { x: nextPx.x - pad, y: nextPx.y + nextPx.h / 2 };
      }
    }

    elements.push({
      type: "arrow",
      start,
      end,
      stroke: { color: "#9CA3AF", width: 2, style: "solid" },
      marker: { start: false, end: true },
    });
  }

  return elements;
};
