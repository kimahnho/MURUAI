/**
 * 단어 짝맞추기 템플릿 페이지 구조를 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;

const headerHeightMm = 20;
const instructionHeightMm = 6;
const instructionYmm = headerHeightMm + 8;

const cardColumns = 3;
const cardRows = 4;
const cardWidthMm = 45;
const cardGapMm = 10;
const cardLabelHeightMm = 6;
const cardLabelGapMm = 2;
const cardImageSizeMm = 32;
const cardUnderlineGapMm = 3;
const cardUnderlineHeightMm = 1;
const cardBlockHeightMm =
  cardLabelHeightMm +
  cardLabelGapMm +
  cardImageSizeMm +
  cardUnderlineGapMm +
  cardUnderlineHeightMm;
const cardRowGapMm = 8;
const gridWidthMm = cardColumns * cardWidthMm + (cardColumns - 1) * cardGapMm;
const gridStartXmm = (pageWidthMm - gridWidthMm) / 2;
const gridStartYmm = instructionYmm + instructionHeightMm + 8;

const logoWidthMm = 40;
const logoHeightMm = 40;
const logoXmm = 0;
const logoYmm = -12;

export const wordPairTemplate: Template = {
  id: "wordPair",
  name: "낱말 짝꿍 (단어+그림)",
  elements: [
    {
      type: "rect",
      x: 0,
      y: 0,
      w: mmToPx(pageWidthMm),
      h: mmToPx(headerHeightMm),
      fill: "#93C5FD",
    },
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
      x: 0,
      y: 0,
      w: mmToPx(pageWidthMm),
      h: mmToPx(headerHeightMm),
      text: "제목",
      style: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#FFFFFF",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: 0,
      y: mmToPx(instructionYmm),
      w: mmToPx(pageWidthMm),
      h: mmToPx(instructionHeightMm),
      text: "낱말 짝꿍을 비교해요.",
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
      const cardXmm = gridStartXmm + col * (cardWidthMm + cardGapMm);
      const cardYmm = gridStartYmm + row * (cardBlockHeightMm + cardRowGapMm);
      const imageYmm = cardYmm + cardLabelHeightMm + cardLabelGapMm;
      const underlineYmm = imageYmm + cardImageSizeMm + cardUnderlineGapMm;

      const labelTempId = `word-label-${index}`;
      const cardTempId = `word-card-${index}`;

      return [
        // 라벨 텍스트와 카드(labelId)를 tempId로 연결해 AAC 스타일 후처리와 동일한 연결 규칙을 사용한다.
        {
          type: "text" as const,
          tempId: labelTempId,
          x: mmToPx(cardXmm),
          y: mmToPx(cardYmm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(cardLabelHeightMm),
          text: "단어 입력",
          style: {
            fontSize: 14,
            fontWeight: "normal" as const,
            color: "#6B7280",
            underline: false as const,
            alignX: "center" as const,
            alignY: "middle" as const,
          },
        },
        {
          type: "roundRect" as const,
          tempId: cardTempId,
          labelId: labelTempId,
          x: mmToPx(cardXmm),
          y: mmToPx(imageYmm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(cardImageSizeMm),
          fill: "#E5E7EB",
          radius: mmToPx(2),
          border: {
            enabled: true,
            color: "#E5E7EB",
            width: 2,
            style: "solid" as const,
          },
          selectable: true,
        },
        {
          type: "rect" as const,
          x: mmToPx(cardXmm),
          y: mmToPx(underlineYmm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(cardUnderlineHeightMm),
          fill: "#111827",
        },
      ];
    }),
  ],
};
