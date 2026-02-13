/**
 * 선택 요소를 새 ID로 복제하고 좌표를 보정하는 유틸을 제공하는 모듈.
 */
import type { CanvasElement } from "../model/canvasTypes";

export const cloneElementsWithNewIds = (elements: CanvasElement[]) => {
  const idMap = new Map<string, string>();
  elements.forEach((element) => {
    idMap.set(element.id, crypto.randomUUID());
  });
  return elements.map((element) => {
    const nextId = idMap.get(element.id) ?? crypto.randomUUID();
    const nextLabelId =
      "labelId" in element && element.labelId
        ? idMap.get(element.labelId) ?? element.labelId
        : undefined;
    return {
      ...element,
      id: nextId,
      labelId: nextLabelId,
    };
  });
};
