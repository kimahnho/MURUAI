/**
 * 요소 patch 적용 로직을 공통화해 단일/다중 요소 업데이트를 처리하는 훅.
 */
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
    // 요소 타입별 중첩 필드(style/border/stroke)는 얕은 병합으로 유실되기 쉬워 명시적 분기 병합을 수행한다.
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
        // 도형 border는 기본값이 누락될 수 있어 base를 먼저 보정한 뒤 patch를 덮어쓴다.
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
        // 선 계열 stroke도 기본값을 유지한 채 부분 업데이트해 스타일 토글 시 필드 손실을 막는다.
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
