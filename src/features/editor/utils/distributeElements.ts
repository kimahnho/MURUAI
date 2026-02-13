/**
 * 다중 선택 요소의 정렬/간격 분배 계산 유틸을 제공하는 모듈.
 */
import type { CanvasElement } from "../model/canvasTypes";
import { getRectFromElement } from "./designPaperUtils";

type ElementRect = {
  id: string;
  rect: NonNullable<ReturnType<typeof getRectFromElement>>;
};

// 분배 계산은 사각 경계가 있는 요소만 대상으로 하므로 line/arrow도 rect 변환 후 동일 처리한다.
const toElementRects = (elements: CanvasElement[]): ElementRect[] =>
  elements
    .map((el) => ({ id: el.id, rect: getRectFromElement(el) }))
    .filter((item): item is ElementRect => item.rect !== null);

const applyPositionToElement = (
  el: CanvasElement,
  axis: "x" | "y",
  positionMap: Map<string, number>,
): CanvasElement => {
  const newPos = positionMap.get(el.id);
  if (newPos === undefined || el.locked) return el;
  if (el.type === "line" || el.type === "arrow") {
    const rect = getRectFromElement(el);
    if (!rect) return el;
    // 선 계열은 시작/끝 점을 같은 delta로 이동해 길이와 각도를 유지한다.
    const delta = newPos - (axis === "x" ? rect.x : rect.y);
    if (axis === "x") {
      return {
        ...el,
        start: { x: el.start.x + delta, y: el.start.y },
        end: { x: el.end.x + delta, y: el.end.y },
      };
    }
    return {
      ...el,
      start: { x: el.start.x, y: el.start.y + delta },
      end: { x: el.end.x, y: el.end.y + delta },
    };
  }
  return axis === "x"
    ? ({ ...el, x: newPos } as CanvasElement)
    : ({ ...el, y: newPos } as CanvasElement);
};

export const buildHorizontalDistribution = (
  elements: CanvasElement[],
): Map<string, number> | null => {
  const rects = toElementRects(elements);
  if (rects.length < 3) return null;

  rects.sort((a, b) => a.rect.x - b.rect.x);

  const first = rects[0];
  const last = rects[rects.length - 1];
  const totalElementWidth = rects.reduce((sum, r) => sum + r.rect.width, 0);
  const totalSpan = last.rect.x + last.rect.width - first.rect.x;
  // 첫/마지막 요소는 고정하고 사이 요소 간격만 균등 분배한다.
  const gap = (totalSpan - totalElementWidth) / (rects.length - 1);

  const positionMap = new Map<string, number>();
  let currentX = first.rect.x;
  for (const item of rects) {
    positionMap.set(item.id, currentX);
    currentX += item.rect.width + gap;
  }

  return positionMap;
};

export const buildVerticalDistribution = (
  elements: CanvasElement[],
): Map<string, number> | null => {
  const rects = toElementRects(elements);
  if (rects.length < 3) return null;

  rects.sort((a, b) => a.rect.y - b.rect.y);

  const first = rects[0];
  const last = rects[rects.length - 1];
  const totalElementHeight = rects.reduce((sum, r) => sum + r.rect.height, 0);
  const totalSpan = last.rect.y + last.rect.height - first.rect.y;
  const gap = (totalSpan - totalElementHeight) / (rects.length - 1);

  const positionMap = new Map<string, number>();
  let currentY = first.rect.y;
  for (const item of rects) {
    positionMap.set(item.id, currentY);
    currentY += item.rect.height + gap;
  }

  return positionMap;
};

export { applyPositionToElement };
