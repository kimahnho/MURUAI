/**
 * 요소 레이어(z-index) 이동 유틸리티.
 * 요소 배열 내에서 특정 요소의 순서를 변경한다.
 */
import type { CanvasElement } from "../model/canvasTypes";

export type LayerDirection = "forward" | "front" | "backward" | "back";

export const moveLayerByDirection = (
  elements: CanvasElement[],
  index: number,
  direction: LayerDirection,
): CanvasElement[] => {
  const nextElements = [...elements];

  if (direction === "forward") {
    if (index >= nextElements.length - 1) return elements;
    [nextElements[index], nextElements[index + 1]] = [
      nextElements[index + 1],
      nextElements[index],
    ];
    return nextElements;
  }

  if (direction === "backward") {
    if (index <= 0) return elements;
    [nextElements[index - 1], nextElements[index]] = [
      nextElements[index],
      nextElements[index - 1],
    ];
    return nextElements;
  }

  if (direction === "front") {
    if (index >= nextElements.length - 1) return elements;
    const [target] = nextElements.splice(index, 1);
    nextElements.push(target);
    return nextElements;
  }

  // direction === "back"
  if (index <= 0) return elements;
  const [target] = nextElements.splice(index, 1);
  nextElements.unshift(target);
  return nextElements;
};
