/**
 * Catmull-Rom 스플라인 → 큐빅 베지에 변환 + 노이즈 평활화.
 * 원본 형태를 유지하면서 삐침과 접합부를 매끄럽게 처리한다.
 */
type Point = { x: number; y: number };

/**
 * 가벼운 Chaikin 서브디비전 평활화.
 * 포인트 사이를 75%/25% 비율로 분할하여 미세한 삐침을 제거한다.
 * iterations가 높을수록 부드럽지만 원본 형태에서 멀어진다.
 */
function chaikinSmooth(points: Point[], closed: boolean, iterations = 1): Point[] {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [];
    const len = closed ? pts.length : pts.length - 1;
    if (!closed) next.push(pts[0]); // 시작점 유지
    for (let i = 0; i < len; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    if (!closed) next.push(pts[pts.length - 1]); // 끝점 유지
    pts = next;
  }
  return pts;
}

/**
 * 평활화된 포인트를 Catmull-Rom → 큐빅 베지에 SVG path로 변환한다.
 * @param points 정규화된 포인트 배열 (0~1)
 * @param closed 닫힌 경로 여부
 * @param tension 곡선 장력 (기본 0.4)
 */
export function buildSmoothPathD(
  points: Point[],
  closed: boolean,
  tension = 0.4,
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}${closed ? " Z" : ""}`;
  }

  // 1단계: Chaikin 평활화로 노이즈/삐침 제거 (1회만 — 과하지 않게)
  const smoothed = chaikinSmooth(points, closed, 1);

  // 2단계: Catmull-Rom 스플라인 → 큐빅 베지에 변환
  const alpha = tension / 3;

  // 닫힌 경로: 시작/끝 접합부가 매끄럽도록 앞뒤로 포인트 확장
  const pts = closed
    ? [smoothed[smoothed.length - 2], smoothed[smoothed.length - 1], ...smoothed, smoothed[0], smoothed[1]]
    : [smoothed[0], ...smoothed, smoothed[smoothed.length - 1]];

  const startIdx = closed ? 2 : 1;
  const endIdx = closed ? pts.length - 2 : pts.length - 2;

  const parts: string[] = [`M ${smoothed[0].x} ${smoothed[0].y}`];

  for (let i = startIdx; i < endIdx; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    const cp1x = p1.x + alpha * (p2.x - p0.x);
    const cp1y = p1.y + alpha * (p2.y - p0.y);
    const cp2x = p2.x - alpha * (p3.x - p1.x);
    const cp2y = p2.y - alpha * (p3.y - p1.y);

    parts.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`);
  }

  if (closed) parts.push("Z");
  return parts.join(" ");
}
