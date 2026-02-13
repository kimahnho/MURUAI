/**
 * 템플릿 정의를 실제 캔버스 요소로 인스턴스화하는 변환 모듈.
 */
import type { CanvasElement, Template, TemplateElement } from "../model/canvasTypes";
import { fitTemplateTextElement } from "../utils/templateTextFit";

type ElementWithTempIds = TemplateElement & {
  tempId?: string;
  labelId?: string;
};

export const instantiateTemplate = (template: Template): CanvasElement[] => {
  const elements = template.elements as ElementWithTempIds[];

  // 템플릿 임시 ID를 실제 요소 ID로 치환하기 위한 매핑을 만든다.
  const idMap = new Map<string, string>();
  elements.forEach((element) => {
    if (element.tempId) {
      idMap.set(element.tempId, crypto.randomUUID());
    }
  });

  return elements.map((element) => {
    const newId = element.tempId
      ? idMap.get(element.tempId)
      : crypto.randomUUID();
    const newLabelId = element.labelId
      ? idMap.get(element.labelId)
      : undefined;

    const fitted = fitTemplateTextElement(element);
    return {
      ...fitted,
      id: newId ?? crypto.randomUUID(),
      tempId: undefined,
      labelId: newLabelId,
    };
  });
};
