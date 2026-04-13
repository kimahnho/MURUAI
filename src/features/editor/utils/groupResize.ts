/**
 * 다중 선택 그룹 리사이즈 시 개별 요소 변환 계산 유틸을 제공하는 모듈.
 */
import type {
  CanvasElement,
  ShapeElement,
  ResizeHandle,
} from "../model/canvasTypes";
import type { Rect } from "./designPaperUtils";
import { isEmotionSlotShape } from "./designPaperUtils";

type Point = { x: number; y: number };

export type GroupResizeItem = {
  kind: "rect" | "line";
  rect?: Rect;
  line?: { start: Point; end: Point };
  imageBox?: { x: number; y: number; w: number; h: number };
  fontSize?: number;
  type: CanvasElement["type"];
};

export type GroupResizeSnapshot = {
  activeId: string;
  handle?: ResizeHandle;
  startGroupRect: Rect;
  startActiveRect: Rect;
  items: Map<string, GroupResizeItem>;
};

export const computeGroupRectFromDeltas = (
  start: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Rect => {
  let nextX = start.x;
  let nextY = start.y;
  let nextW = start.width;
  let nextH = start.height;

  if (handle.includes("e")) {
    nextW = start.width + dx;
  }
  if (handle.includes("w")) {
    nextX = start.x + dx;
    nextW = start.width - dx;
  }
  if (handle.includes("s")) {
    nextH = start.height + dy;
  }
  if (handle.includes("n")) {
    nextY = start.y + dy;
    nextH = start.height - dy;
  }

  const isCorner =
    (handle.includes("n") || handle.includes("s")) &&
    (handle.includes("e") || handle.includes("w"));
  if (isCorner) {
    // 코너 리사이즈는 비율을 유지해 다중 선택 리사이즈 결과가 단일 리사이즈와 어긋나지 않게 한다.
    const scaleX = start.width ? nextW / start.width : 1;
    const scaleY = start.height ? nextH / start.height : 1;
    const scale =
      Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY;
    const clampedScale = Math.max(0.05, scale);
    nextW = start.width * clampedScale;
    nextH = start.height * clampedScale;
    if (handle.includes("w")) {
      nextX = start.x + (start.width - nextW);
    }
    if (handle.includes("n")) {
      nextY = start.y + (start.height - nextH);
    }
  }

  nextW = Math.max(1, nextW);
  nextH = Math.max(1, nextH);

  return {
    x: nextX,
    y: nextY,
    width: nextW,
    height: nextH,
  };
};

export const buildGroupResizeSnapshot = (
  activeId: string,
  startActiveRect: Rect,
  elements: CanvasElement[],
  selectedIds: string[],
  findEmotionPlaceholderId: (element: ShapeElement) => string | null,
  findEmotionLabelId: (element: ShapeElement) => string | null,
  handle?: ResizeHandle,
): GroupResizeSnapshot | null => {
  if (selectedIds.length <= 1) return null;
  const selectedSet = new Set(selectedIds);
  const linkedIds = new Set<string>();
  elements.forEach((element) => {
    if (!selectedSet.has(element.id)) return;
    if (isEmotionSlotShape(element)) {
      const placeholderId = findEmotionPlaceholderId(element);
      const labelId = findEmotionLabelId(element);
      if (placeholderId && !selectedSet.has(placeholderId)) {
        linkedIds.add(placeholderId);
      }
      if (labelId && !selectedSet.has(labelId)) {
        linkedIds.add(labelId);
      }
    }
    if (
      (element.type === "rect" ||
        element.type === "roundRect" ||
        element.type === "ellipse" ||
        element.type === "mosaic" ||
        element.type === "circleMosaic") &&
      element.labelId &&
      !selectedSet.has(element.labelId)
    ) {
      linkedIds.add(element.labelId);
    }
  });
  const allIds = new Set([...selectedIds, ...linkedIds]);
  const items = new Map<string, GroupResizeItem>();
  // 시작 스냅샷을 고정해 pointermove 누적에 따른 오차 없이 비율 변환을 적용한다.
  elements.forEach((element) => {
    if (!allIds.has(element.id) || element.locked) return;
    if (element.type === "line" || element.type === "arrow") {
      items.set(element.id, {
        kind: "line",
        line: { start: { ...element.start }, end: { ...element.end } },
        type: element.type,
      });
      return;
    }
    if (
      "x" in element &&
      "y" in element &&
      "w" in element &&
      "h" in element
    ) {
      items.set(element.id, {
        kind: "rect",
        rect: {
          x: element.x,
          y: element.y,
          width: element.w,
          height: element.h,
        },
        imageBox:
          "imageBox" in element && element.imageBox
            ? { ...element.imageBox }
            : undefined,
        fontSize:
          element.type === "text" ? element.style.fontSize : undefined,
        type: element.type,
      });
    }
  });
  if (items.size === 0) return null;
  const rects: Rect[] = [];
  items.forEach((item) => {
    if (item.kind === "rect" && item.rect) {
      rects.push(item.rect);
      return;
    }
    if (item.kind === "line" && item.line) {
      const minX = Math.min(item.line.start.x, item.line.end.x);
      const minY = Math.min(item.line.start.y, item.line.end.y);
      const width = Math.max(
        Math.abs(item.line.end.x - item.line.start.x),
        1,
      );
      const height = Math.max(
        Math.abs(item.line.end.y - item.line.start.y),
        1,
      );
      rects.push({ x: minX, y: minY, width, height });
    }
  });
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    activeId,
    handle,
    startGroupRect: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    startActiveRect,
    items,
  };
};

export const applyGroupResizeSnapshot = (
  snapshot: GroupResizeSnapshot,
  nextGroupRect: Rect,
  elements: CanvasElement[],
): CanvasElement[] => {
  const { startGroupRect } = snapshot;
  const scaleX = startGroupRect.width
    ? nextGroupRect.width / startGroupRect.width
    : 1;
  const scaleY = startGroupRect.height
    ? nextGroupRect.height / startGroupRect.height
    : 1;
  const fontScale = (scaleX + scaleY) / 2;
  return elements.map((element) => {
    const item = snapshot.items.get(element.id);
    if (!item) return element;
    if (
      item.kind === "line" &&
      item.line &&
      (element.type === "line" || element.type === "arrow")
    ) {
      const nextStart = {
        x: nextGroupRect.x + (item.line.start.x - startGroupRect.x) * scaleX,
        y: nextGroupRect.y + (item.line.start.y - startGroupRect.y) * scaleY,
      };
      const nextEnd = {
        x: nextGroupRect.x + (item.line.end.x - startGroupRect.x) * scaleX,
        y: nextGroupRect.y + (item.line.end.y - startGroupRect.y) * scaleY,
      };
      return {
        ...element,
        start: nextStart,
        end: nextEnd,
      };
    }
    if (
      item.kind === "rect" &&
      item.rect &&
      "x" in element &&
      "y" in element
    ) {
      const nextX =
        nextGroupRect.x + (item.rect.x - startGroupRect.x) * scaleX;
      const nextY =
        nextGroupRect.y + (item.rect.y - startGroupRect.y) * scaleY;
      const nextW = Math.max(1, item.rect.width * scaleX);
      const nextH = Math.max(1, item.rect.height * scaleY);
      const nextImageBox = item.imageBox
        ? {
            x: item.imageBox.x * scaleX,
            y: item.imageBox.y * scaleY,
            w: item.imageBox.w * scaleX,
            h: item.imageBox.h * scaleY,
          }
        : "imageBox" in element
          ? element.imageBox
          : undefined;
      if (element.type === "text") {
        const baseFontSize = item.fontSize ?? element.style.fontSize;
        // 텍스트는 가로/세로 스케일 평균을 사용해 왜곡 대신 시각적 크기 감각을 유지한다.
        const nextFontSize = Math.max(
          6,
          Math.round(baseFontSize * fontScale * 10) / 10,
        );
        return {
          ...element,
          x: nextX,
          y: nextY,
          w: nextW,
          h: nextH,
          style: { ...element.style, fontSize: nextFontSize },
        };
      }
      return {
        ...element,
        x: nextX,
        y: nextY,
        w: nextW,
        h: nextH,
        imageBox: nextImageBox,
      } as CanvasElement;
    }
    return element;
  });
};
