import { useMemo } from "react";

// 스냅 계산에 필요한 최소 사각형 정보.
export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 화면에 렌더링할 가이드 선 정보.
export interface GuideLine {
  type: "vertical" | "horizontal";
  pos: number;
  start: number;
  end: number;
  gap?: number;
}

// 보정된 좌표와 렌더링용 가이드 선 목록.
export interface SnapResult {
  x: number;
  y: number;
  guides: GuideLine[];
}

type AxisMatch = {
  delta: number;
  activePoint: number;
  targetPoint: number;
  targetRect: Rect;
};

const getXPoints = (rect: Rect) => [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
const getYPoints = (rect: Rect) => [rect.y, rect.y + rect.height / 2, rect.y + rect.height];

export function useSnapGuides(
  activeRect: Rect,
  otherRects: Rect[],
  threshold: number = 5
): SnapResult {
  return useMemo(() => {
    let bestX: AxisMatch | null = null;
    let bestY: AxisMatch | null = null;

    const activeXPoints = getXPoints(activeRect);
    const activeYPoints = getYPoints(activeRect);

    for (let i = 0; i < otherRects.length; i += 1) {
      const other = otherRects[i];
      if (other.id === activeRect.id) continue;

      const otherXPoints = getXPoints(other);
      const otherYPoints = getYPoints(other);

      for (let axIndex = 0; axIndex < activeXPoints.length; axIndex += 1) {
        const activePoint = activeXPoints[axIndex];
        for (let oxIndex = 0; oxIndex < otherXPoints.length; oxIndex += 1) {
          const targetPoint = otherXPoints[oxIndex];
          const delta = Math.abs(activePoint - targetPoint);
          if (delta >= threshold) continue;
          if (bestX === null || delta < bestX.delta) {
            bestX = {
              delta,
              activePoint,
              targetPoint,
              targetRect: other,
            };
          }
        }
      }

      for (let ayIndex = 0; ayIndex < activeYPoints.length; ayIndex += 1) {
        const activePoint = activeYPoints[ayIndex];
        for (let oyIndex = 0; oyIndex < otherYPoints.length; oyIndex += 1) {
          const targetPoint = otherYPoints[oyIndex];
          const delta = Math.abs(activePoint - targetPoint);
          if (delta >= threshold) continue;
          if (bestY === null || delta < bestY.delta) {
            bestY = {
              delta,
              activePoint,
              targetPoint,
              targetRect: other,
            };
          }
        }
      }
    }

    let snappedX = activeRect.x;
    let snappedY = activeRect.y;
    const guides: GuideLine[] = [];

    if (bestX) {
      snappedX = activeRect.x - (bestX.activePoint - bestX.targetPoint);
      const activeTop = activeRect.y;
      const activeBottom = activeRect.y + activeRect.height;
      const targetTop = bestX.targetRect.y;
      const targetBottom = bestX.targetRect.y + bestX.targetRect.height;
      guides.push({
        type: "vertical",
        pos: bestX.targetPoint,
        start: Math.min(activeTop, targetTop),
        end: Math.max(activeBottom, targetBottom),
      });
    }

    if (bestY) {
      snappedY = activeRect.y - (bestY.activePoint - bestY.targetPoint);
      const activeLeft = activeRect.x;
      const activeRight = activeRect.x + activeRect.width;
      const targetLeft = bestY.targetRect.x;
      const targetRight = bestY.targetRect.x + bestY.targetRect.width;
      guides.push({
        type: "horizontal",
        pos: bestY.targetPoint,
        start: Math.min(activeLeft, targetLeft),
        end: Math.max(activeRight, targetRight),
      });
    }

    return { x: snappedX, y: snappedY, guides };
  }, [activeRect, otherRects, threshold]);
}
