/**
 * 이미지 박스 비율 유지 스케일 계산과 배치 보정 유틸을 제공하는 모듈.
 */
type ImageBox = { x: number; y: number; w: number; h: number };

export const computeScaledImageBox = (
  oldImageBox: ImageBox | undefined,
  newWidth: number,
  newHeight: number,
): ImageBox => {
  if (!oldImageBox) {
    return { x: 0, y: 0, w: newWidth, h: newHeight };
  }

  // w 또는 h가 0이면 비율 계산이 불가능하므로 기본 이미지 박스를 반환한다.
  if (oldImageBox.w === 0 || oldImageBox.h === 0 || newHeight === 0 || newWidth === 0) {
    return { x: 0, y: 0, w: newWidth, h: newHeight };
  }

  const imageAspectRatio = oldImageBox.w / oldImageBox.h;
  const newElementAspectRatio = newWidth / newHeight;

  let newBoxW: number;
  let newBoxH: number;

  if (imageAspectRatio > newElementAspectRatio) {
    newBoxH = newHeight;
    newBoxW = newHeight * imageAspectRatio;
  } else {
    newBoxW = newWidth;
    newBoxH = newWidth / imageAspectRatio;
  }

  // 크롭 오프셋 비율 유지 — 크롭한 위치가 리사이즈 후에도 고정
  const scaleW = newBoxW / oldImageBox.w;
  const scaleH = newBoxH / oldImageBox.h;

  return {
    x: oldImageBox.x * scaleW,
    y: oldImageBox.y * scaleH,
    w: newBoxW,
    h: newBoxH,
  };
};

export const isImageFillElement = (element: {
  type: string;
  fill?: string;
}): boolean =>
  (element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse" ||
    element.type === "mosaic" ||
    element.type === "circleMosaic" ||
    element.type === "aacCard" ||
    element.type === "emotionCard") &&
  !!element.fill &&
  (element.fill.startsWith("url(") || element.fill.startsWith("data:"));
