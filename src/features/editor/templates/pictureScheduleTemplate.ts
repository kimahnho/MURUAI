/**
 * 그림 시간표 템플릿: 학교 주간 시간표에 과목별 그림을 삽입할 수 있는 레이아웃.
 */
import type { Template, TemplateElement } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

// 페이지 & 여백
const PAGE_W = 210;
const MARGIN_X = 10;
const TABLE_W = PAGE_W - MARGIN_X * 2; // 190mm

// 제목 영역
const TITLE_Y = 10;
const TITLE_H = 20;
const TITLE_TABLE_GAP = 5;

// 테이블 시작
const TABLE_Y = TITLE_Y + TITLE_H + TITLE_TABLE_GAP; // 35mm

// 열 치수
const PERIOD_COL_W = 28;
const DAY_COL_W = (TABLE_W - PERIOD_COL_W) / 5; // 32.4mm

// 행 치수
const HEADER_H = 16;
const ROW_H = 28;
const IMAGE_H = 17;
const TEXT_H = ROW_H - IMAGE_H; // 11mm

// 색상
const COLOR_HEADER_BG = "#E8F5E9";
const COLOR_PERIOD_BG = "#F5F5F5";
const COLOR_CELL_BG = "#FFFFFF";
const COLOR_LUNCH_BG = "#FFF9C4";
const COLOR_BORDER = "#BDBDBD";
const COLOR_TEXT = "#111827";
const COLOR_IMAGE_SLOT = "#E8EAF6";
const COLOR_GUIDE_TEXT = "#C5CAE9";

const BORDER = {
  enabled: true,
  color: COLOR_BORDER,
  width: 1,
  style: "solid" as const,
};

const DAYS = ["월", "화", "수", "목", "금"];

// 교시 데이터: [라벨, 시간]
const PERIODS: [string, string][] = [
  ["1교시", "9:10~9:50"],
  ["2교시", "10:00~10:40"],
  ["3교시", "10:50~11:30"],
  ["4교시", "11:40~12:20"],
  ["점심", "12:20~13:00"],
  ["5교시", "13:10~13:50"],
  ["6교시", "14:00~14:40"],
  ["7교시", "14:50~15:30"],
];

const isLunch = (periodIndex: number) => periodIndex === 4;

// 제목
const titleElements: TemplateElement[] = [
  {
    type: "text",
    x: mmToPx(MARGIN_X),
    y: mmToPx(TITLE_Y),
    w: mmToPx(TABLE_W),
    h: mmToPx(TITLE_H),
    text: "O학년 O반의 시간표",
    style: {
      fontSize: 36,
      fontWeight: "bold",
      color: COLOR_TEXT,
      underline: false,
      alignX: "center",
      alignY: "middle",
    },
  },
];

// 헤더 행: 교시/요일 셀 + 월~금
const headerY = TABLE_Y;

const headerElements: TemplateElement[] = [
  // 좌상단 "요일/교시" 셀 배경
  {
    type: "rect" as const,
    x: mmToPx(MARGIN_X),
    y: mmToPx(headerY),
    w: mmToPx(PERIOD_COL_W),
    h: mmToPx(HEADER_H),
    fill: COLOR_HEADER_BG,
    border: BORDER,
  },
  // "요일" 텍스트 (우상단)
  {
    type: "text" as const,
    x: mmToPx(MARGIN_X),
    y: mmToPx(headerY),
    w: mmToPx(PERIOD_COL_W),
    h: mmToPx(HEADER_H / 2),
    text: "요일",
    locked: true,
    style: {
      fontSize: 11,
      fontWeight: "normal" as const,
      color: COLOR_TEXT,
      underline: false,
      alignX: "right" as const,
      alignY: "middle" as const,
    },
  },
  // "교시" 텍스트 (좌하단)
  {
    type: "text" as const,
    x: mmToPx(MARGIN_X),
    y: mmToPx(headerY + HEADER_H / 2),
    w: mmToPx(PERIOD_COL_W),
    h: mmToPx(HEADER_H / 2),
    text: "교시",
    locked: true,
    style: {
      fontSize: 11,
      fontWeight: "normal" as const,
      color: COLOR_TEXT,
      underline: false,
      alignX: "left" as const,
      alignY: "middle" as const,
    },
  },
  // 월~금 헤더 셀
  ...DAYS.flatMap((day, colIndex) => {
    const x = MARGIN_X + PERIOD_COL_W + colIndex * DAY_COL_W;
    return [
      {
        type: "rect" as const,
        x: mmToPx(x),
        y: mmToPx(headerY),
        w: mmToPx(DAY_COL_W),
        h: mmToPx(HEADER_H),
        fill: COLOR_HEADER_BG,
        border: BORDER,
      },
      {
        type: "text" as const,
        x: mmToPx(x),
        y: mmToPx(headerY),
        w: mmToPx(DAY_COL_W),
        h: mmToPx(HEADER_H),
        text: day,
        locked: true,
        style: {
          fontSize: 24,
          fontWeight: "bold" as const,
          color: COLOR_TEXT,
          underline: false,
          alignX: "center" as const,
          alignY: "middle" as const,
        },
      },
    ];
  }),
];

// 교시 행 생성
const periodRows: TemplateElement[] = PERIODS.flatMap(
  ([periodLabel, timeLabel], periodIndex) => {
    const rowY = TABLE_Y + HEADER_H + periodIndex * ROW_H;
    const lunch = isLunch(periodIndex);
    const periodBg = lunch ? COLOR_LUNCH_BG : COLOR_PERIOD_BG;

    // 교시 열 (좌측)
    const periodCellElements: TemplateElement[] = [
      {
        type: "rect" as const,
        x: mmToPx(MARGIN_X),
        y: mmToPx(rowY),
        w: mmToPx(PERIOD_COL_W),
        h: mmToPx(ROW_H),
        fill: periodBg,
        border: BORDER,
      },
      // 교시 번호
      {
        type: "text" as const,
        x: mmToPx(MARGIN_X),
        y: mmToPx(rowY),
        w: mmToPx(PERIOD_COL_W),
        h: mmToPx(ROW_H * 0.55),
        text: periodLabel,
        locked: true,
        style: {
          fontSize: lunch ? 20 : 22,
          fontWeight: "bold" as const,
          color: COLOR_TEXT,
          underline: false,
          alignX: "center" as const,
          alignY: "bottom" as const,
        },
      },
      // 시간
      {
        type: "text" as const,
        x: mmToPx(MARGIN_X),
        y: mmToPx(rowY + ROW_H * 0.55),
        w: mmToPx(PERIOD_COL_W),
        h: mmToPx(ROW_H * 0.45),
        text: timeLabel,
        locked: true,
        style: {
          fontSize: 9,
          fontWeight: "normal" as const,
          color: "#757575",
          underline: false,
          alignX: "center" as const,
          alignY: "top" as const,
        },
      },
    ];

    // 과목 셀 5개 (월~금)
    const dayCellElements: TemplateElement[] = DAYS.flatMap(
      (_day, colIndex) => {
        const cellX = MARGIN_X + PERIOD_COL_W + colIndex * DAY_COL_W;

        if (lunch) {
          // 점심 행: 이미지 슬롯 + 특별 텍스트
          const lunchTexts = ["점심을 먹어요", "", "", "양치해요", ""];
          const lunchText = lunchTexts[colIndex] ?? "";
          return [
            // 셀 배경
            {
              type: "rect" as const,
              x: mmToPx(cellX),
              y: mmToPx(rowY),
              w: mmToPx(DAY_COL_W),
              h: mmToPx(ROW_H),
              fill: COLOR_LUNCH_BG,
              border: BORDER,
            },
            // 이미지 슬롯 (점심 행도 그림 삽입 가능)
            {
              type: "roundRect" as const,
              subType: "imageSlot" as const,
              x: mmToPx(cellX + 1.5),
              y: mmToPx(rowY + 1.5),
              w: mmToPx(DAY_COL_W - 3),
              h: mmToPx(IMAGE_H - 1),
              fill: COLOR_LUNCH_BG,
              radius: mmToPx(1),
              border: {
                enabled: true,
                color: COLOR_LUNCH_BG,
                width: 1,
                style: "solid" as const,
              },
              text: "",
              textStyle: {
                fontSize: 10,
                fontWeight: "normal" as const,
                color: COLOR_GUIDE_TEXT,
              },
            },
            // 텍스트
            {
              type: "text" as const,
              x: mmToPx(cellX),
              y: mmToPx(rowY + IMAGE_H),
              w: mmToPx(DAY_COL_W),
              h: mmToPx(TEXT_H),
              text: lunchText,
              style: {
                fontSize: 11,
                fontWeight: "bold" as const,
                color: COLOR_TEXT,
                underline: false,
                alignX: "center" as const,
                alignY: "middle" as const,
              },
            },
          ];
        }

        // 일반 교시 행: 이미지 슬롯 + 과목 텍스트
        return [
          // 셀 배경
          {
            type: "rect" as const,
            x: mmToPx(cellX),
            y: mmToPx(rowY),
            w: mmToPx(DAY_COL_W),
            h: mmToPx(ROW_H),
            fill: COLOR_CELL_BG,
            border: BORDER,
          },
          // 이미지 슬롯
          {
            type: "roundRect" as const,
            subType: "imageSlot" as const,
            x: mmToPx(cellX + 1.5),
            y: mmToPx(rowY + 1.5),
            w: mmToPx(DAY_COL_W - 3),
            h: mmToPx(IMAGE_H - 1),
            fill: COLOR_IMAGE_SLOT,
            radius: mmToPx(1),
            border: {
              enabled: true,
              color: COLOR_IMAGE_SLOT,
              width: 1,
              style: "solid" as const,
            },
            text: "",
            textStyle: {
              fontSize: 10,
              fontWeight: "normal" as const,
              color: COLOR_GUIDE_TEXT,
            },
          },
          // 과목 이름 텍스트
          {
            type: "text" as const,
            x: mmToPx(cellX),
            y: mmToPx(rowY + IMAGE_H),
            w: mmToPx(DAY_COL_W),
            h: mmToPx(TEXT_H),
            text: "과목이름",
            style: {
              fontSize: 13,
              fontWeight: "bold" as const,
              color: COLOR_TEXT,
              underline: false,
              alignX: "center" as const,
              alignY: "middle" as const,
            },
          },
        ];
      },
    );

    return [...periodCellElements, ...dayCellElements];
  },
);

export const pictureScheduleTemplate: Template = {
  id: "pictureSchedule",
  name: "그림 시간표",
  elements: [...titleElements, ...headerElements, ...periodRows],
};
