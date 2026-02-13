import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
} from "../../../model/canvasTypes";
import { DEFAULT_STROKE } from "../../../utils/designPaperUtils";

type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};
type ShapeBorderPatch = Partial<ShapeElement["border"]>;
type ShapeElementPatch = Omit<Partial<ShapeElement>, "border"> & {
  border?: ShapeBorderPatch;
};
type LineStrokePatch = Partial<LineElement["stroke"]>;
type LineElementPatch = Omit<Partial<LineElement>, "stroke"> & {
  stroke?: LineStrokePatch;
};

export type ElementPatch =
  | TextElementPatch
  | ShapeElementPatch
  | LineElementPatch
  | Partial<CanvasElement>;

type UseElementPatchUpdaterParams = {
  elements: CanvasElement[];
  readOnly: boolean;
  onElementsChange?: (elements: CanvasElement[]) => void;
};

export const useElementPatchUpdater = ({
  elements,
  readOnly,
  onElementsChange,
}: UseElementPatchUpdaterParams) => {
  const updateElement = (id: string, patch: ElementPatch) => {
    if (readOnly || !onElementsChange) return;
    const nextElements = elements.map((element): CanvasElement => {
      if (element.id !== id) return element;

      if (element.type === "text" && "style" in patch) {
        const nextStyle = {
          ...element.style,
          ...(patch as TextElementPatch).style,
        };
        return {
          ...element,
          ...patch,
          style: nextStyle,
        };
      }

      if (
        (element.type === "rect" ||
          element.type === "roundRect" ||
          element.type === "ellipse") &&
        "border" in patch
      ) {
        const baseBorder = element.border ?? {
          enabled: false,
          color: "#000000",
          width: 2,
          style: "solid",
        };
        const patchBorder = (patch as ShapeElementPatch).border;
        const nextBorder: ShapeElement["border"] = patchBorder
          ? {
              ...baseBorder,
              ...patchBorder,
            }
          : element.border;
        return {
          ...element,
          ...patch,
          border: nextBorder,
        };
      }

      if (
        (element.type === "line" || element.type === "arrow") &&
        "stroke" in patch
      ) {
        const baseStroke = element.stroke ?? DEFAULT_STROKE;
        const patchStroke = (patch as LineElementPatch).stroke;
        const nextStroke = patchStroke
          ? {
              ...baseStroke,
              ...patchStroke,
            }
          : baseStroke;
        return {
          ...element,
          ...patch,
          stroke: nextStroke,
        };
      }

      return { ...element, ...patch } as CanvasElement;
    });

    onElementsChange(nextElements);
  };

  return { updateElement };
};
