/**
 * 스토리 시퀀스 카드 생성과 문장 분할 보조 유틸을 제공하는 모듈.
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

/**
 * 스토리 시퀀스 카드 템플릿 요소를 생성한다.
 * 카드 배치 방향/비율/용지 방향을 동일 계산식으로 맞춰 미리보기와 실제 삽입 결과를 일치시킨다.
 */
export const buildStorySequenceElements = ({
  count,
  direction,
  orientation,
  ratio,
}: StorySequenceConfig): TemplateElement[] => {
  const pageWidthMm = orientation === "horizontal" ? 297 : 210;
  const pageHeightMm = orientation === "horizontal" ? 210 : 297;
  const paddingMm = 14;
  const gapMm = 8;
  const titleHeightMm = 10;
  const titleGapMm = 6;
  const contentWidthMm = pageWidthMm - paddingMm * 2;
  const contentHeightMm =
    pageHeightMm - paddingMm * 2 - titleHeightMm - titleGapMm;
  const cappedCount = Math.max(1, Math.min(count, 8));
  const maxPrimary = 4;
  const maxColumns = direction === "left-to-right" ? maxPrimary : 2;
  const maxRows = direction === "left-to-right" ? 2 : maxPrimary;
  const cellWidthMm =
    (contentWidthMm - gapMm * (maxColumns - 1)) / maxColumns;
  const cellHeightMm =
    (contentHeightMm - gapMm * (maxRows - 1)) / maxRows;
  const ratioValue = ratio === "16:9" ? 16 / 9 : 4 / 3;
  const cardWidthMm = Math.min(cellWidthMm, cellHeightMm * ratioValue);
  const cardHeightMm = cardWidthMm / ratioValue;
  const columns =
    direction === "left-to-right"
      ? Math.min(cappedCount, maxColumns)
      : Math.ceil(cappedCount / Math.min(cappedCount, maxRows));
  const rows =
    direction === "left-to-right"
      ? Math.ceil(cappedCount / columns)
      : Math.min(cappedCount, maxRows);
  const gridWidthMm =
    columns * cellWidthMm + gapMm * Math.max(0, columns - 1);
  const gridHeightMm =
    rows * cellHeightMm + gapMm * Math.max(0, rows - 1);
  const startXmm = paddingMm + (contentWidthMm - gridWidthMm) / 2;
  const startYmm =
    paddingMm + titleHeightMm + titleGapMm + (contentHeightMm - gridHeightMm) / 2;
  const elements: TemplateElement[] = [];

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

  for (let index = 0; index < cappedCount; index += 1) {
    const row =
      direction === "left-to-right"
        ? Math.floor(index / columns)
        : index % rows;
    const col =
      direction === "left-to-right"
        ? index % columns
        : Math.floor(index / rows);
    // 방향 설정에 따라 row/col 계산 기준을 바꿔 동일 데이터로 가로/세로 흐름을 지원한다.
    const cellX = startXmm + col * (cellWidthMm + gapMm);
    const cellY = startYmm + row * (cellHeightMm + gapMm);
    const cardX = mmToPx(cellX + (cellWidthMm - cardWidthMm) / 2);
    const cardY = mmToPx(cellY + (cellHeightMm - cardHeightMm) / 2);
    const cardWidth = mmToPx(cardWidthMm);
    const cardHeight = mmToPx(cardHeightMm);
    const radius = Math.min(mmToPx(8), Math.min(cardWidth, cardHeight) / 2);
    const textSize = Math.max(14, Math.min(24, cardHeight * 0.2));

    // 카드 배경과 번호 텍스트를 분리해 이후 이미지/텍스트 교체 템플릿으로도 재사용 가능하게 한다.
    elements.push({
      type: "roundRect",
      x: cardX,
      y: cardY,
      w: cardWidth,
      h: cardHeight,
      fill: "#ffffff",
      radius,
      border: {
        enabled: true,
        color: "#E5E7EB",
        width: 2,
        style: "solid",
      },
    });

    elements.push({
      type: "text",
      x: cardX,
      y: cardY,
      w: cardWidth,
      h: cardHeight,
      text: String(index + 1),
      locked: true,
      style: {
        fontSize: textSize,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    });
  }

  return elements;
};
