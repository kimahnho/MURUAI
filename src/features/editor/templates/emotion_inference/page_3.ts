/**
 * 감정 추론 템플릿 3페이지 구성을 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const pageHeightMm = 297;

// 상단 로고/치료목표 박스 배치
const logoXmm = 9;
const logoYmm = 2;
const logoWidthMm = 24;
const logoHeightMm = logoWidthMm;

const titleWidthMm = 80;
const titleHeightMm = 10;
const titleXmm = (pageWidthMm - titleWidthMm) / 2;
const titleYmm = 26;

const goalBoxWidthMm = 170;
const goalBoxHeightMm = 40;
const goalBoxXmm = (pageWidthMm - goalBoxWidthMm) / 2;
const goalBoxYmm = 40;
const goalBoxRadiusMm = 8;

const goalTextWidthMm = goalBoxWidthMm;
const goalTextHeightMm = 10;
const goalTextXmm = goalBoxXmm;
const goalTextYmm = goalBoxYmm + (goalBoxHeightMm - goalTextHeightMm) / 2;

const subTextWidthMm = 120;
const subTextHeightMm = 8;
const subTextXmm = (pageWidthMm - subTextWidthMm) / 2;

const vocabTitleWidthMm = 80;
const vocabTitleHeightMm = 10;
const vocabTitleXmm = (pageWidthMm - vocabTitleWidthMm) / 2;

// 감정 어휘 카드 그리드 배치
const cardColumns = 5;
const cardRows = 2;
const cardWidthMm = 28;
const cardHeightMm = 40;
const cardGapMm = 8;
const cardRowGapMm = 16;
const cardsRowWidthMm =
  cardColumns * cardWidthMm + (cardColumns - 1) * cardGapMm;
const cardsStartXmm = (pageWidthMm - cardsRowWidthMm) / 2;
const cardRadiusMm = 4;

const labelWidthMm = cardWidthMm;
const labelHeightMm = 6;
const labelGapMm = 3;
const bottomMarginMm = 20;
const cardBlockHeightMm =
  (cardRows - 1) * (cardHeightMm + cardRowGapMm) +
  cardHeightMm +
  labelGapMm +
  labelHeightMm;
const cardsStartYmm = pageHeightMm - bottomMarginMm - cardBlockHeightMm;
const cardsTitleGapMm = 6;
const vocabTitleYmm = cardsStartYmm - vocabTitleHeightMm - cardsTitleGapMm;
const goalBoxBottomMm = goalBoxYmm + goalBoxHeightMm;
const subTextYmm =
  goalBoxBottomMm + (vocabTitleYmm - goalBoxBottomMm - subTextHeightMm) / 2;

export const emotionInferencePage3: Template = {
  id: "emotionInference_3",
  name: "감정 추론 활동 3",
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
      x: mmToPx(titleXmm),
      y: mmToPx(titleYmm),
      w: mmToPx(titleWidthMm),
      h: mmToPx(titleHeightMm),
      text: "[ 치료목표 ]",
      style: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(goalBoxXmm),
      y: mmToPx(goalBoxYmm),
      w: mmToPx(goalBoxWidthMm),
      h: mmToPx(goalBoxHeightMm),
      fill: "#FF8A3D",
      radius: mmToPx(goalBoxRadiusMm),
      border: {
        enabled: false,
        color: "#FF8A3D",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(goalTextXmm),
      y: mmToPx(goalTextYmm),
      w: mmToPx(goalTextWidthMm),
      h: mmToPx(goalTextHeightMm),
      text: "치료목표를 입력하세요.",
      style: {
        fontSize: 30,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(subTextXmm),
      y: mmToPx(subTextYmm),
      w: mmToPx(subTextWidthMm),
      h: mmToPx(subTextHeightMm),
      text: "내용을 입력하세요.",
      style: {
        fontSize: 20,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(vocabTitleXmm),
      y: mmToPx(vocabTitleYmm),
      w: mmToPx(vocabTitleWidthMm),
      h: mmToPx(vocabTitleHeightMm),
      text: "[ 목표 어휘 ]",
      style: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    ...Array.from({ length: cardRows * cardColumns }).flatMap((_, index) => {
      const row = Math.floor(index / cardColumns);
      const col = index % cardColumns;
      const x = cardsStartXmm + col * (cardWidthMm + cardGapMm);
      const y = cardsStartYmm + row * (cardHeightMm + cardRowGapMm);
      const labelY = y + cardHeightMm + labelGapMm;
      const cardTempId = `emotion3-card-${index}`;
      const labelTempId = `emotion3-label-${index}`;
      return [
        {
          type: "roundRect" as const,
          x: mmToPx(x),
          y: mmToPx(y),
          w: mmToPx(cardWidthMm),
          h: mmToPx(cardHeightMm),
          fill: "#FFFFFF",
          radius: mmToPx(cardRadiusMm),
          border: {
            enabled: true,
            color: "#A5B4FC",
            width: 1.5,
            style: "solid" as const,
          },
          tempId: cardTempId,
          labelId: labelTempId,
        },
        {
          type: "text" as const,
          x: mmToPx(x),
          y: mmToPx(labelY),
          w: mmToPx(labelWidthMm),
          h: mmToPx(labelHeightMm),
          text: "(감정)",
          widthMode: "auto" as const,
          style: {
            fontSize: 14,
            fontWeight: "normal" as const,
            color: "#111827",
            underline: false as const,
            alignX: "center" as const,
            alignY: "middle" as const,
          },
          tempId: labelTempId,
        },
      ];
    }),
  ],
};
