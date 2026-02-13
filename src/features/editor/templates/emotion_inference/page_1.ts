/**
 * 감정 추론 템플릿 1페이지 구성을 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const pageHeightMm = 297;

// 외곽 프레임/헤더 요소 배치
const frameInsetMm = 5;
const frameWidthMm = pageWidthMm - frameInsetMm * 2;
const frameHeightMm = pageHeightMm - frameInsetMm * 2;
const frameRadiusMm = 10;

const logoXmm = frameInsetMm + 4;
const logoYmm = frameInsetMm - 3;
const logoWidthMm = 24;
const logoHeightMm = logoWidthMm;

const faceWidthMm = 110;
const faceHeightMm = 22;
const faceXmm = (pageWidthMm - faceWidthMm) / 2;
const faceYmm = 60;
const faceRadiusMm = faceHeightMm / 2;

const faceTextWidthMm = 60;
const faceTextHeightMm = 10;
const faceTextXmm = (pageWidthMm - faceTextWidthMm) / 2;
const faceTextYmm = faceYmm + (faceHeightMm - faceTextHeightMm) / 2;

const mouthYmm = faceYmm + faceHeightMm + 8;
const mouthWidthMm = 6;
const mouthHeightMm = 6;
const mouthGapMm = 8;

// 선택 카드 그리드 배치
const cardWidthMm = 70;
const cardHeightMm = 40;
const cardGapMm = 8;
const cardsRowWidthMm = cardWidthMm * 2 + cardGapMm;
const cardsStartXmm = (pageWidthMm - cardsRowWidthMm) / 2;
const cardsStartYmm = mouthYmm + 10;
const cardRadiusMm = 4;

const indicatorWidthMm = 20;
const indicatorHeightMm = 6;
const cardsBlockHeightMm = cardHeightMm * 2 + cardGapMm;
const indicatorYmm = cardsStartYmm + cardsBlockHeightMm + 6;
const indicatorXmm = (pageWidthMm - indicatorWidthMm) / 2;

export const emotionInferencePage1: Template = {
  id: "emotionInference_1",
  name: "감정 추론 활동 1",
  elements: [
    {
      type: "roundRect",
      x: mmToPx(frameInsetMm),
      y: mmToPx(frameInsetMm),
      w: mmToPx(frameWidthMm),
      h: mmToPx(frameHeightMm),
      fill: "#ffffff",
      radius: mmToPx(frameRadiusMm),
      border: {
        enabled: true,
        color: "#F59E0B",
        width: 2,
        style: "solid",
      },
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
      type: "roundRect",
      x: mmToPx(faceXmm),
      y: mmToPx(faceYmm),
      w: mmToPx(faceWidthMm),
      h: mmToPx(faceHeightMm),
      fill: "#FF8A3D",
      radius: mmToPx(faceRadiusMm),
      border: {
        enabled: false,
        color: "#FF8A3D",
        width: 1,
        style: "solid",
      },
    },
    {
      type: "text",
      x: mmToPx(faceTextXmm),
      y: mmToPx(faceTextYmm),
      w: mmToPx(faceTextWidthMm),
      h: mmToPx(faceTextHeightMm),
      text: "'       '",
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
      x: mmToPx(pageWidthMm / 2 - mouthGapMm / 2 - mouthWidthMm),
      y: mmToPx(mouthYmm),
      w: mmToPx(mouthWidthMm * 2 + mouthGapMm),
      h: mmToPx(mouthHeightMm),
      text: "(   )",
      style: {
        fontSize: 16,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    ...Array.from({ length: 4 }).map((_, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = cardsStartXmm + col * (cardWidthMm + cardGapMm);
      const y = cardsStartYmm + row * (cardHeightMm + cardGapMm);
      return {
        type: "roundRect" as const,
        x: mmToPx(x),
        y: mmToPx(y),
        w: mmToPx(cardWidthMm),
        h: mmToPx(cardHeightMm),
        fill: "#D1D5DB",
        radius: mmToPx(cardRadiusMm),
        border: {
          enabled: false,
          color: "#D1D5DB",
          width: 1,
        },
      };
    }),
    {
      type: "text",
      x: mmToPx(indicatorXmm),
      y: mmToPx(indicatorYmm),
      w: mmToPx(indicatorWidthMm),
      h: mmToPx(indicatorHeightMm),
      text: "-  -",
      style: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#F59E0B",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
  ],
};
