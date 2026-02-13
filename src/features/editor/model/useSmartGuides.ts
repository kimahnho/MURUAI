/**
 * 스마트 가이드 렌더링에 사용되는 타입과 계산 계약을 정의하는 모듈.
 */
import { useCallback, useRef, useState } from "react";

export type AlignmentGuide = {
  id: string;
  orientation: "vertical" | "horizontal";
  position: number;
  reason: "center" | "edge" | "spacing";
};

export type SmartGuideState = {
  guides: AlignmentGuide[];
  snapOffset: { x: number; y: number };
};

type Rect = { x: number; y: number; width: number; height: number };

type AxisTarget = {
  value: number;
  reason: "center" | "edge" | "spacing";
  priority: number;
};

const dedupeGuides = (guides: AlignmentGuide[]) => {
  const map = new Map<string, AlignmentGuide>();
  guides.forEach((guide) => {
    const key = `${guide.orientation}-${guide.reason}-${Math.round(
      guide.position
    )}`;
    if (!map.has(key)) {
      map.set(key, guide);
    }
  });
  return Array.from(map.values());
};

export const useSmartGuides = ({
  canvasWidth,
  canvasHeight,
  threshold = 6,
  snapThreshold = 3,
}: {
  canvasWidth: number;
  canvasHeight: number;
  threshold?: number;
  snapThreshold?: number;
}) => {
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const snapOffsetRef = useRef({ x: 0, y: 0 });

  const compute = useCallback(
    ({
      activeRect,
      otherRects,
      activeX,
      activeY,
    }: {
      activeRect: Rect;
      otherRects: Rect[];
      activeX?: number[];
      activeY?: number[];
    }): SmartGuideState => {
      const activeXPoints =
        activeX === undefined
          ? [
              activeRect.x,
              activeRect.x + activeRect.width / 2,
              activeRect.x + activeRect.width,
            ]
          : activeX;
      const activeYPoints =
        activeY === undefined
          ? [
              activeRect.y,
              activeRect.y + activeRect.height / 2,
              activeRect.y + activeRect.height,
            ]
          : activeY;

      const targetX: AxisTarget[] = [
        { value: 0, reason: "edge", priority: 0 },
        { value: canvasWidth / 2, reason: "center", priority: 0 },
        { value: canvasWidth, reason: "edge", priority: 0 },
      ];
      const targetY: AxisTarget[] = [
        { value: 0, reason: "edge", priority: 0 },
        { value: canvasHeight / 2, reason: "center", priority: 0 },
        { value: canvasHeight, reason: "edge", priority: 0 },
      ];

      otherRects.forEach((rect) => {
        targetX.push(
          { value: rect.x, reason: "edge", priority: 1 },
          { value: rect.x + rect.width / 2, reason: "center", priority: 1 },
          { value: rect.x + rect.width, reason: "edge", priority: 1 }
        );
        targetY.push(
          { value: rect.y, reason: "edge", priority: 1 },
          { value: rect.y + rect.height / 2, reason: "center", priority: 1 },
          { value: rect.y + rect.height, reason: "edge", priority: 1 }
        );
      });

      let bestXDelta = 0;
      let bestYDelta = 0;
      let bestXValue = 0;
      let bestYValue = 0;
      let bestXReason: AxisTarget["reason"] = "edge";
      let bestYReason: AxisTarget["reason"] = "edge";
      let bestXDistance = Number.POSITIVE_INFINITY;
      let bestYDistance = Number.POSITIVE_INFINITY;
      let bestXPriority = Number.POSITIVE_INFINITY;
      let bestYPriority = Number.POSITIVE_INFINITY;
      const nextGuides: AlignmentGuide[] = [];

      targetX.forEach((target) => {
        activeXPoints.forEach((ax) => {
          const delta = target.value - ax;
          const distance = Math.abs(delta);
          if (distance > threshold) return;
          if (
            distance <= snapThreshold &&
            (distance < bestXDistance ||
              (distance === bestXDistance &&
                target.priority < bestXPriority))
          ) {
            bestXDistance = distance;
            bestXDelta = delta;
            bestXPriority = target.priority;
            bestXValue = target.value;
            bestXReason = target.reason;
          }
        });
      });

      targetY.forEach((target) => {
        activeYPoints.forEach((ay) => {
          const delta = target.value - ay;
          const distance = Math.abs(delta);
          if (distance > threshold) return;
          if (
            distance <= snapThreshold &&
            (distance < bestYDistance ||
              (distance === bestYDistance &&
                target.priority < bestYPriority))
          ) {
            bestYDistance = distance;
            bestYDelta = delta;
            bestYPriority = target.priority;
            bestYValue = target.value;
            bestYReason = target.reason;
          }
        });
      });

      const snapOffset = {
        x: bestXDistance <= snapThreshold ? bestXDelta : 0,
        y: bestYDistance <= snapThreshold ? bestYDelta : 0,
      };
      // 계산 결과는 ref로도 유지해 드래그 중 최신 스냅 오프셋을 동기적으로 참조할 수 있게 한다.
      snapOffsetRef.current = snapOffset;
      if (bestXDistance <= snapThreshold) {
        nextGuides.push({
          id: `v-${bestXValue}-${bestXReason}`,
          orientation: "vertical",
          position: bestXValue,
          reason: bestXReason,
        });
      }
      if (bestYDistance <= snapThreshold) {
        nextGuides.push({
          id: `h-${bestYValue}-${bestYReason}`,
          orientation: "horizontal",
          position: bestYValue,
          reason: bestYReason,
        });
      }
      const uniqueGuides = dedupeGuides(nextGuides);
      setGuides(uniqueGuides);

      return { guides: uniqueGuides, snapOffset };
    },
    [canvasHeight, canvasWidth, snapThreshold, threshold]
  );

  const clear = useCallback(() => {
    snapOffsetRef.current = { x: 0, y: 0 };
    setGuides([]);
  }, []);

  return {
    guides,
    snapOffsetRef,
    compute,
    clear,
  };
};
