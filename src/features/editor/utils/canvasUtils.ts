export type Guide = {
  type: "vertical" | "horizontal";
  position: number;
  start?: number;
  end?: number;
};

type Rect = { x: number; y: number; width: number; height: number };

const checkX = (
  guides: Guide[],
  guideX: number,
  targetX: number,
  threshold: number,
  start?: number,
  end?: number
) => {
  if (Math.abs(guideX - targetX) <= threshold) {
    guides.push({ type: "vertical", position: guideX, start, end });
    return true;
  }
  return false;
};

const checkY = (
  guides: Guide[],
  guideY: number,
  targetY: number,
  threshold: number,
  start?: number,
  end?: number
) => {
  if (Math.abs(guideY - targetY) <= threshold) {
    guides.push({ type: "horizontal", position: guideY, start, end });
    return true;
  }
  return false;
};

export const buildGuides = ({
  active,
  others,
  canvasCenterX,
  canvasCenterY,
  canvasBounds,
  threshold = 2,
}: {
  active: Rect;
  others: Rect[];
  canvasCenterX: number;
  canvasCenterY: number;
  canvasBounds?: { width: number; height: number };
  threshold?: number;
}) => {
  const guides: Guide[] = [];
  const boxCenterX = active.x + active.width / 2;
  const boxCenterY = active.y + active.height / 2;

  // 캔버스 중심선 정렬
  checkX(guides, canvasCenterX, boxCenterX, threshold);
  checkY(guides, canvasCenterY, boxCenterY, threshold);

  // 캔버스 경계선 정렬
  if (canvasBounds) {
    checkX(guides, 0, active.x, threshold);
    checkX(guides, canvasBounds.width, active.x + active.width, threshold);
    checkY(guides, 0, active.y, threshold);
    checkY(guides, canvasBounds.height, active.y + active.height, threshold);
  }

  // 다른 요소의 모서리/중심선 정렬
  others.forEach((target) => {
    const tMinX = target.x;
    const tMaxX = target.x + target.width;
    const tMinY = target.y;
    const tMaxY = target.y + target.height;
    const tCenterX = target.x + target.width / 2;
    const tCenterY = target.y + target.height / 2;
    const spanStartY = Math.min(active.y, target.y);
    const spanEndY = Math.max(active.y + active.height, target.y + target.height);
    const spanStartX = Math.min(active.x, target.x);
    const spanEndX = Math.max(active.x + active.width, target.x + target.width);

    checkX(guides, tMinX, active.x, threshold, spanStartY, spanEndY);
    checkX(guides, tMaxX, active.x + active.width, threshold, spanStartY, spanEndY);
    checkX(guides, tCenterX, boxCenterX, threshold, spanStartY, spanEndY);

    checkY(guides, tMinY, active.y, threshold, spanStartX, spanEndX);
    checkY(guides, tMaxY, active.y + active.height, threshold, spanStartX, spanEndX);
    checkY(guides, tCenterY, boxCenterY, threshold, spanStartX, spanEndX);
  });

  return guides;
};
