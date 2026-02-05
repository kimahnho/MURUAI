import type { CanvasElement } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

export const isAacLabelElement = (
  element: CanvasElement,
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  (element.style.fontSize === 14 || element.style.fontSize === 18) &&
  (element.style.fontWeight === "normal" || element.style.fontWeight === 400) &&
  element.style.color === "#6B7280" &&
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
  const tolerance = mmToPx(5); // tolerance 확대 (2mm -> 5mm)

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
  // labelId가 명시적으로 설정되어 있으면 AAC 카드로 인식
  if (element.labelId !== undefined) return true;

  // labelId가 없으면 findLabelElementId로 label을 찾아봄
  const labelId = findLabelElementId(elements, element, isAacLabelElement);
  if (labelId) return true;

  // label이 없으면 imageBox와 border 스타일로 판단
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
  return (
    element.labelId !== undefined &&
    element.border?.enabled === true &&
    element.border.color === "#A5B4FC"
  );
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
