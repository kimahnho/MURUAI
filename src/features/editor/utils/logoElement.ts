/**
 * 페이지 초기 로고 요소 생성과 삽입 규칙 유틸을 제공하는 모듈.
 */
import { images } from "@/shared/assets";
import type { CanvasElement, TemplateElement } from "../model/canvasTypes";
import { fitTemplateTextElements } from "./templateTextFit";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const logoFill = `url(${images.mainLogo})`;

export const getLogoTemplateElement = (): TemplateElement => ({
  type: "rect",
  x: mmToPx(0),
  y: mmToPx(-12),
  w: mmToPx(40),
  h: mmToPx(40),
  fill: logoFill,
  locked: true,
});

export const hasLogoElement = (
  elements: Array<CanvasElement | TemplateElement>
) =>
  elements.some(
    (element) =>
      element.type === "rect" &&
      "fill" in element &&
      element.fill === logoFill
  );

export const withLogoTemplateElements = (elements: TemplateElement[]) => {
  const normalized = fitTemplateTextElements(elements);
  return hasLogoElement(normalized)
    ? normalized
    : [getLogoTemplateElement(), ...normalized];
};

export const withLogoCanvasElements = (elements: CanvasElement[]) =>
  hasLogoElement(elements)
    ? elements
    : [{ ...getLogoTemplateElement(), id: crypto.randomUUID() }, ...elements];
