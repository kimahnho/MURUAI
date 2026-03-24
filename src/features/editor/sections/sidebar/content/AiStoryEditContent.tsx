/**
 * AI 감정추론 포커스 모드 사이드바 패널.
 * 3단계 UI: text-review(텍스트 편집) → image-generating(이미지 생성) → completed(확인/재생성/확정)
 */
import { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

import {
  useAiGenerationModeStore,
  type EmotionImageStyle,
} from "@/features/editor/store/aiGenerationModeStore";
import { useEmotionSceneStore } from "@/features/editor/store/emotionSceneStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";
import { generateEmotionSceneImages } from "@/features/editor/ai/generateEmotionSceneImages";
import { fetchEmotionImageMap } from "@/features/editor/utils/fetchEmotionImageMap";
import { calculateCoverImageBox } from "@/features/editor/utils/imageFillUtils";
import type { ShapeElement } from "@/features/editor/model/canvasTypes";
import type { Page } from "@/features/editor/model/pageTypes";
import {
  checkAiCredits,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import {
  confirmAiGeneration,
} from "@/shared/utils/trackAiGeneration";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import Button from "@/shared/ui/Button";
import BaseModal from "@/shared/ui/BaseModal";

const EMOTION_PHOTO_SIZE = { width: 200, height: 260 };
const EMOTION_EMOJI_SIZE = { width: 180, height: 180 };
const EMOJI_SCALE = 0.7;

const getEmotionImageSize = (style: EmotionImageStyle) =>
  style === "emoji" ? EMOTION_EMOJI_SIZE : EMOTION_PHOTO_SIZE;

const shrinkImageBox = (
  box: { x: number; y: number; w: number; h: number },
  elementW: number,
  elementH: number,
) => {
  const newW = box.w * EMOJI_SCALE;
  const newH = box.h * EMOJI_SCALE;
  return {
    x: (elementW - newW) / 2,
    y: (elementH - newH) / 2,
    w: newW,
    h: newH,
  };
};

const CARD_STYLE_OPTIONS: { value: EmotionImageStyle; label: string }[] = [
  { value: "photo-boy", label: "남아" },
  { value: "photo-girl", label: "여아" },
  { value: "emoji", label: "이모지" },
];

const AiStoryEditContent = () => {
  const isActive = useAiGenerationModeStore((s) => s.isActive);
  const step = useAiGenerationModeStore((s) => s.step);
  const storyPageIds = useAiGenerationModeStore((s) => s.storyPageIds);
  const stories = useAiGenerationModeStore((s) => s.stories);
  const imageStyle = useAiGenerationModeStore((s) => s.imageStyle);
  const cardStyle = useAiGenerationModeStore((s) => s.cardStyle);
  const completedPageIds = useAiGenerationModeStore((s) => s.completedPageIds);
  const pageAccessors = useAiGenerationModeStore((s) => s.pageAccessors);

  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [expandedRegenIndex, setExpandedRegenIndex] = useState<number | null>(null);
  const [customPrompts, setCustomPrompts] = useState<Map<number, string>>(() => new Map());
  const [isGeneratingOne, setIsGeneratingOne] = useState(false);
  const [isSwappingCards, setIsSwappingCards] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState<EmotionImageStyle>("photo-boy");
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(() => new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // 마운트 시 퍼널 이벤트 + 언마운트 시 진행 중인 이미지 생성 중단
  useEffect(() => {
    mp.track("[AI템플릿] 감정추론 텍스트 확인 진입", {
      page_count: storyPageIds.length,
    });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 편집 상태 로컬 관리 — 스토어와 동기화
  const [localStories, setLocalStories] = useState(stories);
  const syncTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalStories(stories);
  }, [stories]);

  // 선택 카드 변경 시 캔버스 페이지 전환
  useEffect(() => {
    if (!pageAccessors || storyPageIds.length === 0) return;
    const targetPageId = storyPageIds[selectedCardIndex];
    if (targetPageId) {
      pageAccessors.setSelectedPageId(targetPageId);
    }
  }, [selectedCardIndex, storyPageIds, pageAccessors]);

  if (!isActive) return null;

  const handleTitleChange = (index: number, value: string) => {
    const next = localStories.map((s, i) =>
      i === index ? { ...s, title: value } : s,
    );
    setLocalStories(next);

    // 디바운스로 스토어 + 페이지 동기화
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      useAiGenerationModeStore.getState().setStories(next);
      syncTextToPage(index, next[index].title, next[index].sentence);
    }, 300);
  };

  const handleSentenceChange = (index: number, value: string) => {
    const next = localStories.map((s, i) =>
      i === index ? { ...s, sentence: value } : s,
    );
    setLocalStories(next);

    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
      useAiGenerationModeStore.getState().setStories(next);
      syncTextToPage(index, next[index].title, next[index].sentence);
    }, 300);
  };

  // 페이지의 텍스트 요소를 패치하여 제목/문장 반영
  // locked 요소와 "(감정)" 라벨은 건너뛴다
  const syncTextToPage = (index: number, title: string, sentence: string) => {
    if (!pageAccessors) return;
    const pageId = storyPageIds[index];
    if (!pageId) return;

    pageAccessors.setPages((prev: Page[]) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        // 감정 카드(subType=emotionInference)의 labelId로 연결된 텍스트 ID를 수집
        const emotionLabelIds = new Set<string>();
        for (const el of page.elements) {
          if (
            "subType" in el &&
            el.subType === "emotionInference" &&
            "labelId" in el &&
            typeof el.labelId === "string"
          ) {
            emotionLabelIds.add(el.labelId);
          }
        }

        let titlePatched = false;
        let sentencePatched = false;
        const nextElements = page.elements.map((el) => {
          if (el.type !== "text") return el;
          if ("locked" in el && el.locked) return el;
          // 감정 카드에 연결된 라벨 텍스트는 건너뛴다
          if (emotionLabelIds.has(el.id)) return el;

          if (!titlePatched) {
            titlePatched = true;
            return { ...el, text: title };
          }
          if (!sentencePatched) {
            sentencePatched = true;
            return { ...el, text: sentence };
          }
          return el;
        });
        return { ...page, elements: nextElements };
      }),
    );
  };

  // 이미지 생성 시작 — 제외된 페이지를 건너뛴다
  const handleStartGeneration = async () => {
    if (!pageAccessors) return;
    const currentImageStyle = useAiGenerationModeStore.getState().imageStyle;

    // 제외된 인덱스를 필터링
    const activeIndices = localStories
      .map((_, i) => i)
      .filter((i) => !excludedIndices.has(i));
    const targetStories = activeIndices.map((i) => localStories[i]);
    const targetPageIds = activeIndices.map((i) => storyPageIds[i]);

    if (targetStories.length === 0) {
      useToastStore.getState().showToast("생성할 페이지가 없어요.");
      return;
    }

    const creditCheck = await checkAiCredits(targetStories.length);
    if (creditCheck.remaining === 0) {
      useCreditModalStore.getState().open("이번 달 이미지 크레딧을 모두 사용했어요.");
      return;
    }

    if (creditCheck.remaining < targetStories.length) {
      useCreditModalStore.getState().open(
        `이미지 생성에 ${targetStories.length}크레딧이 필요하지만 ${creditCheck.remaining}크레딧만 남아있어요.`,
      );
      return;
    }

    const actualStories = targetStories;
    const actualPageIds = targetPageIds;

    // 이전 생성 중단 후 새 컨트롤러 생성
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    mp.track("[AI템플릿] 감정추론 이미지 생성 시작", {
      image_style: currentImageStyle,
      page_count: actualStories.length,
    });
    useAiGenerationModeStore.getState().setStep("image-generating");
    useEmotionSceneStore.getState().setBannerPhase(storyPageIds, "generating");

    try {
      const heroImageUrls = await generateEmotionSceneImages(
        actualStories,
        currentImageStyle,
        (current, total) => {
          setGeneratingProgress({ current, total });
          if (current > 0 && actualPageIds[current - 1]) {
            useAiGenerationModeStore.getState().markPageCompleted(actualPageIds[current - 1]);
          }
        },
        undefined,
        controller.signal,
      );

      const urlMap = new Map<string, string>();
      actualPageIds.forEach((pageId, index) => {
        if (heroImageUrls[index]) {
          urlMap.set(pageId, heroImageUrls[index]);
        }
      });

      // 페이지에 적용하기 전에 브라우저 캐시에 사전 로드 — 페이지 전환 시 즉시 표시
      await Promise.all(
        heroImageUrls.map(
          (url) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = url;
            }),
        ),
      );

      useEmotionSceneStore.getState().requestHeroImagePatch(urlMap);
      useEmotionSceneStore.getState().setBannerPhase(storyPageIds, "completed");
      useAiGenerationModeStore.getState().setStep("completed");

      actualPageIds.forEach((id) => {
        useAiGenerationModeStore.getState().markPageCompleted(id);
      });

      void recordAiCreditUsage("emotion", actualStories.length);
      mp.track("[AI템플릿] 감정추론 이미지 생성 완료", {
        image_style: currentImageStyle,
        page_count: actualStories.length,
      });
    } catch (error) {
      // AbortError는 정상적인 취소 — 에러 표시 안 함
      if (error instanceof DOMException && error.name === "AbortError") return;
      captureSentryError(error, "AI 장면 이미지 생성 (포커스 모드)");
      useToastStore.getState().showToast("이미지 생성에 실패했어요. 다시 시도해 주세요.");
      useAiGenerationModeStore.getState().setStep("text-review");
      useEmotionSceneStore.getState().setBannerPhase(storyPageIds, "ready");
    } finally {
      setGeneratingProgress(null);
      useEmotionSceneStore.getState().setGeneratingProgress(null);
    }
  };

  // 개별 이미지 재생성
  const handleRegenerateOne = async (index: number) => {
    if (!pageAccessors || isGeneratingOne) return;
    setIsGeneratingOne(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const creditCheck = await checkAiCredits(1);
      if (creditCheck.remaining === 0) {
        useCreditModalStore.getState().open("이번 달 이미지 크레딧을 모두 사용했어요.");
        return;
      }

      const story = localStories[index];
      const prompts = new Map<number, string>();
      const customPrompt = customPrompts.get(index);
      if (customPrompt) prompts.set(0, customPrompt);

      const heroImageUrls = await generateEmotionSceneImages(
        [story],
        imageStyle,
        undefined,
        prompts,
        controller.signal,
      );

      if (heroImageUrls[0]) {
        // 브라우저 캐시에 사전 로드
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = heroImageUrls[0];
        });

        const pageId = storyPageIds[index];
        const urlMap = new Map<string, string>();
        urlMap.set(pageId, heroImageUrls[0]);
        useEmotionSceneStore.getState().requestHeroImagePatch(urlMap);
        void recordAiCreditUsage("emotion", 1);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      captureSentryError(error, "AI 장면 이미지 재생성 (포커스 모드)");
      useToastStore.getState().showToast("이미지 재생성에 실패했어요.");
    } finally {
      setIsGeneratingOne(false);
    }
  };

  // 감정 카드 스타일 변경
  const handleCardStyleChange = async (nextStyle: EmotionImageStyle) => {
    if (nextStyle === cardStyle || isSwappingCards || !pageAccessors) return;
    useAiGenerationModeStore.getState().setCardStyle(nextStyle);
    setIsSwappingCards(true);

    try {
      const emotionImageMap = await fetchEmotionImageMap(nextStyle);

      pageAccessors.setPages((prev: Page[]) =>
        prev.map((page) => {
          if (!storyPageIds.includes(page.id)) return page;
          const storyIndex = storyPageIds.indexOf(page.id);
          const story = localStories[storyIndex];
          if (!story) return page;

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

          const nextElements = page.elements.map((el) => {
            const url = cardIdToUrl.get(el.id);
            if (!url) return el;
            const shape = el as ShapeElement;
            const imgSize = getEmotionImageSize(nextStyle);
            let imageBox = calculateCoverImageBox(
              shape.w,
              shape.h,
              imgSize.width,
              imgSize.height,
            );
            if (nextStyle === "emoji") {
              imageBox = shrinkImageBox(imageBox, shape.w, shape.h);
            }
            return { ...el, fill: `url(${url})`, imageBox };
          });

          return { ...page, elements: nextElements };
        }),
      );

      mp.track("[AI템플릿] 감정추론 카드 성별 변경", { style: nextStyle });
    } catch (error) {
      captureSentryError(error, "감정 카드 이미지 로드 (포커스 모드)");
      useToastStore.getState().showToast("감정 카드 이미지를 불러오지 못했어요.");
    } finally {
      setIsSwappingCards(false);
    }
  };

  // 확정하기
  const handleConfirm = () => {
    if (!pageAccessors) return;

    const logId = sessionStorage.getItem("aiGenerationLogId");
    if (logId) {
      const pages = pageAccessors.getPages();
      const finalTexts: { title: string; sentence: string }[] = [];
      const finalImageUrls: string[] = [];

      for (const pageId of storyPageIds) {
        const page = pages.find((p) => p.id === pageId);
        if (!page) continue;

        let title = "";
        let sentence = "";
        let heroUrl = "";

        for (const el of page.elements) {
          if (el.type === "text" && el.text && el.text !== "(감정)") {
            if (!title) title = el.text;
            else if (!sentence) sentence = el.text;
          }
          if (
            (el.type === "roundRect" || el.type === "rect") &&
            !("subType" in el && el.subType) &&
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

    mp.track("[AI템플릿] 감정추론 확정", {
      card_style: cardStyle,
      image_style: imageStyle,
    });

    useEmotionSceneStore.getState().removePendingGeneration(storyPageIds);
    // 포커스 모드 진입 전 줌으로 복원 후 해제
    const prevZoom = useAiGenerationModeStore.getState().previousZoom;
    pageAccessors?.setZoom(prevZoom);
    useAiGenerationModeStore.getState().exitFocusedMode();
    useSideBarStore.getState().setSelectedMenu("template");
  };

  const isTextReview = step === "text-review";
  const isGenerating = step === "image-generating";
  const isCompleted = step === "completed";

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <h2 className="text-title-18-bold text-black-100">
          {isTextReview && "스토리 텍스트 편집"}
          {isGenerating && "이미지 생성 중"}
          {isCompleted && "이미지 생성 완료"}
        </h2>
        <p className="text-13-regular text-black-50 mt-1">
          {isTextReview && excludedIndices.size > 0
            ? `${localStories.length - excludedIndices.size}장 (${excludedIndices.size}장 제외)`
            : `${localStories.length}장`}
        </p>
      </div>

      {/* 카드 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 pb-3">
        <div className="flex flex-col gap-2">
          {localStories.map((story, index) => {
            const isSelected = selectedCardIndex === index;
            const isPageCompleted = completedPageIds.has(storyPageIds[index]);
            const isRegenExpanded = expandedRegenIndex === index && isCompleted;
            const isExcluded = excludedIndices.has(index);

            return (
              <button
                key={storyPageIds[index]}
                type="button"
                onClick={() => { setSelectedCardIndex(index); }}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  isExcluded
                    ? "opacity-40 border-black-20 bg-black-5"
                    : isSelected
                      ? "border-primary bg-primary-50"
                      : "border-black-20 bg-white-100 hover:border-black-30"
                }`}
              >
                {/* 카드 헤더 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`flex shrink-0 items-center justify-center w-5 h-5 rounded-full text-12-semibold ${
                    isExcluded ? "bg-black-30 text-white-100" : "bg-primary text-white-100"
                  }`}>
                    {index + 1}
                  </span>
                  {isTextReview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExcludedIndices((prev) => {
                          const next = new Set(prev);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          return next;
                        });
                      }}
                      className={`ml-auto flex items-center gap-1 text-12-semibold transition ${
                        isExcluded
                          ? "text-primary hover:text-primary-700"
                          : "text-black-40 hover:text-black-60"
                      }`}
                    >
                      {isExcluded ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>복원</span>
                        </>
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {isGenerating && isPageCompleted && (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  )}
                  {isGenerating && !isPageCompleted && generatingProgress && generatingProgress.current === index && (
                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                  )}
                  {isCompleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRegenIndex(isRegenExpanded ? null : index);
                      }}
                      className="ml-auto flex items-center gap-1 text-12-semibold text-primary hover:text-primary-700 transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>재생성</span>
                      {isRegenExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* 텍스트 편집 (제외된 카드는 제목만 표시) */}
                {isExcluded ? (
                  <div className="min-w-0">
                    <p className="text-14-semibold text-black-50 truncate line-through">{story.title}</p>
                  </div>
                ) : isTextReview ? (
                  <div className="flex flex-col gap-1.5" onClick={(e) => { e.stopPropagation(); }}>
                    <input
                      type="text"
                      value={story.title}
                      onChange={(e) => { handleTitleChange(index, e.target.value); }}
                      placeholder="제목"
                      className="w-full rounded-lg border border-black-20 bg-white-100 px-2.5 py-1.5 text-14-semibold text-black-90 placeholder:text-black-40 focus:border-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      value={story.sentence}
                      onChange={(e) => { handleSentenceChange(index, e.target.value); }}
                      placeholder="추론 문장"
                      className="w-full rounded-lg border border-black-20 bg-white-100 px-2.5 py-1.5 text-14-regular text-black-90 placeholder:text-black-40 focus:border-primary focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="text-14-semibold text-black-90 truncate">{story.title}</p>
                    <p className="text-13-regular text-black-60 truncate">{story.sentence}</p>
                  </div>
                )}

                {/* 감정 태그 */}
                <div className="flex items-center gap-1.5 mt-2">
                  {story.emotions.map((emotion) => (
                    <span
                      key={emotion}
                      className="rounded-md bg-primary-100 px-2 py-0.5 text-12-semibold text-primary-700"
                    >
                      {emotion}
                    </span>
                  ))}
                </div>

                {/* 재생성 확장 영역 */}
                {isRegenExpanded && (
                  <div className="mt-3 pt-3 border-t border-black-15" onClick={(e) => { e.stopPropagation(); }}>
                    <textarea
                      value={customPrompts.get(index) ?? ""}
                      onChange={(e) => {
                        setCustomPrompts((prev) => {
                          const next = new Map(prev);
                          next.set(index, e.target.value);
                          return next;
                        });
                      }}
                      placeholder="장면 설명을 수정하면 다른 이미지가 생성돼요"
                      rows={2}
                      className="w-full rounded-lg border border-black-20 bg-white-100 px-2.5 py-1.5 text-13-regular text-black-90 placeholder:text-black-40 focus:border-primary focus:outline-none resize-none"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { void handleRegenerateOne(index); }}
                      isLoading={isGeneratingOne}
                      fullWidth
                    >
                      이미지 재생성 (1크레딧)
                    </Button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 성별 선택 모달 */}
      <BaseModal
        isOpen={isGenderModalOpen}
        onClose={() => { setIsGenderModalOpen(false); }}
        title="캐릭터 성별 선택"
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <p className="text-14-regular text-black-70">
            메인 이미지에 나오는 아이의 성별을 고를 수 있어요.
          </p>
          <div className="flex gap-3">
            {([
              { value: "photo-boy" as EmotionImageStyle, label: "남아" },
              { value: "photo-girl" as EmotionImageStyle, label: "여아" },
            ]).map((opt) => {
              const isSelected = selectedGender === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSelectedGender(opt.value); }}
                  className={`flex-1 rounded-xl py-3 text-14-semibold transition border-2 ${
                    isSelected
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-black-20 bg-white-100 text-black-50 hover:border-primary-200 hover:bg-primary-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              useAiGenerationModeStore.getState().setImageStyle(selectedGender);
              setIsGenderModalOpen(false);
              void handleStartGeneration();
            }}
          >
            생성하기 ({localStories.length - excludedIndices.size}크레딧)
          </Button>
        </div>
      </BaseModal>

      {/* 하단 고정 액션 영역 */}
      <div className="shrink-0 border-t border-black-20 px-4 py-3">
        {/* 텍스트 확인 단계: 이미지 생성하기 버튼 */}
        {isTextReview && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => { setIsGenderModalOpen(true); }}
          >
            이미지 생성하기
          </Button>
        )}

        {/* 이미지 생성 중: 스피너 + 진행률 */}
        {isGenerating && (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-14-semibold text-primary">
              이미지 생성 중 {generatingProgress ? `${generatingProgress.current}/${generatingProgress.total}` : ""}
            </span>
            {generatingProgress && (
              <div className="w-full h-2 rounded-full bg-black-10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(generatingProgress.current / generatingProgress.total) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 완료: 감정 카드 스타일 + 확정 버튼 */}
        {isCompleted && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-13-bold text-black-70 shrink-0">감정 카드</span>
              <div className="flex gap-1.5">
                {CARD_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { void handleCardStyleChange(opt.value); }}
                    disabled={isSwappingCards}
                    className={`rounded-lg px-3 py-1.5 text-13-bold transition disabled:opacity-50 ${
                      cardStyle === opt.value
                        ? "bg-primary text-white-100"
                        : "bg-black-10 text-black-60 hover:bg-black-20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleConfirm}
            >
              확정하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiStoryEditContent;
