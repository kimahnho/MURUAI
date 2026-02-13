import type { CanvasElement } from "../../../model/canvasTypes";
import { getRectFromElement, type Rect } from "../../../utils/designPaperUtils";

type ActivePreview = {
  id: string;
  rect: Rect;
} | null;

type UsePaperRectsParams = {
  elements: CanvasElement[];
  activePreview: ActivePreview;
};

export const usePaperRects = ({
  elements,
  activePreview,
}: UsePaperRectsParams) => {
  const getRenderableRect = (element: CanvasElement) => {
    if (activePreview?.id === element.id) return activePreview.rect;
    return getRectFromElement(element);
  };

  const getTargetRects = (activeId: string, excludeIds?: Set<string>) =>
    elements
      .filter(
        (element) =>
          element.id !== activeId &&
          element.visible !== false &&
          !element.locked &&
          !excludeIds?.has(element.id),
      )
      .map((element) => getRectFromElement(element))
      .filter((rect): rect is Rect => Boolean(rect));

  return {
    getRenderableRect,
    getTargetRects,
  };
};
