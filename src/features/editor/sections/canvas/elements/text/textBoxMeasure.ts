import type { Rect } from "../../../../model/canvasTypes";

type MeasureInput = {
  measure: HTMLDivElement;
  htmlContent?: string;
  text?: string;
  rect: Rect;
  minWidth: number;
  minHeight: number;
  widthMode: "auto" | "fixed";
  maxWidth: number;
};

export const computeTextBoxSize = ({
  measure,
  htmlContent,
  text,
  rect,
  minWidth,
  minHeight,
  widthMode,
  maxWidth,
}: MeasureInput) => {
  if (htmlContent != null && htmlContent !== "") {
    measure.innerHTML = htmlContent;
  } else {
    measure.textContent = text ?? "";
  }

  // Tight wrap: measure without padding.
  measure.style.padding = "0";
  measure.style.border = "none";

  const rectWidth = rect.width;
  const isAutoWidth = widthMode !== "fixed";
  let targetWidth = Math.max(rectWidth, minWidth);

  // Canvas side padding total.
  const canvasPadding = 20;
  const maxAllowedWidth = maxWidth - canvasPadding;

  if (isAutoWidth) {
    // Auto mode: expand width up to the max allowed width.
    // Measure single-line width first.
    measure.style.width = "auto";
    measure.style.whiteSpace = "pre";
    // Buffer accounts for measurement variance.
    const widthBuffer = 4;
    const intrinsicWidth = Math.ceil(measure.scrollWidth) + widthBuffer;

    if (intrinsicWidth <= maxAllowedWidth) {
      // Keep a single line if under max width.
      targetWidth = Math.max(intrinsicWidth, minWidth);
    } else {
      // Clamp width and allow wrapping.
      targetWidth = maxAllowedWidth;
      measure.style.width = `${targetWidth}px`;
      measure.style.whiteSpace = "pre-wrap";
    }
  } else {
    // Fixed mode: width locked, height grows with wrapping.
    measure.style.width = `${rectWidth}px`;
    measure.style.whiteSpace = "pre-wrap";
    targetWidth = rectWidth;
  }

  // Buffer accounts for height variance.
  const heightBuffer = 2;
  const targetHeight = Math.max(
    Math.ceil(measure.scrollHeight) + heightBuffer,
    minHeight
  );

  return { targetWidth, targetHeight };
};
