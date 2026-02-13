/**
 * 시각적 일정표 템플릿 구조를 정의하는 모듈.
 */
import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const marginMm = 14;
const frameXmm = marginMm;
const frameYmm = marginMm;
const frameWidthMm = pageWidthMm - marginMm * 2;

// 내부 콘텐츠 여백(좌우/상하)
const innerPaddingXmm = 4;
const innerPaddingYmm = 10;

// 내부 콘텐츠 시작 위치 및 폭
const contentStartX = frameXmm + innerPaddingXmm;
const contentWidth = frameWidthMm - innerPaddingXmm * 2;

const titleHeightMm = 16;
const titleGapMm = 10;
const headerHeightMm = 12;
const headerGapMm = 8;

const colGapMm = 4;
const leftColWidthMm = 20;
// 할 일 컬럼 2개에 분배되는 총 너비
const taskColsTotalWidthMm = contentWidth - leftColWidthMm - colGapMm * 2;
const taskColWidthMm = taskColsTotalWidthMm / 2;

const rowHeightMm = 50;
const rowGapMm = 6;
const rowCount = 4;

const titleYmm = frameYmm + innerPaddingYmm;
const headerYmm = titleYmm + titleHeightMm + titleGapMm;
const bodyStartYmm = headerYmm + headerHeightMm + headerGapMm;

const colors = {
  background: "#F7F4EC",
  border: "#E2DCCF",
  titleBar: "#9CC3E4",
  titleText: "#1F2937",
  headerLeft: "#E3DBCD",
  headerMid: "#92B9E9",
  headerRight: "#9FCFA7",
  textDark: "#2F2F2F",
  leftCellBorder: "#E0D8CC",
  leftCellFill: "#FFFFFF",
  taskBlue: "#D7E9FB",
  taskGreen: "#D8E9D6",
};

export const visualScheduleTemplate: Template = {
  id: "visualSchedule",
  name: "시각적 스케줄표",
  elements: [
    {
      type: "roundRect",
      x: mmToPx(contentStartX),
      y: mmToPx(titleYmm),
      w: mmToPx(contentWidth),
      h: mmToPx(titleHeightMm),
      fill: colors.titleBar,
      radius: mmToPx(4),
    },
    {
      type: "text",
      x: mmToPx(contentStartX),
      y: mmToPx(titleYmm),
      w: mmToPx(contentWidth),
      h: mmToPx(titleHeightMm),
      text: "오늘의 수업",
      style: {
        fontSize: 30,
        fontWeight: "bold" as const,
        color: colors.titleText,
        underline: false,
        alignX: "center" as const,
        alignY: "middle" as const,
      },
    },
    // 헤더 행
    {
      type: "roundRect",
      x: mmToPx(contentStartX),
      y: mmToPx(headerYmm),
      w: mmToPx(leftColWidthMm),
      h: mmToPx(headerHeightMm),
      fill: colors.headerLeft,
      radius: mmToPx(4),
    },
    {
      type: "roundRect",
      x: mmToPx(contentStartX + leftColWidthMm + colGapMm),
      y: mmToPx(headerYmm),
      w: mmToPx(taskColWidthMm),
      h: mmToPx(headerHeightMm),
      fill: colors.headerMid,
      radius: mmToPx(4),
    },
    {
      type: "roundRect",
      x: mmToPx(contentStartX + leftColWidthMm + colGapMm * 2 + taskColWidthMm),
      y: mmToPx(headerYmm),
      w: mmToPx(taskColWidthMm),
      h: mmToPx(headerHeightMm),
      fill: colors.headerRight,
      radius: mmToPx(4),
    },
    {
      type: "text",
      x: mmToPx(contentStartX),
      y: mmToPx(headerYmm),
      w: mmToPx(leftColWidthMm),
      h: mmToPx(headerHeightMm),
      text: "순서",
      style: {
        fontSize: 30,
        fontWeight: "bold" as const,
        color: colors.textDark,
        underline: false,
        alignX: "center" as const,
        alignY: "middle" as const,
      },
    },
    {
      type: "text",
      x: mmToPx(contentStartX + leftColWidthMm + colGapMm),
      y: mmToPx(headerYmm),
      w: mmToPx(taskColWidthMm),
      h: mmToPx(headerHeightMm),
      text: "할일",
      style: {
        fontSize: 30,
        fontWeight: "bold" as const,
        color: colors.textDark,
        underline: false,
        alignX: "center" as const,
        alignY: "middle" as const,
      },
    },
    {
      type: "text",
      x: mmToPx(contentStartX + leftColWidthMm + colGapMm * 2 + taskColWidthMm),
      y: mmToPx(headerYmm),
      w: mmToPx(taskColWidthMm),
      h: mmToPx(headerHeightMm),
      text: "끝!",
      style: {
        fontSize: 30,
        fontWeight: "bold" as const,
        color: colors.textDark,
        underline: false,
        alignX: "center" as const,
        alignY: "middle" as const,
      },
    },
    ...Array.from({ length: rowCount }).flatMap((_, index) => {
      const rowYmm = bodyStartYmm + index * (rowHeightMm + rowGapMm);
      const numberText = String(index + 1);
      return [
        {
          type: "roundRect" as const,
          x: mmToPx(contentStartX),
          y: mmToPx(rowYmm),
          w: mmToPx(leftColWidthMm),
          h: mmToPx(rowHeightMm),
          fill: colors.leftCellFill,
          radius: mmToPx(4),
          border: {
            enabled: true,
            color: colors.leftCellBorder,
            width: 1.2,
            style: "solid" as const,
          },
        },
        {
          type: "text" as const,
          x: mmToPx(contentStartX),
          y: mmToPx(rowYmm),
          w: mmToPx(leftColWidthMm),
          h: mmToPx(rowHeightMm),
          text: numberText,
          style: {
            fontSize: 30,
            fontWeight: "bold" as const,
            color: colors.textDark,
            underline: false,
            alignX: "center" as const,
            alignY: "middle" as const,
          },
        },
        {
          type: "roundRect" as const,
          tempId: `task-left-${index}`,
          x: mmToPx(contentStartX + leftColWidthMm + colGapMm),
          y: mmToPx(rowYmm),
          w: mmToPx(taskColWidthMm),
          h: mmToPx(rowHeightMm),
          fill: colors.taskBlue,
          radius: mmToPx(5),
          border: {
            enabled: true,
            color: colors.taskBlue,
            width: 1.4,
            style: "solid" as const,
          },
          selectable: true,
        },
        {
          type: "roundRect" as const,
          tempId: `task-right-${index}`,
          x: mmToPx(
            contentStartX + leftColWidthMm + colGapMm * 2 + taskColWidthMm,
          ),
          y: mmToPx(rowYmm),
          w: mmToPx(taskColWidthMm),
          h: mmToPx(rowHeightMm),
          fill: colors.taskGreen,
          radius: mmToPx(5),
          border: {
            enabled: true,
            color: colors.taskGreen,
            width: 1.4,
            style: "solid" as const,
          },
          selectable: true,
        },
      ];
    }),
  ],
};
