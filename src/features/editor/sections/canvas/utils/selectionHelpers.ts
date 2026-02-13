/**
 * 선택 박스/다중 선택 판별 보조 함수를 제공하는 모듈.
 */
export const getUnlockedOrFirst = <T extends { locked?: boolean }>(
  elements: T[],
): T | null => elements.find((element) => !element.locked) ?? elements[0] ?? null;
