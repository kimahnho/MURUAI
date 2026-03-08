/**
 * 감정 추론 AI 스토리 데이터를 기반으로 13페이지 분량의 Page 배열을 빌드하는 모듈.
 * 고정 3페이지(표지/목차/치료목표) + AI 텍스트가 주입된 4페이지 형식 10장으로 구성된다.
 */
import type { Page } from "../model/pageTypes";
import type { CanvasElement } from "../model/canvasTypes";
import type { StoryItem } from "../ai/generateEmotionStory";
import { instantiateTemplate } from "../templates/instantiateTemplate";
import { withLogoCanvasElements } from "./logoElement";
import { emotionInferencePage1 } from "../templates/emotion_inference/page_1";
import { emotionInferencePage2 } from "../templates/emotion_inference/page_2";
import { emotionInferencePage3 } from "../templates/emotion_inference/page_3";
import { emotionInferencePage4 } from "../templates/emotion_inference/page_4";

const TITLE_PLACEHOLDER = "제목을 입력하세요";
const SENTENCE_PLACEHOLDER = "아이는 __________";

const patchStoryElements = (
  elements: CanvasElement[],
  story: StoryItem,
): CanvasElement[] =>
  elements.map((el) => {
    if (el.type === "text" && el.text === TITLE_PLACEHOLDER) {
      return { ...el, text: story.title };
    }
    if (el.type === "text" && el.text === SENTENCE_PLACEHOLDER) {
      // fitTemplateTextElement가 플레이스홀더 기준으로 w/h를 좁게 계산해두므로,
      // 실제 AI 문장으로 교체할 때 w를 page_4 pillWidthMm(160mm≈605px)으로 복원한다.
      // h는 1줄 높이(fontSize:35 × lineHeight:1.3 ≈ 46px)로 설정한다.
      // fixed 모드에서 1줄이면 shouldMeasureHeight=false로 스킵되므로 1줄 높이가 정확한 초기값이다.
      // 2줄 이상 문장은 autoResize가 h를 늘려 보정한다. 썸네일은 readOnly라 초기값으로 고정된다.
      // 190mm = A4(210mm) - 좌우 여백 각 10mm
      // pillXmm = (210 - 190) / 2 = 10mm
      const pillXPx = Math.round(10 * 3.7795);
      const pillWidthPx = Math.round(190 * 3.7795);
      return {
        ...el,
        text: story.sentence,
        widthMode: "fixed" as const,
        x: pillXPx,
        y: el.y,
        w: pillWidthPx,
        h: 46,
      };
    }
    return el;
  });

export const buildEmotionStoryPages = (stories: StoryItem[]): Page[] => {
  // 고정 3페이지 (표지, 목차, 치료목표)
  const fixedTemplates = [
    emotionInferencePage1,
    emotionInferencePage2,
    emotionInferencePage3,
  ];
  const fixedPages: Page[] = fixedTemplates.map((template) => ({
    id: crypto.randomUUID(),
    pageNumber: 0,
    templateId: "emotionInference" as const,
    orientation: "vertical" as const,
    elements: withLogoCanvasElements(instantiateTemplate(template)),
    rev: 0,
  }));

  // AI 스토리 10장 (page_4 레이아웃 × 10)
  const storyPages: Page[] = stories.map((story) => {
    // 장마다 개별 instantiate — 요소 id 충돌 방지
    const baseElements = withLogoCanvasElements(
      instantiateTemplate(emotionInferencePage4),
    );
    return {
      id: crypto.randomUUID(),
      pageNumber: 0,
      templateId: "emotionInference" as const,
      orientation: "vertical" as const,
      elements: patchStoryElements(baseElements, story),
      rev: 0,
    };
  });

  const allPages = [...fixedPages, ...storyPages];
  // pageNumber는 MainSection에서 기존 pages와 합산 후 재계산하므로 여기선 임시값 사용
  return allPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
};
