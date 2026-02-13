/**
 * 문서 방향별 크기/좌표 기준값 계산 유틸을 제공하는 모듈.
 */
export const normalizeOrientationValue = (
  value: unknown,
  fallback: "horizontal" | "vertical"
) => (value === "horizontal" || value === "vertical" ? value : fallback);
