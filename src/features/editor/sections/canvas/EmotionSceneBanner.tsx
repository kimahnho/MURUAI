/**
 * 감정추론 AI 이미지 생성 플로팅 배너.
 * 텍스트 생성 후 캔버스 상단에 표시되어 이미지 생성/재생성/확정 플로우를 안내한다.
 * 다중 생성 세트를 지원하며, 현재 선택된 페이지에 해당하는 세트만 표시한다.
 */
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Check, ImageIcon, Loader2, RefreshCw, X } from "lucide-react";

import type { Page } from "@/features/editor/model/pageTypes";
import type { ShapeElement } from "@/features/editor/model/canvasTypes";
import type { EmotionImageStyle } from "@/features/editor/sections/sidebar/content/EmotionInferenceChoiceModal";
import { generateEmotionSceneImages } from "@/features/editor/ai/generateEmotionSceneImages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";
import { calculateCoverImageBox } from "@/features/editor/utils/imageFillUtils";
import {
  useEmotionSceneStore,
  type BannerPhase,
  type PendingGeneration,
} from "@/features/editor/store/emotionSceneStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import { mp } from "@/shared/utils/mixpanel";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import {
  updateAiGenerationImageStyle,
  confirmAiGeneration,
} from "@/shared/utils/trackAiGeneration";
import {
  checkAiCredits,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import EmotionSceneImageModal from "./EmotionSceneImageModal";

const MAX_IMAGE_PAGES = 15;

const EMOTION_IMAGE_SIZE = { width: 200, height: 260 };

interface EmotionSceneBannerProps {
  pages: Page[];
  selectedPageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
}

const EmotionSceneBanner = ({ pages, selectedPageId, setPages }: EmotionSceneBannerProps) => {
  const pendingGenerations = useEmotionSceneStore((s) => s.pendingGenerations);
  const generatingProgress = useEmotionSceneStore(
    (s) => s.generatingProgress,
  );
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [imageStyle, setImageStyle] =
    useState<EmotionImageStyle>("photo-boy");
  const [cardStyle, setCardStyle] =
    useState<EmotionImageStyle>("photo-boy");
  const [isSwappingCards, setIsSwappingCards] = useState(false);

  if (pendingGenerations.length === 0) return null;

  // 실제 존재하는 페이지 ID 셋
  const existingPageIds = new Set(pages.map((p) => p.id));

  // 현재 선택된 페이지를 포함하는 세트 찾기
  let matchedGeneration: PendingGeneration | null = null;
  let validStoryPageIds: string[] = [];

  for (const pg of pendingGenerations) {
    const validIds = pg.storyPageIds.filter((id) => existingPageIds.has(id));
    if (validIds.length === 0) {
      // 모든 페이지가 삭제된 세트 → 제거
      useEmotionSceneStore.getState().removePendingGeneration(pg.storyPageIds);
      continue;
    }
    if (validIds.includes(selectedPageId)) {
      matchedGeneration = pg;
      validStoryPageIds = validIds;
      break;
    }
  }

  if (!matchedGeneration) return null;

  const { stories, storyPageIds: originalIds, bannerPhase } = matchedGeneration;
  const storyPageIds = validStoryPageIds;

  // 감정 카드 성별 실시간 교체
  const handleCardStyleChange = async (nextStyle: EmotionImageStyle) => {
    if (nextStyle === cardStyle || isSwappingCards) return;
    setCardStyle(nextStyle);
    setIsSwappingCards(true);

    try {
      const emotionImageMap = await fetchEmotionImageMap(nextStyle);

      setPages((prev) =>
        prev.map((page) => {
          if (!storyPageIds.includes(page.id)) return page;

          // 원본 stories에서 해당 페이지의 인덱스 찾기
          const storyIndex = originalIds.indexOf(page.id);
          const story = stories[storyIndex];
          if (!story) return page;

          // 감정 카드를 x좌표 순 정렬하여 emotions[0,1,2] 매칭
          const emotionCards = page.elements
            .filter(
              (el): el is ShapeElement =>
                (el.type === "rect" ||
                  el.type === "roundRect" ||
                  el.type === "ellipse" ||
                  el.type === "mosaic" ||
                  el.type === "circleMosaic") &&
                el.subType === "emotionInference",
            )
            .sort((a, b) => a.x - b.x);

          const cardIdToUrl = new Map<string, string>();
          emotionCards.forEach((card, idx) => {
            const emotion = story.emotions[idx];
            if (!emotion) return;
            const url = emotionImageMap.get(emotion);
            if (url) cardIdToUrl.set(card.id, url);
          });

          if (cardIdToUrl.size === 0) return page;

          const nextElements = page.elements.map((el) => {
            const url = cardIdToUrl.get(el.id);
            if (!url) return el;
            // cardIdToUrl에는 ShapeElement(emotionInference)만 등록되어 있으므로 안전
            const shape = el as ShapeElement;
            const imageBox = calculateCoverImageBox(
              shape.w,
              shape.h,
              EMOTION_IMAGE_SIZE.width,
              EMOTION_IMAGE_SIZE.height,
            );
            return { ...el, fill: `url(${url})`, imageBox };
          });

          return { ...page, elements: nextElements };
        }),
      );
      mp.track("감정 카드 성별 변경", { style: nextStyle });
    } catch (error) {
      captureSentryError(error, "감정 카드 이미지 로드");
      useToastStore
        .getState()
        .showToast("감정 카드 이미지를 불러오지 못했어요.");
    } finally {
      setIsSwappingCards(false);
    }
  };

  const handleGenerateImages = async () => {
    // 이미지 스타일 선택 추적
    const logId = sessionStorage.getItem("aiGenerationLogId");
    if (logId) void updateAiGenerationImageStyle(logId, imageStyle);

    // 유효한 페이지에 매칭되는 stories만 필터링 (삭제된 페이지 제외)
    const validPageIdSet = new Set(storyPageIds);
    const validPairs: { story: (typeof stories)[number]; pageId: string }[] = [];
    for (let i = 0; i < originalIds.length; i++) {
      if (validPageIdSet.has(originalIds[i])) {
        validPairs.push({ story: stories[i], pageId: originalIds[i] });
      }
    }

    // 캔버스에서 현재 텍스트를 읽어 title/sentence를 갱신 (수기 편집 반영)
    const updatedPairs = validPairs.map(({ story, pageId }) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return { story, pageId };

      const textElements = page.elements.filter(
        (el): el is Extract<typeof el, { type: "text" }> =>
          el.type === "text" &&
          typeof el.text === "string" &&
          el.text !== "(감정)" &&
          el.text.trim() !== "",
      );
      const title = textElements[0]?.text ?? story.title;
      const sentence = textElements[1]?.text ?? story.sentence;

      return { story: { ...story, title, sentence }, pageId };
    });

    // 15장 제한
    const isOverLimit = updatedPairs.length > MAX_IMAGE_PAGES;
    if (isOverLimit) {
      useToastStore
        .getState()
        .showToast(`최대 이미지 생성 페이지는 ${MAX_IMAGE_PAGES}장입니다.`);
    }
    const targetPairs = isOverLimit
      ? updatedPairs.slice(0, MAX_IMAGE_PAGES)
      : updatedPairs;
    const targetStories = targetPairs.map((p) => p.story);
    const targetPageIds = targetPairs.map((p) => p.pageId);

    // 이미지 크레딧 체크
    const creditCheck = await checkAiCredits(targetStories.length);
    if (!creditCheck.canProceed) {
      useToastStore
        .getState()
        .showToast(
          `이미지 크레딧이 부족해요. (남은 크레딧: ${creditCheck.remaining}개)`,
        );
      return;
    }

    const store = useEmotionSceneStore.getState();
    store.setBannerPhase(originalIds, "generating");

    try {
      const heroImageUrls = await generateEmotionSceneImages(
        targetStories,
        imageStyle,
        (current, total) => {
          useEmotionSceneStore.getState().setGeneratingProgress({
            current,
            total,
          });
        },
      );

      const urlMap = new Map<string, string>();
      targetPageIds.forEach((pageId, index) => {
        if (heroImageUrls[index]) {
          urlMap.set(pageId, heroImageUrls[index]);
        }
      });

      useEmotionSceneStore.getState().requestHeroImagePatch(urlMap);

      const groupFirstUrls = new Map<number, string>();
      const meta = targetStories.map((story, i) => {
        const isFirst = !groupFirstUrls.has(story.sceneGroup);
        if (isFirst && heroImageUrls[i]) {
          groupFirstUrls.set(story.sceneGroup, heroImageUrls[i]);
        }
        return {
          pageIndex: i,
          originalPrompt: `${story.title} ${story.sentence}`,
          sceneGroup: story.sceneGroup,
          isGroupFirst: isFirst,
          groupFirstImageBase64: null,
          generatedImageUrl: heroImageUrls[i] ?? "",
        };
      });
      useEmotionSceneStore.getState().setGenerationMeta(meta);
      useEmotionSceneStore.getState().setBannerPhase(originalIds, "completed");

      // 이미지 크레딧 차감 (성공 후)
      void recordAiCreditUsage("emotion", targetStories.length);

      mp.track("AI 장면 이미지 생성", {
        image_style: imageStyle,
        page_count: targetStories.length,
      });
    } catch (error) {
      captureSentryError(error, "AI 장면 이미지 생성");
      useToastStore
        .getState()
        .showToast("이미지 생성에 실패했어요. 다시 시도해 주세요.");
      useEmotionSceneStore.getState().setBannerPhase(originalIds, "ready");
    } finally {
      useEmotionSceneStore.getState().setGeneratingProgress(null);
    }
  };

  const handleDismiss = () => {
    useEmotionSceneStore.getState().removePendingGeneration(originalIds);
  };

  const handleConfirm = () => {
    // 최종 확정 추적: storyPageIds로 AI 10장의 최종 텍스트+이미지 추출
    const logId = sessionStorage.getItem("aiGenerationLogId");
    if (logId) {
      const finalTexts: { title: string; sentence: string }[] = [];
      const finalImageUrls: string[] = [];

      for (const pageId of storyPageIds) {
        const page = pages.find((p) => p.id === pageId);
        if (!page) continue;

        // 제목 + 추론 문장 추출 (text 타입 요소에서)
        let title = "";
        let sentence = "";
        let heroUrl = "";

        for (const el of page.elements) {
          if (el.type === "text") {
            // 제목: 짧은 텍스트 (첫 번째 text 요소)
            if (!title && el.text && el.text !== "(감정)") {
              title = el.text;
            } else if (title && !sentence && el.text && el.text !== "(감정)") {
              sentence = el.text;
            }
          }
          // 히어로 이미지: fill이 url()인 roundRect (subType 없음)
          if (
            (el.type === "roundRect" || el.type === "rect") &&
            !("subType" in el && el.subType) &&
            "fill" in el &&
            typeof el.fill === "string" &&
            el.fill.startsWith("url(")
          ) {
            heroUrl = el.fill.slice(4, -1);
          }
        }

        finalTexts.push({ title, sentence });
        finalImageUrls.push(heroUrl);
      }

      void confirmAiGeneration(logId, finalTexts, finalImageUrls, cardStyle, imageStyle);
      sessionStorage.removeItem("aiGenerationLogId");
    }

    mp.track("AI 감정추론 생성 확정", {
      card_style: cardStyle,
      image_style: imageStyle,
    });
    useEmotionSceneStore.getState().removePendingGeneration(originalIds);
  };

  return (
    <>
      <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2">
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-primary-200 bg-white-100 px-5 py-3 shadow-xl">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <BannerContent
              phase={bannerPhase}
              progress={generatingProgress}
              imageStyle={imageStyle}
              cardStyle={cardStyle}
              isSwappingCards={isSwappingCards}
              pageCount={storyPageIds.length}
              onImageStyleChange={setImageStyle}
              onCardStyleChange={handleCardStyleChange}
              onGenerate={handleGenerateImages}
              onRegenerate={() => setIsRegenModalOpen(true)}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          </div>
          {bannerPhase === "generating" && (
            <span className="text-12-regular text-primary-400">
              이미지 생성 중에는 내용을 수정하지 마세요
            </span>
          )}
          {bannerPhase === "ready" && storyPageIds.length > MAX_IMAGE_PAGES && (
            <span className="text-12-regular text-error-500">
              최대 이미지 생성 페이지는 {MAX_IMAGE_PAGES}장입니다
            </span>
          )}
        </div>
      </div>

      <EmotionSceneImageModal
        isOpen={isRegenModalOpen}
        stories={stories}
        storyPageIds={storyPageIds}
        pages={pages}
        onClose={() => setIsRegenModalOpen(false)}
        onComplete={() => setIsRegenModalOpen(false)}
      />
    </>
  );
};

// 배너 상태별 내부 콘텐츠
const BannerContent = ({
  phase,
  progress,
  imageStyle,
  cardStyle,
  isSwappingCards,
  pageCount,
  onImageStyleChange,
  onCardStyleChange,
  onGenerate,
  onRegenerate,
  onConfirm,
  onDismiss,
}: {
  phase: BannerPhase;
  progress: { current: number; total: number } | null;
  imageStyle: EmotionImageStyle;
  cardStyle: EmotionImageStyle;
  isSwappingCards: boolean;
  pageCount: number;
  onImageStyleChange: (style: EmotionImageStyle) => void;
  onCardStyleChange: (style: EmotionImageStyle) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) => {
  if (phase === "generating") {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-14-semibold text-black-90">
          {progress
            ? `이미지 생성 중 (${progress.current}/${progress.total})`
            : "이미지 생성 중..."}
        </span>
      </>
    );
  }

  if (phase === "completed") {
    return (
      <>
        <Check className="h-4 w-4 text-success-500" />
        <span className="text-14-semibold text-black-90">
          이미지가 생성되었어요!
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white-100 px-3 py-1.5 text-13-bold text-primary transition hover:bg-primary-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          이미지 재생성하기
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-primary px-3 py-1.5 text-13-bold text-white-100 transition hover:bg-primary-700"
        >
          확정하기
        </button>
      </>
    );
  }

  return (
    <>
      <ImageIcon className="h-4 w-4 text-primary" />
      <span className="text-14-semibold text-black-90 whitespace-nowrap">
        텍스트를 확인 후 이미지를 생성하세요
      </span>
      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-12-semibold text-primary">
        {Math.min(pageCount, MAX_IMAGE_PAGES)}장 · {Math.min(pageCount, MAX_IMAGE_PAGES)}크레딧
      </span>

      <span className="mx-1 h-4 w-px bg-black-20" />

      {/* 감정 카드 성별 */}
      <span className="text-12-semibold text-black-60">감정 카드</span>
      <div className="flex items-center gap-1">
        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-12-semibold transition ${cardStyle === "photo-boy" ? "border-primary bg-primary-50 text-primary" : "border-black-20 text-black-60 hover:bg-black-5"} ${isSwappingCards ? "opacity-50 pointer-events-none" : ""}`}>
          <input type="radio" name="cardStyle" checked={cardStyle === "photo-boy"} onChange={() => onCardStyleChange("photo-boy")} className="hidden" />
          남아
        </label>
        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-12-semibold transition ${cardStyle === "photo-girl" ? "border-primary bg-primary-50 text-primary" : "border-black-20 text-black-60 hover:bg-black-5"} ${isSwappingCards ? "opacity-50 pointer-events-none" : ""}`}>
          <input type="radio" name="cardStyle" checked={cardStyle === "photo-girl"} onChange={() => onCardStyleChange("photo-girl")} className="hidden" />
          여아
        </label>
      </div>

      <span className="mx-1 h-4 w-px bg-black-20" />

      {/* 장면 이미지 성별 */}
      <span className="text-12-semibold text-black-60">장면</span>
      <div className="flex items-center gap-1">
        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-12-semibold transition ${imageStyle === "photo-boy" ? "border-primary bg-primary-50 text-primary" : "border-black-20 text-black-60 hover:bg-black-5"}`}>
          <input type="radio" name="imageStyle" checked={imageStyle === "photo-boy"} onChange={() => onImageStyleChange("photo-boy")} className="hidden" />
          남아
        </label>
        <label className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-12-semibold transition ${imageStyle === "photo-girl" ? "border-primary bg-primary-50 text-primary" : "border-black-20 text-black-60 hover:bg-black-5"}`}>
          <input type="radio" name="imageStyle" checked={imageStyle === "photo-girl"} onChange={() => onImageStyleChange("photo-girl")} className="hidden" />
          여아
        </label>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        className="rounded-lg bg-primary px-3 py-1.5 text-13-bold text-white-100 transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이미지 생성
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-black-40 transition hover:bg-black-5 hover:text-black-70"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
};

export default EmotionSceneBanner;
