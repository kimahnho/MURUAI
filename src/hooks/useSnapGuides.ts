import { useMemo } from "react";

// Represents a generic object on the canvas
export interface Rect {
  id: string;
  x: number; // Position Left
  y: number; // Position Top
  width: number;
  height: number;
}

// Represents a guide line to be rendered
export interface GuideLine {
  type: "vertical" | "horizontal";
  pos: number; // The fixed coordinate value (e.g., x=100)
  start: number; // Line start position
  end: number; // Line end position
  gap?: number; // (Optional) Distance value to display
}

// Hook return value
export interface SnapResult {
  x: number; // Corrected X position
  y: number; // Corrected Y position
  guides: GuideLine[]; // List of guides to render
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
