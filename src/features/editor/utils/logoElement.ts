/**
 * 페이지 초기 로고 요소 생성과 삽입 규칙 유틸을 제공하는 모듈.
 */
import type { CanvasElement, TemplateElement } from "../model/canvasTypes";
import { fitTemplateTextElements } from "./templateTextFit";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// public/ 폴더의 고정 경로 — 빌드 해시가 붙지 않아 기존 문서에서도 항상 로드됨
const LOGO_URL = "/main_logo.png";
const logoFill = `url(${LOGO_URL})`;

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

/** 기존 문서의 로고 요소 fill을 현재 고정 URL로 교체한다. 로고가 아닌 요소는 건드리지 않는다. */
const isLegacyLogoElement = (el: CanvasElement | TemplateElement): boolean =>
  el.type === "rect" &&
  "locked" in el &&
  el.locked === true &&
  "fill" in el &&
  typeof el.fill === "string" &&
  el.fill.startsWith("url(") &&
  el.fill.includes("main_logo") &&
  el.fill !== logoFill;

export const migrateLogoFill = (pages: Array<{ elements: CanvasElement[] }>): boolean => {
  let migrated = false;
  for (const page of pages) {
    for (let i = 0; i < page.elements.length; i++) {
      if (isLegacyLogoElement(page.elements[i])) {
        page.elements[i] = { ...page.elements[i], fill: logoFill } as CanvasElement;
        migrated = true;
      }
    }
  }
  return migrated;
};
