/**
 * 캔버스 DOM 좌표/스케일 계산에 필요한 브라우저 보조 유틸을 제공하는 모듈.
 */
import type { Point, Rect } from "../model/canvasTypes";

/**
 * DOM 요소의 스케일 계산
 * CSS transform이 적용된 요소의 실제 렌더링 스케일을 반환
 */
export const getScale = (element: HTMLElement | null): number => {
  if (!element) return 1;
  const rect = element.getBoundingClientRect();
  return element.offsetWidth ? rect.width / element.offsetWidth : 1;
};

/**
 * Point 객체 정규화
 * undefined나 null 값을 {x: 0, y: 0}으로 변환
 */
export const normalizePoint = (point?: Point | null): Point => ({
  x: typeof point?.x === "number" ? point.x : 0,
  y: typeof point?.y === "number" ? point.y : 0,
});

/**
 * Rect 객체를 요소 속성 형태로 변환
 * {x, y, width, height} → {x, y, w, h}
 */
export const rectToElementProps = (rect: Rect) => ({
  x: rect.x,
  y: rect.y,
  w: rect.width,
  h: rect.height,
});

/**
 * 요소 속성을 Rect 형태로 변환
 * {x, y, w, h} → {x, y, width, height}
 */
export const elementPropsToRect = (props: {
  x: number;
  y: number;
  w: number;
  h: number;
}): Rect => ({
  x: props.x,
  y: props.y,
  width: props.w,
  height: props.h,
});

/**
 * 값을 최소/최대 범위로 제한
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
