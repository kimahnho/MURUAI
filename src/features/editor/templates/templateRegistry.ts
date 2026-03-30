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
import { coloringPage1 } from "./coloringPage1";
import { coloringPage2 } from "./coloringPage2";
import { coloringPage3 } from "./coloringPage3";
import { coloringPage4 } from "./coloringPage4";
import { coloringPage5 } from "./coloringPage5";
import { dotTracingPage1 } from "./dotTracingPage1";
import { dotTracingPage2 } from "./dotTracingPage2";
import { dotTracingPage3 } from "./dotTracingPage3";
import { dotTracingPage4 } from "./dotTracingPage4";
import { dotTracingPage5 } from "./dotTracingPage5";

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
  coloringPage1: {
    id: "coloringPage1",
    label: "색칠공부 1",
    template: coloringPage1,
    orientation: "vertical-only" as TemplateOrientation,
  },
  coloringPage2: {
    id: "coloringPage2",
    label: "색칠공부 2",
    template: coloringPage2,
    orientation: "vertical-only" as TemplateOrientation,
  },
  coloringPage3: {
    id: "coloringPage3",
    label: "색칠공부 3",
    template: coloringPage3,
    orientation: "vertical-only" as TemplateOrientation,
  },
  coloringPage4: {
    id: "coloringPage4",
    label: "색칠공부 4",
    template: coloringPage4,
    orientation: "vertical-only" as TemplateOrientation,
  },
  coloringPage5: {
    id: "coloringPage5",
    label: "색칠공부 5",
    template: coloringPage5,
    orientation: "vertical-only" as TemplateOrientation,
  },
  dotTracingPage1: {
    id: "dotTracingPage1",
    label: "점선 따라그리기 1",
    template: dotTracingPage1,
    orientation: "vertical-only" as TemplateOrientation,
  },
  dotTracingPage2: {
    id: "dotTracingPage2",
    label: "점선 따라그리기 2",
    template: dotTracingPage2,
    orientation: "vertical-only" as TemplateOrientation,
  },
  dotTracingPage3: {
    id: "dotTracingPage3",
    label: "점선 따라그리기 3",
    template: dotTracingPage3,
    orientation: "vertical-only" as TemplateOrientation,
  },
  dotTracingPage4: {
    id: "dotTracingPage4",
    label: "점선 따라그리기 4",
    template: dotTracingPage4,
    orientation: "vertical-only" as TemplateOrientation,
  },
  dotTracingPage5: {
    id: "dotTracingPage5",
    label: "점선 따라그리기 5",
    template: dotTracingPage5,
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
