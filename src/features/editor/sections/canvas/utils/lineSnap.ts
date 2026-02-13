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
  start: {
    x: nextLine.start.x + snapOffset.x,
    y: nextLine.start.y + snapOffset.y,
  },
  end: {
    x: nextLine.end.x + snapOffset.x,
    y: nextLine.end.y + snapOffset.y,
  },
});
