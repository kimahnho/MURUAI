import type { CanvasElement, ShapeElement } from "../../../model/canvasTypes";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type BorderDefaults = {
  enabled: boolean;
  color: string;
  width: number;
  style: BorderStyle;
};

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
    element.type === "ellipse"
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
    element.type !== "ellipse"
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
