/**
 * 스마트 가이드 렌더링에 사용되는 타입과 계산 계약을 정의하는 모듈.
 * edge/center 정렬 + 요소 간 간격(spacing) 스냅을 지원한다.
 */
import { useCallback, useRef, useState } from "react";

export type AlignmentGuide = {
  id: string;
  orientation: "vertical" | "horizontal";
  position: number;
  reason: "center" | "edge" | "spacing";
  start: number;
  end: number;
  /** spacing 가이드 전용: 간격 영역 시각화 메타데이터 */
  spacing?: {
    gapStart: number;
    gapEnd: number;
    crossCenter: number;
  };
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
  crossStart: number;
  crossEnd: number;
};

const MIN_GAP_PX = 2;
const MAX_SPACING_GUIDES = 5;

const dedupeGuides = (guides: AlignmentGuide[]) => {
  const map = new Map<string, AlignmentGuide>();
  guides.forEach((guide) => {
    const key = `${guide.orientation}-${guide.reason}-${Math.round(
      guide.position
    )}${guide.spacing ? `-${Math.round(guide.spacing.gapStart)}-${Math.round(guide.spacing.gapEnd)}` : ""}`;
    if (!map.has(key)) {
      map.set(key, guide);
    }
  });
  return Array.from(map.values());
};

// 두 rect가 교차축에서 충분히 겹치는지 판별
const hasCrossOverlap = (
  a: Rect,
  b: Rect,
  axis: "x" | "y",
): boolean => {
  if (axis === "x") {
    const overlapStart = Math.max(a.y, b.y);
    const overlapEnd = Math.min(a.y + a.height, b.y + b.height);
    return overlapEnd - overlapStart > -10;
  }
  const overlapStart = Math.max(a.x, b.x);
  const overlapEnd = Math.min(a.x + a.width, b.x + b.width);
  return overlapEnd - overlapStart > -10;
};

type GapPair = { rectA: Rect; rectB: Rect; gap: number };

/**
 * 드래그 중인 요소와 이웃 사이의 간격이 기존 요소 쌍의 간격과 일치하면 스냅한다.
 * edge/center 매칭이 없는 축에서만 호출된다.
 */
const computeSpacingSnap = (
  axis: "x" | "y",
  activeRect: Rect,
  otherRects: Rect[],
  snapThreshold: number,
): { delta: number; guides: AlignmentGuide[] } | null => {
  if (otherRects.length < 2) return null;

  const mainStart = (r: Rect) => (axis === "x" ? r.x : r.y);
  const mainEnd = (r: Rect) =>
    axis === "x" ? r.x + r.width : r.y + r.height;
  const crossStart = (r: Rect) => (axis === "x" ? r.y : r.x);
  const crossEnd = (r: Rect) =>
    axis === "x" ? r.y + r.height : r.x + r.width;

  // 1. 주축 기준 정렬
  const sorted = [...otherRects].sort(
    (a, b) => mainStart(a) - mainStart(b),
  );

  // 2. 인접 쌍 gap 테이블 (교차축 겹침 + 양수 gap만)
  const gapPairs: GapPair[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (!hasCrossOverlap(a, b, axis)) continue;
    const gap = mainStart(b) - mainEnd(a);
    if (gap < MIN_GAP_PX) continue;
    gapPairs.push({ rectA: a, rectB: b, gap });
  }
  if (gapPairs.length === 0) return null;

  // 3. 이웃 탐색
  const activeStart = mainStart(activeRect);
  const activeEnd = mainEnd(activeRect);

  let leftNeighbor: Rect | null = null;
  let rightNeighbor: Rect | null = null;
  for (const r of sorted) {
    if (mainEnd(r) <= activeStart && hasCrossOverlap(r, activeRect, axis)) {
      if (!leftNeighbor || mainEnd(r) > mainEnd(leftNeighbor)) {
        leftNeighbor = r;
      }
    }
    if (mainStart(r) >= activeEnd && hasCrossOverlap(r, activeRect, axis)) {
      if (!rightNeighbor || mainStart(r) < mainStart(rightNeighbor)) {
        rightNeighbor = r;
      }
    }
  }

  // 4. 간격 매칭
  type SpacingCandidate = {
    delta: number;
    matchedGap: number;
    matchedPairs: GapPair[];
    activeGapPair: { rectA: Rect; rectB: Rect };
  };

  const candidates: SpacingCandidate[] = [];

  const tryMatch = (
    currentGap: number,
    activeGapPair: { rectA: Rect; rectB: Rect },
    sign: 1 | -1,
  ) => {
    for (const pair of gapPairs) {
      const diff = pair.gap - currentGap;
      if (Math.abs(diff) <= snapThreshold) {
        // 같은 gap 값을 가진 모든 쌍 수집
        const matchedPairs = gapPairs.filter(
          (p) => Math.abs(p.gap - pair.gap) < 0.5,
        );
        candidates.push({
          delta: sign * diff,
          matchedGap: pair.gap,
          matchedPairs,
          activeGapPair,
        });
        break; // 첫 매칭만
      }
    }
  };

  if (leftNeighbor) {
    const leftGap = activeStart - mainEnd(leftNeighbor);
    tryMatch(leftGap, { rectA: leftNeighbor, rectB: activeRect }, 1);
  }
  if (rightNeighbor) {
    const rightGap = mainStart(rightNeighbor) - activeEnd;
    tryMatch(rightGap, { rectA: activeRect, rectB: rightNeighbor }, -1);
  }

  if (candidates.length === 0) return null;

  // 가장 작은 |delta| 선택
  candidates.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
  const best = candidates[0];

  // 5. spacing 가이드 생성
  const spacingGuides: AlignmentGuide[] = [];
  const orientation = axis === "x" ? "horizontal" : "vertical";

  const buildSpacingGuide = (
    rectA: Rect,
    rectB: Rect,
    idx: number,
  ): AlignmentGuide => {
    const gStart = mainEnd(rectA);
    const gEnd = mainStart(rectB);
    const cStart = Math.max(crossStart(rectA), crossStart(rectB));
    const cEnd = Math.min(crossEnd(rectA), crossEnd(rectB));
    const cCenter = (cStart + cEnd) / 2;

    return {
      id: `spacing-${axis}-${idx}-${Math.round(gStart)}`,
      orientation,
      position: cCenter,
      reason: "spacing",
      start: gStart,
      end: gEnd,
      spacing: {
        gapStart: gStart,
        gapEnd: gEnd,
        crossCenter: cCenter,
      },
    };
  };

  // 매칭된 기존 쌍들의 가이드
  let guideIdx = 0;
  for (const pair of best.matchedPairs) {
    if (guideIdx >= MAX_SPACING_GUIDES) break;
    spacingGuides.push(buildSpacingGuide(pair.rectA, pair.rectB, guideIdx++));
  }

  // 드래그 요소와 이웃 사이의 가이드 (스냅 적용 후 위치 기준)
  const snappedActiveRect = { ...activeRect };
  if (axis === "x") {
    snappedActiveRect.x += best.delta;
  } else {
    snappedActiveRect.y += best.delta;
  }

  if (leftNeighbor && best.activeGapPair.rectA === leftNeighbor) {
    spacingGuides.push(
      buildSpacingGuide(leftNeighbor, snappedActiveRect, guideIdx++),
    );
  }
  if (rightNeighbor && best.activeGapPair.rectB === rightNeighbor) {
    spacingGuides.push(
      buildSpacingGuide(snappedActiveRect, rightNeighbor, guideIdx++),
    );
  }

  return { delta: best.delta, guides: spacingGuides };
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
        { value: 0, reason: "edge", priority: 0, crossStart: 0, crossEnd: canvasHeight },
        { value: canvasWidth / 2, reason: "center", priority: 0, crossStart: 0, crossEnd: canvasHeight },
        { value: canvasWidth, reason: "edge", priority: 0, crossStart: 0, crossEnd: canvasHeight },
      ];
      const targetY: AxisTarget[] = [
        { value: 0, reason: "edge", priority: 0, crossStart: 0, crossEnd: canvasWidth },
        { value: canvasHeight / 2, reason: "center", priority: 0, crossStart: 0, crossEnd: canvasWidth },
        { value: canvasHeight, reason: "edge", priority: 0, crossStart: 0, crossEnd: canvasWidth },
      ];

      otherRects.forEach((rect) => {
        targetX.push(
          { value: rect.x, reason: "edge", priority: 1, crossStart: rect.y, crossEnd: rect.y + rect.height },
          { value: rect.x + rect.width / 2, reason: "center", priority: 1, crossStart: rect.y, crossEnd: rect.y + rect.height },
          { value: rect.x + rect.width, reason: "edge", priority: 1, crossStart: rect.y, crossEnd: rect.y + rect.height }
        );
        targetY.push(
          { value: rect.y, reason: "edge", priority: 1, crossStart: rect.x, crossEnd: rect.x + rect.width },
          { value: rect.y + rect.height / 2, reason: "center", priority: 1, crossStart: rect.x, crossEnd: rect.x + rect.width },
          { value: rect.y + rect.height, reason: "edge", priority: 1, crossStart: rect.x, crossEnd: rect.x + rect.width }
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
      let bestXCrossStart = 0;
      let bestXCrossEnd = canvasHeight;
      let bestYCrossStart = 0;
      let bestYCrossEnd = canvasWidth;
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
            bestXCrossStart = target.crossStart;
            bestXCrossEnd = target.crossEnd;
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
            bestYCrossStart = target.crossStart;
            bestYCrossEnd = target.crossEnd;
          }
        });
      });

      // spacing snap: edge/center가 매칭되지 않은 축에서만, 드래그(resize 아닌) 시에만 실행
      const isResize = activeX !== undefined || activeY !== undefined;
      let spacingXDelta = 0;
      let spacingYDelta = 0;

      if (!isResize && bestXDistance > snapThreshold) {
        const spacingX = computeSpacingSnap("x", activeRect, otherRects, snapThreshold);
        if (spacingX) {
          spacingXDelta = spacingX.delta;
          nextGuides.push(...spacingX.guides);
        }
      }
      if (!isResize && bestYDistance > snapThreshold) {
        const spacingY = computeSpacingSnap("y", activeRect, otherRects, snapThreshold);
        if (spacingY) {
          spacingYDelta = spacingY.delta;
          nextGuides.push(...spacingY.guides);
        }
      }

      const snapOffset = {
        x: bestXDistance <= snapThreshold ? bestXDelta : spacingXDelta,
        y: bestYDistance <= snapThreshold ? bestYDelta : spacingYDelta,
      };
      // 계산 결과는 ref로도 유지해 드래그 중 최신 스냅 오프셋을 동기적으로 참조할 수 있게 한다.
      snapOffsetRef.current = snapOffset;
      if (bestXDistance <= snapThreshold) {
        const activeCrossStart = activeRect.y;
        const activeCrossEnd = activeRect.y + activeRect.height;
        nextGuides.push({
          id: `v-${bestXValue}-${bestXReason}`,
          orientation: "vertical",
          position: bestXValue,
          reason: bestXReason,
          start: Math.min(activeCrossStart, bestXCrossStart),
          end: Math.max(activeCrossEnd, bestXCrossEnd),
        });
      }
      if (bestYDistance <= snapThreshold) {
        const activeCrossStart = activeRect.x;
        const activeCrossEnd = activeRect.x + activeRect.width;
        nextGuides.push({
          id: `h-${bestYValue}-${bestYReason}`,
          orientation: "horizontal",
          position: bestYValue,
          reason: bestYReason,
          start: Math.min(activeCrossStart, bestYCrossStart),
          end: Math.max(activeCrossEnd, bestYCrossEnd),
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
