/**
 * 페이지 배경/번호 표시 설정의 기본값과 표현 유틸을 제공한다.
 */
import type {
  PageBackground,
  PageNumbering,
  PageNumberFormat,
  PageNumberPosition,
} from "../model/pageTypes";

export const DEFAULT_PAGE_BACKGROUND: PageBackground = { type: "none" };
export const DEFAULT_PAGE_NUMBERING: PageNumbering = {
  enabled: false,
  format: "dash",
  position: "bottom-center",
  startPage: 1,
};

export const resolvePageBackground = (
  background?: PageBackground,
): PageBackground => background ?? DEFAULT_PAGE_BACKGROUND;

export const resolvePageNumbering = (
  numbering?: PageNumbering,
): PageNumbering => numbering ?? DEFAULT_PAGE_NUMBERING;

export const formatPageNumberLabel = (
  pageNumber: number,
  format: PageNumberFormat,
) => {
  switch (format) {
    case "number":
      return `${pageNumber}`;
    case "korean":
      return `페이지 ${pageNumber}`;
    case "english":
      return `Page ${pageNumber}`;
    case "dash":
    default:
      return `- ${pageNumber} -`;
  }
};

export const getPageNumberPositionStyle = (position: PageNumberPosition) => {
  const base = {
    position: "absolute" as const,
    bottom: 16,
    pointerEvents: "none" as const,
    userSelect: "none" as const,
    zIndex: 20,
  };
  if (position === "bottom-left") {
    return { ...base, left: 20 };
  }
  if (position === "bottom-right") {
    return { ...base, right: 20 };
  }
  return { ...base, left: "50%", transform: "translateX(-50%)" };
};
