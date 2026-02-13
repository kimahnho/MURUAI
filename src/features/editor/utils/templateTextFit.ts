/**
 * 템플릿 텍스트를 지정 박스에 맞추기 위한 폰트 크기/줄바꿈 보정 유틸을 제공하는 모듈.
 */
import type { TemplateElement, TextElement } from "../model/canvasTypes";
import { measureTextBoxSize } from "./textMeasure";

const DEFAULT_TEMPLATE_LINE_HEIGHT = 1.3;

const toPlainText = (value: string) => {
  if (!value) return "";
  // SSR/테스트 환경에서는 DOMParser가 없을 수 있어 정규식 기반 fallback을 제공한다.
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\u00a0/g, " ");
  }
  const doc = new DOMParser().parseFromString(value, "text/html");
  return (doc.body.textContent ?? "").replace(/\u00a0/g, " ");
};

const getAlignedOffsetX = (
  outerWidth: number,
  innerWidth: number,
  align: TextElement["style"]["alignX"]
) => {
  if (align === "center") return (outerWidth - innerWidth) / 2;
  if (align === "right") return outerWidth - innerWidth;
  return 0;
};

const getAlignedOffsetY = (
  outerHeight: number,
  innerHeight: number,
  align: TextElement["style"]["alignY"]
) => {
  if (align === "middle") return (outerHeight - innerHeight) / 2;
  if (align === "bottom") return outerHeight - innerHeight;
  return 0;
};

export const fitTemplateTextElement = (
  element: TemplateElement
): TemplateElement => {
  if (element.type !== "text") return element;

  const textElement = element as Omit<TextElement, "id">;
  const rawText = textElement.richText ?? textElement.text ?? "";
  const textValue = toPlainText(rawText);
  const lineHeight =
    textElement.style.lineHeight ?? DEFAULT_TEMPLATE_LINE_HEIGHT;
  const letterSpacing = textElement.style.letterSpacing ?? 0;
  const widthMode = textElement.widthMode ?? "auto";
  const { width, height } = measureTextBoxSize(
    textValue,
    textElement.style.fontSize,
    textElement.style.fontWeight,
    {
      lineHeight,
      letterSpacing,
      fontFamily: textElement.style.fontFamily,
      maxWidth: widthMode === "fixed" ? textElement.w : undefined,
    }
  );

  const nextWidth = Math.max(width, 1);
  const nextHeight = Math.max(height, 1);
  const offsetX = getAlignedOffsetX(
    textElement.w,
    nextWidth,
    textElement.style.alignX
  );
  const offsetY = getAlignedOffsetY(
    textElement.h,
    nextHeight,
    textElement.style.alignY
  );

  // 측정된 텍스트 크기에 맞춰 박스를 조정하되, 기존 정렬 기준(좌/중/우, 상/중/하)은 offset으로 보존한다.
  return {
    ...textElement,
    x: textElement.x + offsetX,
    y: textElement.y + offsetY,
    w: nextWidth,
    h: nextHeight,
    widthMode,
  };
};

export const fitTemplateTextElements = (elements: TemplateElement[]) =>
  elements.map((element) => fitTemplateTextElement(element));
