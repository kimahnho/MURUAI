/**
 * 감정 워크시트 템플릿 페이지 구성을 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const pageHeightMm = 297;
const horizontalPaddingMm = 20;
const contentWidthMm = pageWidthMm - horizontalPaddingMm * 2;

// 상단 영역(로고/날짜/제목) 배치 기준값
const logoWidthMm = 40;
const logoHeightMm = 40;
const logoXmm = 0;
const logoYmm = -12;

const dateWidthMm = 50;
const dateHeightMm = 6;
const dateXmm = pageWidthMm - horizontalPaddingMm - dateWidthMm;
const dateYmm = 10;

const titleWidthMm = 160;
const titleHeightMm = 12;
const titleXmm = (pageWidthMm - titleWidthMm) / 2;
const titleYmm = 28;

// 본문 영역(이미지/문항/서술 박스) 배치 기준값
const heroWidthMm = 160;
const heroHeightMm = 60;
const heroXmm = (pageWidthMm - heroWidthMm) / 2;
const heroYmm = titleYmm + titleHeightMm + 6;

const instructionHeightMm = 7;
const instructionYmm = heroYmm + heroHeightMm + 8;

const questionHeightMm = 7;
const question2Ymm = instructionYmm + instructionHeightMm + 20;
const pillWidthMm = 160;
const pillHeightMm = 8;
const pillXmm = (pageWidthMm - pillWidthMm) / 2;
const pill2Ymm = question2Ymm + questionHeightMm + 4;

const question3Ymm = pill2Ymm + pillHeightMm + 12;
const pill3Ymm = question3Ymm + questionHeightMm + 4;

const question4Ymm = pill3Ymm + pillHeightMm + 12;
const writingAreaYmm = question4Ymm + questionHeightMm + 4;
const writingAreaHeightMm = pageHeightMm - writingAreaYmm - 18;

const lineCount = 4;
const lineInsetMm = -2;
const lineHorizontalInsetMm = 4;
const lineSpanMm = writingAreaHeightMm - lineInsetMm * 2;
const lineStepMm = lineSpanMm / (lineCount + 1);

export const emotionWorksheetTemplate: Template = {
  id: "emotionWorksheet",
  name: "감정 워크시트(심화)",
  elements: [
    {
      type: "rect",
      x: mmToPx(logoXmm),
      y: mmToPx(logoYmm),
      w: mmToPx(logoWidthMm),
      h: mmToPx(logoHeightMm),
      fill: `url(${images.mainLogo})`,
      locked: true,
    },
    {
      type: "text",
      x: mmToPx(dateXmm),
      y: mmToPx(dateYmm),
      w: mmToPx(dateWidthMm),
      h: mmToPx(dateHeightMm),
      text: "월&nbsp;&nbsp;&nbsp;&nbsp;일&nbsp;&nbsp;&nbsp;&nbsp;요일",
      locked: true,
      style: {
        fontSize: 24,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "right",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(titleXmm),
      y: mmToPx(titleYmm),
      w: mmToPx(titleWidthMm),
      h: mmToPx(titleHeightMm),
      text: "제목을 입력하세요",
      style: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(heroXmm),
      y: mmToPx(heroYmm),
      w: mmToPx(heroWidthMm),
      h: mmToPx(heroHeightMm),
      fill: "#D1D5DB",
      radius: mmToPx(8),
      border: {
        enabled: false,
        color: "#D1D5DB",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(instructionYmm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(instructionHeightMm),
      text: "1. 표정을 따라 그려보아요",
      locked: true,
      style: {
        fontSize: 14,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(question2Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(questionHeightMm),
      text: "2. 아이는 어떤 기분일까요?",
      locked: true,
      style: {
        fontSize: 14,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(pillXmm),
      y: mmToPx(pill2Ymm),
      w: mmToPx(pillWidthMm),
      h: mmToPx(pillHeightMm),
      fill: "#EDE9FE",
      radius: mmToPx(4),
      border: {
        enabled: false,
        color: "#EDE9FE",
        width: 1,
        style: "solid",
      },
    },
    ...Array.from({ length: 4 }).map((_, index) => {
      const segmentWidthMm = pillWidthMm / 4;
      const numberXmm = pillXmm + index * segmentWidthMm;
      const labels = ["①", "②", "③", "④"];
      return {
        type: "text" as const,
        x: mmToPx(numberXmm),
        y: mmToPx(pill2Ymm),
        w: mmToPx(segmentWidthMm),
        h: mmToPx(pillHeightMm),
        text: labels[index],
        style: {
          fontSize: 12,
          fontWeight: "normal" as const,
          color: "#6B7280",
          underline: false as const,
          alignX: "center" as const,
          alignY: "middle" as const,
        },
      };
    }),
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(question3Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(questionHeightMm),
      text: "3. 내 기분은 어떨까요?",
      locked: true,
      style: {
        fontSize: 14,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(pillXmm),
      y: mmToPx(pill3Ymm),
      w: mmToPx(pillWidthMm),
      h: mmToPx(pillHeightMm),
      fill: "#EDE9FE",
      radius: mmToPx(4),
      border: {
        enabled: false,
        color: "#EDE9FE",
        width: 1,
        style: "solid",
      },
    },
    ...Array.from({ length: 4 }).map((_, index) => {
      const segmentWidthMm = pillWidthMm / 4;
      const numberXmm = pillXmm + index * segmentWidthMm;
      const labels = ["①", "②", "③", "④"];
      return {
        type: "text" as const,
        x: mmToPx(numberXmm),
        y: mmToPx(pill3Ymm),
        w: mmToPx(segmentWidthMm),
        h: mmToPx(pillHeightMm),
        text: labels[index],
        style: {
          fontSize: 12,
          fontWeight: "normal" as const,
          color: "#6B7280",
          underline: false as const,
          alignX: "center" as const,
          alignY: "middle" as const,
        },
      };
    }),
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(question4Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(questionHeightMm),
      text: "4. 왜 그렇게 생각했나요?",
      locked: true,
      style: {
        fontSize: 14,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(writingAreaYmm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(writingAreaHeightMm),
      fill: "#EDE9FE",
      radius: mmToPx(6),
      border: {
        enabled: false,
        color: "#EDE9FE",
        width: 1,
        style: "solid",
      },
    },
    ...Array.from({ length: lineCount }).map((_, index) => {
      const lineYmm = writingAreaYmm + lineInsetMm + lineStepMm * (index + 1);
      const lineStartXmm = horizontalPaddingMm + lineHorizontalInsetMm;
      const lineEndXmm =
        pageWidthMm - horizontalPaddingMm - lineHorizontalInsetMm;
      return {
        type: "line" as const,
        start: {
          x: mmToPx(lineStartXmm),
          y: mmToPx(lineYmm),
        },
        end: {
          x: mmToPx(lineEndXmm),
          y: mmToPx(lineYmm),
        },
        stroke: {
          color: "#6B7280",
          width: 1,
        },
      };
    }),
  ],
};
