/**
 * 어휘 학습 카드 템플릿 페이지 구조를 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;

const logoWidthMm = 40;
const logoHeightMm = 40;
const logoXmm = 0;
const logoYmm = -12;

const titleWidthMm = 90;
const titleHeightMm = 12;
const titleXmm = (pageWidthMm - titleWidthMm) / 2;
const titleYmm = 34;

const cardColumns = 2;
const cardRows = 2;
const cardWidthMm = 78;
const cardHeightMm = 90;
const labelAreaHeightMm = 12;
const cardGapXmm = 16;
const cardGapYmm = 14;
const gridWidthMm = cardColumns * cardWidthMm + (cardColumns - 1) * cardGapXmm;
const cardsStartXmm = (pageWidthMm - gridWidthMm) / 2;
const cardsStartYmm = 66;

const imageFillColor = "#A4ACDF";
const cardBorderColor = "#111827";
const labelBackgroundColor = "#F3F4F6";
const guideTextColor = "#E6E7EB";

export const vocabularyLearningCardTemplate: Template = {
  id: "vocabularyLearningCard",
  name: "어휘 학습 카드",
  elements: [
    {
      type: "rect",
      x: mmToPx(logoXmm),
      y: mmToPx(logoYmm),
      w: mmToPx(logoWidthMm),
      h: mmToPx(logoHeightMm),
      fill: `url(${images.mainLogo})`,
      locked: true,
      selectable: false,
    },
    {
      type: "text",
      x: mmToPx(titleXmm),
      y: mmToPx(titleYmm),
      w: mmToPx(titleWidthMm),
      h: mmToPx(titleHeightMm),
      text: "어휘 학습 카드",
      style: {
        fontSize: 32,
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
      const x = cardsStartXmm + col * (cardWidthMm + cardGapXmm);
      const y =
        cardsStartYmm + row * (cardHeightMm + labelAreaHeightMm + cardGapYmm);
      const imageHeightMm = cardHeightMm - labelAreaHeightMm;
      const labelTempId = `vocab-card-label-${index}`;
      return [
        {
          type: "roundRect" as const,
          subType: "imageSlot" as const,
          x: mmToPx(x),
          y: mmToPx(y),
          w: mmToPx(cardWidthMm),
          h: mmToPx(imageHeightMm),
          fill: imageFillColor,
          radius: mmToPx(1),
          border: {
            enabled: true,
            color: cardBorderColor,
            width: 1.4,
            style: "solid" as const,
          },
          text: "목표 어휘에 맞는 이미지를 삽입해보세요.",
          textStyle: {
            fontSize: 14,
            fontWeight: "normal" as const,
            color: guideTextColor,
          },
          labelId: labelTempId,
        },
        {
          type: "rect" as const,
          x: mmToPx(x),
          y: mmToPx(y + imageHeightMm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(labelAreaHeightMm),
          fill: labelBackgroundColor,
          border: {
            enabled: true,
            color: cardBorderColor,
            width: 1.4,
            style: "solid" as const,
          },
          selectable: true,
          locked: false,
        },
        {
          type: "text" as const,
          tempId: labelTempId,
          x: mmToPx(x),
          y: mmToPx(y + imageHeightMm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(labelAreaHeightMm),
          text: "목표 어휘",
          style: {
            fontSize: 25,
            fontWeight: "normal" as const,
            color: "#111827",
            underline: false as const,
            alignX: "center" as const,
            alignY: "middle" as const,
          },
        },
      ];
    }),
  ],
};
