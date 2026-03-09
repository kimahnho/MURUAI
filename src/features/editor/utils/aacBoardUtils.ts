/**
 * AAC 카드/라벨 레이아웃 생성과 위치 계산 유틸을 제공하는 모듈.
 */
import type { AacCardElement, TemplateElement } from "../model/canvasTypes";

export type AacLabelPosition = "top" | "bottom" | "none";

export type AacBoardConfig = {
  rows: number;
  columns: number;
  orientation: "horizontal" | "vertical";
  labelPosition: AacLabelPosition;
};

export type AacBoardElement = TemplateElement & {
  tempId?: string;
  labelId?: string;
};

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;
const snapPx = (value: number) => Math.round(value * 2) / 2;
const clampPx = (value: number) => Math.max(1, snapPx(value));

export const buildAacBoardElements = ({
  rows,
  columns,
  orientation,
  labelPosition,
}: AacBoardConfig): AacBoardElement[] => {
  const pageWidthMm = orientation === "horizontal" ? 297 : 210;
  const pageHeightMm = orientation === "horizontal" ? 210 : 297;
  const paddingTopMm = 18;
  const paddingBottomMm = 12;
  const paddingHorizontalMm = 12;
  const gapMm = 6;
  const contentWidthMm = pageWidthMm - paddingHorizontalMm * 2;
  const contentHeightMm = pageHeightMm - paddingTopMm - paddingBottomMm;

  // 박스 크기를 150x150px로 고정
  // 용지 방향, 그리드 크기와 관계없이 동일한 박스 크기 유지
  const fixedBoxSizePx = 150;
  const boxInset = snapPx(mmToPx(1)); // 박스 안쪽 여백이 적용되므로 셀 크기를 미리 보정
  const cellSizePx = fixedBoxSizePx + boxInset * 2;
  const cellWidthMm = cellSizePx / MM_TO_PX;
  const cellHeightMm = cellSizePx / MM_TO_PX;

  // 실제 그리드의 전체 크기 계산
  const totalGridWidthMm = columns * cellWidthMm + gapMm * (columns - 1);
  const totalGridHeightMm = rows * cellHeightMm + gapMm * (rows - 1);

  // 그리드를 페이지 중앙에 배치하기 위한 시작 오프셋 계산
  const startXMm =
    paddingHorizontalMm + (contentWidthMm - totalGridWidthMm) / 2;
  const startYMm = paddingTopMm + (contentHeightMm - totalGridHeightMm) / 2;
  const maxLabelHeightMm = 12;
  const labelInset = snapPx(mmToPx(0)); // 라벨 위치 미세 보정
  const labelGap = snapPx(mmToPx(2)); // 이미지와 라벨 사이 간격
  const imagePadding = snapPx(mmToPx(0)); // 이미지 영역 내부 여백
  const labelFontSize = 18;
  const elements: AacBoardElement[] = [];
  let cellIndex = 0;

  for (let col = 0; col < columns; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const cardTempId = `aac-card-${cellIndex}`;
      const labelTempId = `aac-label-${cellIndex}`;
      const cellX = snapPx(mmToPx(startXMm + col * (cellWidthMm + gapMm)));
      const cellY = snapPx(mmToPx(startYMm + row * (cellHeightMm + gapMm)));
      const cellWidth = snapPx(mmToPx(cellWidthMm));
      const cellHeight = snapPx(mmToPx(cellHeightMm));
      const boxWidth = clampPx(cellWidth - boxInset * 2);
      const boxHeight = clampPx(cellHeight - boxInset * 2);
      const boxX = snapPx(cellX + (cellWidth - boxWidth) / 2);
      const boxY = snapPx(cellY + (cellHeight - boxHeight) / 2);
      const maxLabelHeight = snapPx(mmToPx(maxLabelHeightMm));
      const labelHeight =
        labelPosition === "none"
          ? 0
          : clampPx(Math.min(maxLabelHeight, Math.max(0, boxHeight * 0.22))); // 라벨 높이 비율을 낮춰 이미지 영역을 확보
      const labelY =
        labelPosition === "top"
          ? boxY + labelInset
          : labelPosition === "bottom"
            ? boxY + boxHeight - labelHeight - labelInset
            : boxY;
      const labelAreaHeight =
        labelPosition === "none" ? 0 : labelHeight + labelGap;
      const imageAreaX = boxX + imagePadding;
      const imageAreaWidth = Math.max(1, boxWidth - imagePadding * 2);
      const imageAreaY =
        boxY + imagePadding + (labelPosition === "top" ? labelAreaHeight : 0);
      const imageAreaHeight = Math.max(
        1,
        boxHeight - imagePadding * 2 - labelAreaHeight,
      );
      const imageBoxSize = clampPx(
        Math.min(imageAreaWidth, imageAreaHeight) * 1.5,
      );
      // 이미지를 박스 내부 이미지 영역 중앙에 상대 좌표로 배치한다.
      const imageRelX = snapPx(
        imageAreaX - boxX + (imageAreaWidth - imageBoxSize) / 2,
      );
      const imageOffsetY = snapPx(mmToPx(2)); // 시각 중심 보정을 위해 Y축으로 소폭 이동
      const imageRelY = snapPx(
        imageAreaY - boxY + (imageAreaHeight - imageBoxSize) / 2 + imageOffsetY,
      );
      const radius = 0;

      elements.push({
        type: "roundRect",
        x: boxX,
        y: boxY,
        w: boxWidth,
        h: boxHeight,
        fill: "#ffffff",
        radius,
        imageBox: {
          x: imageRelX,
          y: imageRelY,
          w: imageBoxSize,
          h: imageBoxSize,
        },
        border: {
          enabled: true,
          color: "#000000",
          width: 2,
          style: "solid",
        },
        subType: "aacCard",
        tempId: cardTempId,
        labelId: labelPosition !== "none" ? labelTempId : undefined,
      });

      if (labelPosition !== "none" && labelHeight > 0) {
        elements.push({
          type: "text",
          x: boxX,
          y: labelY,
          w: boxWidth,
          h: labelHeight,
          text: "단어",
          widthMode: "auto",
          lockHeight: true,
          style: {
            fontSize: labelFontSize,
            fontWeight: "normal",
            color: "#000000",
            underline: false,
            alignX: "center",
            alignY: "middle",
          },
          tempId: labelTempId,
        });
      }

      cellIndex += 1;
    }
  }

  return elements;
};

/**
 * V2: 이미지 + 라벨을 하나의 복합 요소로 생성하는 AAC 보드 빌더.
 * 기존 buildAacBoardElements는 레거시 호환용으로 유지한다.
 */
export const buildAacBoardElementsV2 = ({
  rows,
  columns,
  orientation,
  labelPosition,
}: AacBoardConfig): Omit<AacCardElement, "id">[] => {
  const pageWidthMm = orientation === "horizontal" ? 297 : 210;
  const pageHeightMm = orientation === "horizontal" ? 210 : 297;
  const paddingTopMm = 18;
  const paddingBottomMm = 12;
  const paddingHorizontalMm = 12;
  const gapMm = 6;
  const contentWidthMm = pageWidthMm - paddingHorizontalMm * 2;
  const contentHeightMm = pageHeightMm - paddingTopMm - paddingBottomMm;

  const fixedBoxSizePx = 150;
  const boxInset = snapPx(mmToPx(1));
  const cellSizePx = fixedBoxSizePx + boxInset * 2;
  const cellWidthMm = cellSizePx / MM_TO_PX;
  const cellHeightMm = cellSizePx / MM_TO_PX;

  const totalGridWidthMm = columns * cellWidthMm + gapMm * (columns - 1);
  const totalGridHeightMm = rows * cellHeightMm + gapMm * (rows - 1);

  const startXMm =
    paddingHorizontalMm + (contentWidthMm - totalGridWidthMm) / 2;
  const startYMm = paddingTopMm + (contentHeightMm - totalGridHeightMm) / 2;
  const labelGap = snapPx(mmToPx(2));
  const imagePadding = snapPx(mmToPx(0));
  const maxLabelHeightMm = 12;

  const elements: Omit<AacCardElement, "id">[] = [];

  for (let col = 0; col < columns; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const cellX = snapPx(mmToPx(startXMm + col * (cellWidthMm + gapMm)));
      const cellY = snapPx(mmToPx(startYMm + row * (cellHeightMm + gapMm)));
      const cellWidth = snapPx(mmToPx(cellWidthMm));
      const cellHeight = snapPx(mmToPx(cellHeightMm));
      const boxWidth = clampPx(cellWidth - boxInset * 2);
      const boxHeight = clampPx(cellHeight - boxInset * 2);
      const boxX = snapPx(cellX + (cellWidth - boxWidth) / 2);
      const boxY = snapPx(cellY + (cellHeight - boxHeight) / 2);
      const maxLabelHeight = snapPx(mmToPx(maxLabelHeightMm));
      const labelHeight =
        labelPosition === "none"
          ? 0
          : clampPx(Math.min(maxLabelHeight, Math.max(0, boxHeight * 0.22)));
      const labelAreaHeight =
        labelPosition === "none" ? 0 : labelHeight + labelGap;
      const imageAreaX = boxX + imagePadding;
      const imageAreaWidth = Math.max(1, boxWidth - imagePadding * 2);
      const imageAreaY =
        boxY + imagePadding + (labelPosition === "top" ? labelAreaHeight : 0);
      const imageAreaHeight = Math.max(
        1,
        boxHeight - imagePadding * 2 - labelAreaHeight,
      );
      const imageBoxSize = clampPx(
        Math.min(imageAreaWidth, imageAreaHeight) * 1.5,
      );
      const imageRelX = snapPx(
        imageAreaX - boxX + (imageAreaWidth - imageBoxSize) / 2,
      );
      const imageOffsetY = snapPx(mmToPx(2));
      const imageRelY = snapPx(
        imageAreaY - boxY + (imageAreaHeight - imageBoxSize) / 2 + imageOffsetY,
      );

      elements.push({
        type: "aacCard",
        x: boxX,
        y: boxY,
        w: boxWidth,
        h: boxHeight,
        fill: "#ffffff",
        radius: 0,
        imageBox: {
          x: imageRelX,
          y: imageRelY,
          w: imageBoxSize,
          h: imageBoxSize,
        },
        border: {
          enabled: true,
          color: "#000000",
          width: 2,
          style: "solid",
        },
        label: {
          text: "단어",
          position: labelPosition,
          style: {
            fontSize: 18,
            fontWeight: "normal",
            color: "#000000",
          },
        },
      });
    }
  }

  return elements;
};
