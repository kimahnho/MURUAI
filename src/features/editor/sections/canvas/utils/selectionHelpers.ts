export const getUnlockedOrFirst = <T extends { locked?: boolean }>(
  elements: T[],
): T | null => elements.find((element) => !element.locked) ?? elements[0] ?? null;
