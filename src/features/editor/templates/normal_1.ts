import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const horizontalPaddingMm = 18;
const contentWidthMm = pageWidthMm - horizontalPaddingMm * 2;

const titleYmm = 18;
const titleHeightMm = 12;
const instructionHeightMm = 6;

const instruction1Ymm = titleYmm + titleHeightMm + 4;
const box1Ymm = instruction1Ymm + instructionHeightMm + 4;
const box1HeightMm = 112;

const instruction2Ymm = box1Ymm + box1HeightMm + 6;
const box2Ymm = instruction2Ymm + instructionHeightMm + 4;
const box2HeightMm = 88;

const boxRadiusMm = 4;
const boxBorderColor = "#B46B45";

export const normal_1: Template = {
  id: "normal_1",
  name: "normal_1",
  elements: [
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(titleYmm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(titleHeightMm),
      text: '"○○"에 있었던 일을 떠올려 봅시다.',
      style: {
        fontSize: 30,
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
      y: mmToPx(instruction1Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(instructionHeightMm),
      text: '1. "○○"을 떠올리며 가장 기억에 남는 일을 글로 쓰거나 그림으로 표현해 봅시다.',
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
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(box1Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(box1HeightMm),
      fill: "#ffffff",
      radius: mmToPx(boxRadiusMm),
      border: {
        enabled: true,
        color: boxBorderColor,
        width: 2,
        style: "dashed",
      },
    },
    {
      type: "text",
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(instruction2Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(instructionHeightMm),
      text: "2. 그때의 기분은 어땠나요?",
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
      x: mmToPx(horizontalPaddingMm),
      y: mmToPx(box2Ymm),
      w: mmToPx(contentWidthMm),
      h: mmToPx(box2HeightMm),
      fill: "#ffffff",
      radius: mmToPx(boxRadiusMm),
      border: {
        enabled: true,
        color: boxBorderColor,
        width: 2,
        style: "dashed",
      },
    },
  ],
};
