/**
 * 사용 가능한 템플릿 메타데이터와 조회 함수를 제공하는 레지스트리 모듈.
 */
import type { Template } from "../model/canvasTypes";
import { emotionWorksheetTemplate } from "./emotionWorksheetTemplate";
import { emotionInferencePage1 } from "./emotion_inference/page_1";
import { emotionInferencePage2 } from "./emotion_inference/page_2";
import { emotionInferencePage3 } from "./emotion_inference/page_3";
import { emotionInferencePage4 } from "./emotion_inference/page_4";
import { findItemTemplate } from "./findItemTemplate";
import { normal_1 } from "./normal_1";
import { normal_2 } from "./normal_2";
import { wordPairTemplate } from "./wordPairTemplate";
import { visualScheduleTemplate } from "./visualScheduleTemplate";
import { vocabularyLearningCardTemplate } from "./vocabularyLearningCardTemplate";

export type TemplateOrientation = "free" | "vertical-only" | "horizontal-only";

export const TEMPLATE_REGISTRY = {
  findItem: {
    id: "findItem",
    label: "사물 찾기",
    template: findItemTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  emotionInference: {
    id: "emotionInference",
    label: "감정 추론 활동",
    template: emotionInferencePage4,
    orientation: "vertical-only" as TemplateOrientation,
    pages: [
      emotionInferencePage1,
      emotionInferencePage2,
      emotionInferencePage3,
      emotionInferencePage4,
    ],
  },
  emotionWorksheet: {
    id: "emotionWorksheet",
    label: "감정 워크시트(심화)",
    template: emotionWorksheetTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  wordPair: {
    id: "wordPair",
    label: "낱말 짝꿍 (단어+그림)",
    template: wordPairTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  visualSchedule: {
    id: "visualSchedule",
    label: "시각적 스케줄표",
    template: visualScheduleTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  vocabularyLearningCard: {
    id: "vocabularyLearningCard",
    label: "어휘 학습 카드",
    template: vocabularyLearningCardTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  normal_1: {
    id: "normal_1",
    label: "감정 어휘 표현 일기",
    template: normal_1,
    orientation: "vertical-only" as TemplateOrientation,
  },
  normal_2: {
    id: "normal_2",
    label: "감정 탐험 노트",
    template: normal_2,
    orientation: "vertical-only" as TemplateOrientation,
  },
};

export type TemplateId = keyof typeof TEMPLATE_REGISTRY;

// 다중 페이지 템플릿은 pages 필드를 사용하고, 단일 페이지 템플릿은 template만 사용한다.
export type TemplateDefinition = {
  id: TemplateId;
  label: string;
  template: Template;
  orientation: TemplateOrientation;
  pages?: Template[];
};
