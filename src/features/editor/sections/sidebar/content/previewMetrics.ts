/**
 * 사이드바 미리보기 캔버스의 크기/배율 계산 규칙을 제공하는 모듈.
 */
const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;
const PREVIEW_BOX_WIDTH = 240;
const PREVIEW_BOX_HEIGHT = 180;

export type PreviewMetrics = {
  boxWidth: number;
  boxHeight: number;
  baseWidth: number;
  baseHeight: number;
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
};

export const getPreviewMetrics = (
  orientation: "vertical" | "horizontal",
): PreviewMetrics => {
  const baseWidth =
    orientation === "horizontal" ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
  const baseHeight =
    orientation === "horizontal" ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
  const scale = Math.min(
    PREVIEW_BOX_WIDTH / baseWidth,
    PREVIEW_BOX_HEIGHT / baseHeight,
  );
  return {
    boxWidth: PREVIEW_BOX_WIDTH,
    boxHeight: PREVIEW_BOX_HEIGHT,
    baseWidth,
    baseHeight,
    scale,
    scaledWidth: baseWidth * scale,
    scaledHeight: baseHeight * scale,
  };
};
