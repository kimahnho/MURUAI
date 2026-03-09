/**
 * 선택 요소 집합에 적용할 patch 생성 유틸을 제공하는 모듈.
 */
import type { CanvasElement, ShapeElement } from "../../../model/canvasTypes";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type BorderDefaults = {
  enabled: boolean;
  color: string;
  width: number;
  style: BorderStyle;
};

/**
 * 다중 선택된 텍스트/도형 텍스트 폰트 크기를 같은 값으로 적용한다.
 */
export const applySelectedFontSize = (
  element: CanvasElement,
  selectedIds: string[],
  nextSize: number,
): CanvasElement => {
  if (!selectedIds.includes(element.id) || element.locked) {
    return element;
  }
  if (element.type === "text") {
    return {
      ...element,
      style: {
        ...element.style,
        fontSize: nextSize,
      },
    };
  }
  if (
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse" ||
    element.type === "mosaic"
  ) {
    return {
      ...element,
      textStyle: {
        ...element.textStyle,
        fontSize: nextSize,
      },
    };
  }
  return element;
};

/**
 * 다중 선택된 도형 border 속성을 부분 패치한다.
 * border가 없는 도형은 defaults를 기반으로 새 border를 생성한다.
 */
export const applySelectedBorderPatch = (
  element: CanvasElement,
  selectedIds: string[],
  patch: Partial<ShapeElement["border"]>,
  defaults: BorderDefaults,
): CanvasElement => {
  if (!selectedIds.includes(element.id) || element.locked) {
    return element;
  }
  if (
    element.type !== "rect" &&
    element.type !== "roundRect" &&
    element.type !== "ellipse" &&
    element.type !== "mosaic"
  ) {
    return element;
  }
  const baseBorder = element.border ?? defaults;
  return {
    ...element,
    border: {
      ...baseBorder,
      ...patch,
    },
  };
};
