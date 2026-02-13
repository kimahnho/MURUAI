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

  // 실제 글자 영역만 측정하기 위해 여백/테두리를 제거한다.
  measure.style.padding = "0";
  measure.style.border = "none";

  const rectWidth = rect.width;
  const isAutoWidth = widthMode !== "fixed";
  let targetWidth = Math.max(rectWidth, minWidth);

  // 텍스트 박스가 캔버스 경계를 넘지 않도록 여유값을 둔다.
  const canvasPadding = 20;
  const maxAllowedWidth = maxWidth - canvasPadding;

  if (isAutoWidth) {
    // 자동 폭 모드는 단일 라인 폭을 먼저 측정해 가능한 한 줄바꿈을 늦춘다.
    measure.style.width = "auto";
    measure.style.whiteSpace = "pre";
    // 브라우저 측정 오차 보정
    const widthBuffer = 4;
    const intrinsicWidth = Math.ceil(measure.scrollWidth) + widthBuffer;

    if (intrinsicWidth <= maxAllowedWidth) {
      targetWidth = Math.max(intrinsicWidth, minWidth);
    } else {
      targetWidth = maxAllowedWidth;
      measure.style.width = `${targetWidth}px`;
      measure.style.whiteSpace = "pre-wrap";
    }
  } else {
    // 고정 폭 모드는 너비를 고정하고 높이만 늘어난다.
    measure.style.width = `${rectWidth}px`;
    measure.style.whiteSpace = "pre-wrap";
    targetWidth = rectWidth;
  }

  // 높이 측정 오차 보정
  const heightBuffer = 2;
  const targetHeight = Math.max(
    Math.ceil(measure.scrollHeight) + heightBuffer,
    minHeight
  );

  return { targetWidth, targetHeight };
};
