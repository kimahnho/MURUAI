type MeasureOptions = {
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  maxWidth?: number;
};

export const measureTextBoxSize = (
  text: string,
  fontSize: number,
  fontWeight: "normal" | "bold" | number,
  options: MeasureOptions = {}
) => {
  const safeText = text ?? "";
  const lines = safeText.split(/\r?\n/);
  const maxLineLength = Math.max(...lines.map((line) => line.length), 1);
  const fallbackWidth = Math.ceil(maxLineLength * fontSize * 0.8);
  const lineHeight = options.lineHeight ?? 1.2;
  const fallbackHeight = Math.ceil(lines.length * fontSize * lineHeight);
  if (typeof document === "undefined") {
    return {
      width: options.maxWidth ?? fallbackWidth,
      height: fallbackHeight,
    };
  }

  const span = document.createElement("span");
  span.textContent = safeText || " ";
  span.style.position = "absolute";
  span.style.visibility = "hidden";
  span.style.padding = "0";
  span.style.border = "none";
  const maxWidth = options.maxWidth;

  // 먼저 단일 라인 폭을 측정해 줄바꿈 여부를 판단한다.
  span.style.whiteSpace = "pre";
  span.style.display = "inline-block";
  span.style.fontSize = `${fontSize}px`;
  const resolvedWeight =
    typeof fontWeight === "number"
      ? String(fontWeight)
      : fontWeight === "bold"
      ? "700"
      : "400";
  span.style.fontWeight = resolvedWeight;
  if (options.lineHeight != null) {
    span.style.lineHeight = `${options.lineHeight}`;
  }
  if (options.letterSpacing != null && options.letterSpacing !== 0) {
    span.style.letterSpacing = `${options.letterSpacing}px`;
  }
  const computedFamily =
    options.fontFamily ?? getComputedStyle(document.body).fontFamily;
  if (computedFamily) {
    span.style.fontFamily = computedFamily;
  }
  document.body.appendChild(span);

  // 브라우저 측정 오차 보정
  const widthBuffer = 4;
  const heightBuffer = 2;

  const singleLineWidth = Math.ceil(span.getBoundingClientRect().width) + widthBuffer;

  // 최대 너비를 넘으면 줄바꿈 모드로 전환한다.
  const hasMaxWidth = typeof maxWidth === "number" && maxWidth > 0;
  const exceedsMaxWidth = hasMaxWidth && singleLineWidth > maxWidth;

  let finalWidth: number;
  let finalHeight: number;

  if (exceedsMaxWidth) {
    // 너비를 최대치로 고정하고 줄바꿈을 허용한다.
    span.style.width = `${maxWidth}px`;
    span.style.whiteSpace = "pre-wrap";
    const rect = span.getBoundingClientRect();
    finalWidth = maxWidth;
    finalHeight = Math.ceil(rect.height) + heightBuffer;
  } else {
    // 최대 너비를 넘지 않으면 단일 라인을 유지한다.
    const rect = span.getBoundingClientRect();
    finalWidth = singleLineWidth;
    finalHeight = Math.ceil(rect.height) + heightBuffer;
  }

  span.remove();
  return {
    width: finalWidth || fallbackWidth,
    height: finalHeight || fallbackHeight,
  };
};
