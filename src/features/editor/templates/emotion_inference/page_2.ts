/**
 * 감정 추론 템플릿 2페이지 구성을 정의하는 모듈.
 */
import { images } from "@/shared/assets";
import type { Template } from "../../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const pageHeightMm = 297;

const frameInsetMm = 5;
const frameWidthMm = pageWidthMm - frameInsetMm * 2;
const frameHeightMm = pageHeightMm - frameInsetMm * 2;
const frameRadiusMm = 10;

const logoXmm = frameInsetMm + 4;
const logoYmm = frameInsetMm - 3;
const logoWidthMm = 24;
const logoHeightMm = logoWidthMm;

const titleWidthMm = 80;
const titleHeightMm = 12;
const titleXmm = (pageWidthMm - titleWidthMm) / 2;
const titleYmm = 22;

export const emotionInferencePage2: Template = {
  id: "emotionInference_2",
  name: "감정 추론 활동 2",
  elements: [
    // 공통 프레임과 로고를 먼저 배치해 다른 페이지와 시각 규칙을 맞춘다.
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
      type: "text",
      x: mmToPx(titleXmm),
      y: mmToPx(titleYmm),
      w: mmToPx(titleWidthMm),
      h: mmToPx(titleHeightMm),
      text: "목차",
      style: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#F59E0B",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
  ],
};
