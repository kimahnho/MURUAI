/**
 * 감정 추론 AI 스토리 데이터를 기반으로 13페이지 분량의 Page 배열을 빌드하는 모듈.
 * 고정 3페이지(표지/목차/치료목표) + AI 텍스트가 주입된 4페이지 형식 10장으로 구성된다.
 */
import type { Page } from "../model/pageTypes";
import type { CanvasElement, ShapeElement } from "../model/canvasTypes";
import type { StoryItem } from "../ai/generateEmotionStory";
import { instantiateTemplate } from "../templates/instantiateTemplate";
import { withLogoCanvasElements } from "./logoElement";
import { calculateCoverImageBox } from "./imageFillUtils";
import { emotionInferencePage1 } from "../templates/emotion_inference/page_1";
import { emotionInferencePage2 } from "../templates/emotion_inference/page_2";
import { emotionInferencePage3 } from "../templates/emotion_inference/page_3";
import { emotionInferencePage4 } from "../templates/emotion_inference/page_4";

const TITLE_PLACEHOLDER = "제목을 입력하세요";
const SENTENCE_PLACEHOLDER = "아이는 __________";
const LABEL_PLACEHOLDER = "(감정)";

// 감정 사진 기본 크기 (사이드바 삽입 시 사용하는 크기와 동일)
const EMOTION_IMAGE_SIZE = { width: 200, height: 260 };

const patchStoryElements = (
  elements: CanvasElement[],
  story: StoryItem,
  emotionImageMap: Map<string, string>,
): CanvasElement[] => {
  // 감정 카드를 x 좌표 순으로 정렬해 왼→오른 순서로 emotions[0,1,2]에 매칭
  const emotionCards = elements.filter(
    (el): el is ShapeElement =>
      (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") &&
      el.subType === "emotionInference",
  ).sort((a, b) => a.x - b.x);

  // 카드 id → 감정 이름 매핑 (라벨 업데이트용)
  const cardEmotionMap = new Map<string, string>();
  // 라벨 id → 감정 이름 매핑
  const labelEmotionMap = new Map<string, string>();

  emotionCards.forEach((card, index) => {
    const emotion = story.emotions[index];
    if (!emotion) return;
    cardEmotionMap.set(card.id, emotion);
    if (card.labelId) {
      labelEmotionMap.set(card.labelId, emotion);
    }
  });

  return elements.map((el) => {
    // 제목 패치 — widthMode: "fixed"로 한 줄 표시 보장
    if (el.type === "text" && el.text === TITLE_PLACEHOLDER) {
      const titleWidthPx = Math.round(190 * 3.7795);
      const titleXPx = Math.round(10 * 3.7795);
      return {
        ...el,
        text: story.title,
        widthMode: "fixed" as const,
        x: titleXPx,
        w: titleWidthPx,
        h: 46,
      };
    }
    // 추론 문장 패치
    if (el.type === "text" && el.text === SENTENCE_PLACEHOLDER) {
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
    // 감정 카드에 이미지 채우기 (cardEmotionMap에는 shape 요소 id만 있다)
    const cardEmotion = cardEmotionMap.get(el.id);
    if (
      cardEmotion &&
      (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic")
    ) {
      const imageUrl = emotionImageMap.get(cardEmotion);
      if (!imageUrl) {
        console.warn(`[buildEmotionStoryPages] 감정 이미지 누락: "${cardEmotion}"`);
      }
      if (imageUrl) {
        const imageBox = calculateCoverImageBox(
          el.w,
          el.h,
          EMOTION_IMAGE_SIZE.width,
          EMOTION_IMAGE_SIZE.height,
        );
        const borderWidth = el.border?.enabled ? el.border.width : 0;
        const correctedImageBox = borderWidth > 0
          ? {
              ...imageBox,
              x: Math.round(
                (Math.max(0, el.w - borderWidth * 2) - imageBox.w) / 2,
              ),
            }
          : imageBox;
        return {
          ...el,
          fill: `url(${imageUrl})`,
          imageBox: correctedImageBox,
          text: "",
        };
      }
    }
    // 감정 라벨 텍스트 업데이트
    const labelEmotion = labelEmotionMap.get(el.id);
    if (labelEmotion && el.type === "text" && el.text === LABEL_PLACEHOLDER) {
      return { ...el, text: labelEmotion };
    }
    return el;
  });
};

export const buildEmotionStoryPages = (
  stories: StoryItem[],
  emotionImageMap?: Map<string, string>,
): Page[] => {
  const imageMap = emotionImageMap ?? new Map<string, string>();

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
      elements: patchStoryElements(baseElements, story, imageMap),
      rev: 0,
    };
  });

  const allPages = [...fixedPages, ...storyPages];
  // pageNumber는 MainSection에서 기존 pages와 합산 후 재계산하므로 여기선 임시값 사용
  return allPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
};
