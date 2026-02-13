/**
 * 선 요소 이동/변형 시 스냅 보정 계산을 제공하는 모듈.
 */
import type { Rect } from "../../../utils/designPaperUtils";

type Point = { x: number; y: number };

export type LinePoints = {
  start: Point;
  end: Point;
};

export const getLineRect = (line: LinePoints): Rect => {
  const minX = Math.min(line.start.x, line.end.x);
  const minY = Math.min(line.start.y, line.end.y);
  const maxX = Math.max(line.start.x, line.end.x);
  const maxY = Math.max(line.start.y, line.end.y);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// 선 중앙점은 드래그 스냅 기준점과 오버레이 위치 계산에서 공통으로 사용한다.
export const getLineCenter = (line: LinePoints) => ({
  x: (line.start.x + line.end.x) / 2,
  y: (line.start.y + line.end.y) / 2,
});

export const isMovingLineStart = (
  nextLine: LinePoints,
  currentLine?: LinePoints | null,
) =>
  Boolean(
    currentLine &&
      (nextLine.start.x !== currentLine.start.x ||
        nextLine.start.y !== currentLine.start.y),
  );

export const applyResizeSnapOffsetToLine = (
  nextLine: LinePoints,
  isMovingStart: boolean,
  snapOffset: { x: number; y: number },
): LinePoints =>
  // 리사이즈 스냅은 움직인 끝점(start/end) 한쪽에만 offset을 적용한다.
  isMovingStart
    ? {
        start: {
          x: nextLine.start.x + snapOffset.x,
          y: nextLine.start.y + snapOffset.y,
        },
        end: nextLine.end,
      }
    : {
        start: nextLine.start,
        end: {
          x: nextLine.end.x + snapOffset.x,
          y: nextLine.end.y + snapOffset.y,
        },
      };

export const applyDragSnapOffsetToLine = (
  nextLine: LinePoints,
  snapOffset: { x: number; y: number },
): LinePoints => ({
  // 드래그 스냅은 선 전체를 평행 이동하므로 양 끝점 모두 같은 offset을 더한다.
  start: {
    x: nextLine.start.x + snapOffset.x,
    y: nextLine.start.y + snapOffset.y,
  },
  end: {
    x: nextLine.end.x + snapOffset.x,
    y: nextLine.end.y + snapOffset.y,
  },
});
