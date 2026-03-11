/**
 * 라벨지 3×8 템플릿: A4 세로 용지에 3열 × 8행 = 24개의 둥근 모서리 라벨 배치.
 */
import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const MARGIN_X = 12;
const MARGIN_Y = 14.5;
const LABEL_W = 60;
const LABEL_H = 30;
const GAP_X = 3;
const GAP_Y = 4;
const RADIUS = 3;

const COLS = 3;
const ROWS = 8;

const labels = Array.from({ length: ROWS * COLS }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return {
    type: "roundRect" as const,
    x: mmToPx(MARGIN_X + col * (LABEL_W + GAP_X)),
    y: mmToPx(MARGIN_Y + row * (LABEL_H + GAP_Y)),
    w: mmToPx(LABEL_W),
    h: mmToPx(LABEL_H),
    fill: "#ffffff",
    radius: mmToPx(RADIUS),
    border: {
      enabled: true,
      color: "#000000",
      width: 1,
      style: "solid" as const,
    },
  };
});

export const labelSheet3x8Template: Template = {
  id: "labelSheet3x8",
  name: "라벨지 3×8",
  elements: labels,
};
