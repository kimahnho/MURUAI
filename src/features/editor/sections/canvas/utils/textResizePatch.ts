import type { TextElement } from "../../../model/canvasTypes";
import type { Rect } from "../../../utils/designPaperUtils";

type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};

export const buildTextResizePatch = ({
  handle,
  startHeight,
  nextRect,
  baseFontSize,
}: {
  handle?: string;
  startHeight: number;
  nextRect: Rect;
  baseFontSize: number;
}): TextElementPatch => {
  const hasWidthHandle =
    handle != null && (handle.includes("e") || handle.includes("w"));
  const shouldScaleFont =
    handle != null && ["nw", "ne", "sw", "se"].includes(handle);
  const heightRatio = startHeight ? nextRect.height / startHeight : 1;
  const nextFontSize = shouldScaleFont
    ? Math.max(6, Math.round(baseFontSize * heightRatio))
    : baseFontSize;
  const patch: TextElementPatch = {
    x: nextRect.x,
    y: nextRect.y,
    w: nextRect.width,
    h: nextRect.height,
  };
  if (hasWidthHandle) {
    patch.widthMode = "fixed";
  }
  if (shouldScaleFont) {
    patch.style = { fontSize: nextFontSize };
  }
  return patch;
};
