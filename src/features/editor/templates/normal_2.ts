import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const pageHeightMm = 297;
const horizontalPaddingMm = 16;
const contentWidthMm = pageWidthMm - horizontalPaddingMm * 2;

const headerYmm = 16;
const headerHeightMm = 16;
const headerRadiusMm = 8;
const headerInnerPaddingMm = 8;

const instructionHeightMm = 6;
const instructionYmm = headerYmm + headerHeightMm + 8;

const targetBoxWidthMm = 96;
const targetBoxHeightMm = 10;
const targetBoxYmm = instructionYmm + instructionHeightMm + 6;
const targetBoxXmm = (pageWidthMm - targetBoxWidthMm) / 2;

const questionHeightMm = 6;
const questionYmm = targetBoxYmm + targetBoxHeightMm + 6;

const responseBoxHeightMm = 110;
const responseBoxYmm = questionYmm + questionHeightMm + 6;

const lineCount = 4;
const lineInsetMm = 4;
const pageNumberYmm = pageHeightMm - 14;
const lineAreaStartYmm = responseBoxYmm + responseBoxHeightMm + 10;
const lineAreaEndYmm = pageNumberYmm - 8;
const lineAreaHeightMm = Math.max(0, lineAreaEndYmm - lineAreaStartYmm);
const lineGapMm = lineCount > 0 ? lineAreaHeightMm / lineCount : 0;

const headerXmm = horizontalPaddingMm;
const headerWidthMm = contentWidthMm;
const circleSizeMm = 10;
const labelWidthMm = 10;
const labelGapMm = 2;
const circleSpacingMm = 6;
const dateAreaWidthMm =
  circleSizeMm * 2 + labelWidthMm * 2 + labelGapMm * 2 + circleSpacingMm;
const dateStartXmm = headerXmm + headerWidthMm - dateAreaWidthMm;
const headerCenterYmm = headerYmm + headerHeightMm / 2;
const headerTextHeightMm = circleSizeMm;

export const normal_2: Template = {
  id: "normal_2",
  name: "normal_2",
  elements: [
    {
      type: "roundRect",
      x: mmToPx(headerXmm),
      y: mmToPx(headerYmm),
      w: mmToPx(headerWidthMm),
      h: mmToPx(headerHeightMm),
      fill: "#FF8A3D",
      radius: mmToPx(headerRadiusMm),
      border: {
        enabled: false,
        color: "#FF8A3D",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(headerXmm + headerInnerPaddingMm),
      y: mmToPx(headerCenterYmm - headerTextHeightMm / 2),
      w: mmToPx(60),
      h: mmToPx(headerTextHeightMm),
      text: "번째 감정 어휘",
      style: {
        fontSize: 25,
        fontWeight: "bold",
        color: "#ffffff",
        underline: false,
        alignX: "left",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(headerXmm + (headerWidthMm - 40) / 2),
      y: mmToPx(headerCenterYmm - headerTextHeightMm / 2),
      w: mmToPx(40),
      h: mmToPx(headerTextHeightMm),
      text: "'       '",
      style: {
        fontSize: 25,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "ellipse",
      x: mmToPx(dateStartXmm),
      y: mmToPx(headerCenterYmm - circleSizeMm / 2),
      w: mmToPx(circleSizeMm),
      h: mmToPx(circleSizeMm),
      fill: "#ffffff",
      border: {
        enabled: false,
        color: "#ffffff",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(dateStartXmm + circleSizeMm + labelGapMm),
      y: mmToPx(headerCenterYmm - headerTextHeightMm / 2),
      w: mmToPx(labelWidthMm),
      h: mmToPx(headerTextHeightMm),
      text: "월",
      style: {
        fontSize: 25,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "ellipse",
      x: mmToPx(
        dateStartXmm +
          circleSizeMm +
          labelGapMm +
          labelWidthMm +
          circleSpacingMm
      ),
      y: mmToPx(headerCenterYmm - circleSizeMm / 2),
      w: mmToPx(circleSizeMm),
      h: mmToPx(circleSizeMm),
      fill: "#ffffff",
      border: {
        enabled: false,
        color: "#ffffff",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(
        dateStartXmm +
          circleSizeMm +
          labelGapMm +
          labelWidthMm +
          circleSpacingMm +
          circleSizeMm +
          labelGapMm
      ),
      y: mmToPx(headerCenterYmm - headerTextHeightMm / 2),
      w: mmToPx(labelWidthMm),
      h: mmToPx(headerTextHeightMm),
      text: "일",
      style: {
        fontSize: 25,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(instructionYmm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(instructionHeightMm),
      text: "📌 아래 목표 감정 어휘를 사용하여 그림 또는 글로 표현해 보세요!",
      style: {
        fontSize: 20,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "left",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(targetBoxXmm),
      y: mmToPx(targetBoxYmm),
      w: mmToPx(targetBoxWidthMm),
      h: mmToPx(targetBoxHeightMm),
      fill: "#ffffff",
      radius: mmToPx(3),
      border: {
        enabled: true,
        color: "#D1D5DB",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(targetBoxXmm),
      y: mmToPx(targetBoxYmm),
      w: mmToPx(targetBoxWidthMm),
      h: mmToPx(targetBoxHeightMm),
      text: "목표 감정 어휘: ~~다",
      style: {
        fontSize: 25,
        fontWeight: "bold",
        color: "#F97316",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(questionYmm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(questionHeightMm),
      text: "내가 ~~ 때는?",
      style: {
        fontSize: 25,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(responseBoxYmm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(responseBoxHeightMm),
      fill: "#FAD5C2",
      radius: mmToPx(6),
      border: {
        enabled: false,
        color: "#FAD5C2",
        width: 1,
        style: "solid",
      },
    },
    ...Array.from({ length: lineCount }).map((_, index) => {
      const y = lineAreaStartYmm + lineGapMm * (index + 1);
      return {
        type: "line" as const,
        start: {
          x: mmToPx(horizontalPaddingMm + lineInsetMm),
          y: mmToPx(y),
        },
        end: {
          x: mmToPx(pageWidthMm - horizontalPaddingMm - lineInsetMm),
          y: mmToPx(y),
        },
        stroke: {
          color: "#111827",
          width: 1,
        },
      };
    }),
  ],
};
