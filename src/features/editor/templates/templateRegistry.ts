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
import { fiveSpaceWritingNote } from "./fiveSpaceWritingNote";
import { tenSpaceWritingNote } from "./tenSpaceWritingNote";
import { lineNoteWideTemplate } from "./lineNoteWideTemplate";
import { lineNoteMediumTemplate } from "./lineNoteMediumTemplate";
import { lineNoteNarrowTemplate } from "./lineNoteNarrowTemplate";
import { emotionDiaryTemplate } from "./emotionDiaryTemplate";
import { pictureDiaryLineNoteTemplate } from "./pictureDiaryLineNoteTemplate";
import { dictationPracticeTemplate } from "./dictationPracticeTemplate";
import { yellowDiaryLinesTemplate } from "./yellowDiaryLinesTemplate";
import { labelSheet3x8Template } from "./labelSheet3x8Template";
import { pictureScheduleTemplate } from "./pictureScheduleTemplate";
import { wavyLineTracingTemplate } from "./wavyLineTracingTemplate";
import { variousLineTracingTemplate } from "./variousLineTracingTemplate";
import { crossLineTracingTemplate } from "./crossLineTracingTemplate";
import { easyCrossLineTracingTemplate } from "./easyCrossLineTracingTemplate";
import { straightLineTracingTemplate } from "./straightLineTracingTemplate";
import { trainTemplatePage1 } from "./train_template/page_1";
import { trainTemplatePage2 } from "./train_template/page_2";
import { trainTemplate2Page1 } from "./train_template_2/page_1";
import { trainTemplate2Page2 } from "./train_template_2/page_2";

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
  fiveSpaceWritingNote: {
    id: "fiveSpaceWritingNote",
    label: "5칸 쓰기노트",
    template: fiveSpaceWritingNote,
    orientation: "vertical-only" as TemplateOrientation,
  },
  tenSpaceWritingNote: {
    id: "tenSpaceWritingNote",
    label: "10칸 쓰기노트",
    template: tenSpaceWritingNote,
    orientation: "vertical-only" as TemplateOrientation,
  },
  lineNoteWide: {
    id: "lineNoteWide",
    label: "줄노트 넓은간격",
    template: lineNoteWideTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  lineNoteMedium: {
    id: "lineNoteMedium",
    label: "줄노트 중간간격",
    template: lineNoteMediumTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  lineNoteNarrow: {
    id: "lineNoteNarrow",
    label: "줄노트 좁은간격",
    template: lineNoteNarrowTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  emotionDiary: {
    id: "emotionDiary",
    label: "감정일기",
    template: emotionDiaryTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  pictureDiaryLineNote: {
    id: "pictureDiaryLineNote",
    label: "그림일기 줄노트",
    template: pictureDiaryLineNoteTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  dictationPractice: {
    id: "dictationPractice",
    label: "받아쓰기 연습장",
    template: dictationPracticeTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  yellowDiaryLines: {
    id: "yellowDiaryLines",
    label: "일기장 노랑 줄글",
    template: yellowDiaryLinesTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  labelSheet3x8: {
    id: "labelSheet3x8",
    label: "라벨지 3×8",
    template: labelSheet3x8Template,
    orientation: "vertical-only" as TemplateOrientation,
  },
  pictureSchedule: {
    id: "pictureSchedule",
    label: "그림 시간표",
    template: pictureScheduleTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  wavyLineTracing: {
    id: "wavyLineTracing",
    label: "선 긋기 (구불구불 선)",
    template: wavyLineTracingTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  variousLineTracing: {
    id: "variousLineTracing",
    label: "선 긋기 (다양한 선)",
    template: variousLineTracingTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  crossLineTracing: {
    id: "crossLineTracing",
    label: "선 긋기 (복잡한 교차하기)",
    template: crossLineTracingTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  easyCrossLineTracing: {
    id: "easyCrossLineTracing",
    label: "선 긋기 (쉬운 교차하기)",
    template: easyCrossLineTracingTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  straightLineTracing: {
    id: "straightLineTracing",
    label: "선 긋기 (직선)",
    template: straightLineTracingTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  trainTemplate: {
    id: "trainTemplate",
    label: "기차 템플릿",
    template: trainTemplatePage1,
    orientation: "horizontal-only" as TemplateOrientation,
    pages: [trainTemplatePage1, trainTemplatePage2],
  },
  trainTemplate2: {
    id: "trainTemplate2",
    label: "기차 템플릿2",
    template: trainTemplate2Page1,
    orientation: "horizontal-only" as TemplateOrientation,
    pages: [trainTemplate2Page1, trainTemplate2Page2],
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
