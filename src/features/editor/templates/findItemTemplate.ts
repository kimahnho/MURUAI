/**
 * 사물 찾기 활동 템플릿 구조를 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;

const titleWidthMm = 170;
const titleHeightMm = 20;
const titleXmm = (pageWidthMm - titleWidthMm) / 2;
const titleYmm = 40;

const boxSizeMm = 78;
const boxGapMm = 12;
const gridWidthMm = boxSizeMm * 2 + boxGapMm;
const gridStartXm = (pageWidthMm - gridWidthMm) / 2;
const gridStartYm = titleYmm + titleHeightMm + 22;

const logoWidthMm = 40;
const logoHeightMm = 40;
const logoXmm = 0;
const logoYmm = -12;

export const findItemTemplate: Template = {
  id: "findItem",
  name: "사물 찾기",
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
      text: '"○○"을 찾아봐!',
      style: {
        fontSize: 42,
        fontWeight: "bold",
        color: "#000000",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    // 2x2 카드 그리드를 반복 생성해 빈칸 활동지 기본 레이아웃을 구성한다.
    ...Array.from({ length: 4 }).map((_, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      return {
        type: "roundRect" as const,
        x: mmToPx(gridStartXm + col * (boxSizeMm + boxGapMm)),
        y: mmToPx(gridStartYm + row * (boxSizeMm + boxGapMm)),
        w: mmToPx(boxSizeMm),
        h: mmToPx(boxSizeMm),
        fill: "#b7c3ff",
        radius: mmToPx(8),
        border: {
          enabled: false,
          color: "#000000",
          width: 2,
        },
      };
    }),
  ],
};
