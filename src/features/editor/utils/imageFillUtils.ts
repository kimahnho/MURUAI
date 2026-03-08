/**
 * 이미지 채우기 대상 판별과 AAC 연동 보조 유틸을 제공하는 모듈.
 */
import type { CanvasElement } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

export const isAacLabelElement = (
  element: CanvasElement,
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  (element.style.fontSize === 14 || element.style.fontSize === 18) &&
  (element.style.fontWeight === "normal" || element.style.fontWeight === 400) &&
  (element.style.color === "#6B7280" || element.style.color === "#000000") &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

export const isEmotionLabelElement = (
  element: CanvasElement,
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  (element.style.fontSize === 14 || element.style.fontSize === 20) &&
  (element.style.fontWeight === "normal" || element.style.fontWeight === 400) &&
  element.style.color === "#111827" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

export const findLabelElementId = (
  elements: CanvasElement[],
  shape: Extract<CanvasElement, { type: "rect" | "roundRect" | "ellipse" }>,
  isLabelElement: (
    element: CanvasElement,
  ) => element is Extract<CanvasElement, { type: "text" }>,
) => {
  const shapeLeft = shape.x;
  const shapeRight = shape.x + shape.w;
  const shapeTop = shape.y;
  const shapeBottom = shape.y + shape.h;
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const tolerance = mmToPx(5); // 레이블 탐지 허용 범위를 넓혀 카드 매칭 누락을 줄인다.

  elements.forEach((element) => {
    if (element.type !== "text") return;
    const isLabel = isLabelElement(element);
    if (!isLabel) return;

    const labelLeft = element.x;
    const labelRight = element.x + element.w;
    const horizontalOverlap =
      Math.abs(labelLeft - shapeLeft) < tolerance &&
      Math.abs(labelRight - shapeRight) < tolerance;
    if (!horizontalOverlap) return;
    const labelCenterY = element.y + element.h / 2;
    const isInsideOrNearShape =
      labelCenterY >= shapeTop - tolerance &&
      labelCenterY <= shapeBottom + tolerance;
    if (!isInsideOrNearShape) return;
    const shapeCenterY = shapeTop + shape.h / 2;
    const distance = Math.abs(labelCenterY - shapeCenterY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = element.id;
    }
  });

  return bestId;
};

export const isAacCardElement = (
  elements: CanvasElement[],
  element: CanvasElement,
): element is Extract<
  CanvasElement,
  { type: "rect" | "roundRect" | "ellipse" }
> => {
  if (
    element.type !== "rect" &&
    element.type !== "roundRect" &&
    element.type !== "ellipse"
  ) {
    return false;
  }
  // 감정 카드와 이미지 슬롯은 AAC 판별에서 제외한다.
  if (
    element.subType === "emotionSlot" ||
    element.subType === "emotionInference" ||
    element.subType === "imageSlot"
  ) {
    return false;
  }
  // subType으로 명시적 판별
  if (element.subType === "aacCard") return true;
  // 레이블 ID가 있으면 명시적으로 연결된 AAC 카드로 본다.
  if (element.labelId !== undefined) return true;

  // 레이블 ID가 없으면 위치/스타일 기반으로 레이블을 역탐색한다.
  const labelId = findLabelElementId(elements, element, isAacLabelElement);
  if (labelId) return true;

  // 레이블이 없을 때는 이미지 박스 안쪽 여백과 테두리 규칙으로 보조 판별한다.
  if (!element.imageBox) return false;
  const sizeTolerance = 2;
  const hasInsetImageBox =
    Math.abs(element.imageBox.w - element.w) > sizeTolerance ||
    Math.abs(element.imageBox.h - element.h) > sizeTolerance;
  const hasAacBorder =
    element.border?.enabled === true &&
    element.border.color === "#E5E7EB" &&
    element.border.width === 2;
  return hasAacBorder && hasInsetImageBox;
};

export const getNextAacCardId = (
  elements: CanvasElement[],
  currentId: string,
) => {
  const colTolerance = mmToPx(2);
  const aacCards = elements.filter((element) =>
    isAacCardElement(elements, element),
  );
  if (aacCards.length === 0) return null;
  const orderedCards = [...aacCards].sort((a, b) => {
    const xDiff = a.x - b.x;
    if (Math.abs(xDiff) > colTolerance) {
      return xDiff;
    }
    return a.y - b.y;
  });
  const currentIndex = orderedCards.findIndex(
    (element) => element.id === currentId,
  );
  if (currentIndex < 0) return null;
  return orderedCards[currentIndex + 1]?.id ?? null;
};

export const isEmotionInferenceCard = (
  element: CanvasElement,
): element is Extract<
  CanvasElement,
  { type: "rect" | "roundRect" | "ellipse" }
> => {
  if (
    element.type !== "rect" &&
    element.type !== "roundRect" &&
    element.type !== "ellipse"
  ) {
    return false;
  }
  // subType으로 명시적 판별
  if (element.subType === "emotionInference") return true;
  // 기존 문서 호환: subType이 없고 labelId + border.color로 판별
  return (
    element.subType === undefined &&
    element.labelId !== undefined &&
    element.border?.enabled === true &&
    element.border.color === "#A5B4FC"
  );
};

/**
 * "채우기(cover)" 방식으로 imageBox 계산.
 * 이미지 비율을 유지하면서 요소를 완전히 채운다 (잘림 발생 가능).
 */
export const calculateCoverImageBox = (
  elementW: number,
  elementH: number,
  imageW: number | undefined,
  imageH: number | undefined,
): { x: number; y: number; w: number; h: number } => {
  if (!imageW || !imageH) {
    return { x: 0, y: 0, w: elementW, h: elementH };
  }
  const elementRatio = elementW / elementH;
  const imageRatio = imageW / imageH;
  let boxW: number;
  let boxH: number;
  if (imageRatio > elementRatio) {
    boxH = elementH;
    boxW = elementH * imageRatio;
  } else {
    boxW = elementW;
    boxH = elementW / imageRatio;
  }
  const x = (elementW - boxW) / 2;
  const y = (elementH - boxH) / 2;
  return { x, y, w: boxW, h: boxH };
};

export const getNextEmotionCardId = (
  elements: CanvasElement[],
  currentId: string,
) => {
  const rowTolerance = mmToPx(2);
  const emotionCards = elements.filter((element) =>
    isEmotionInferenceCard(element),
  );
  if (emotionCards.length === 0) return null;
  const orderedCards = [...emotionCards].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > rowTolerance) {
      return yDiff;
    }
    return a.x - b.x;
  });
  const currentIndex = orderedCards.findIndex(
    (element) => element.id === currentId,
  );
  if (currentIndex < 0) return null;
  return orderedCards[currentIndex + 1]?.id ?? null;
};
