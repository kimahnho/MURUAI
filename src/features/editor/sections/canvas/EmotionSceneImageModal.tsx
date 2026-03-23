/**
 * 감정추론 히어로 이미지 재생성 모달.
 * 좌우 분할 레이아웃: 좌측에 선택 페이지 썸네일 + 프롬프트 + 재생성 버튼,
 * 우측에 전체 페이지 썸네일 리스트를 상하 스크롤하며 1장씩 개별 재생성한다.
 */
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";

import type { StoryItem } from "@/features/editor/ai/generateEmotionStory";
import type { EmotionImageStyle } from "@/features/editor/sections/sidebar/content/EmotionInferenceChoiceModal";
import type { Page } from "@/features/editor/model/pageTypes";
import { generateEmotionSceneImages } from "@/features/editor/ai/generateEmotionSceneImages";
import { useEmotionSceneStore } from "@/features/editor/store/emotionSceneStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import {
  checkAiCredits,
  fetchCreditBalance,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";
import DesignPaper from "./DesignPaper";

interface EmotionSceneImageModalProps {
  isOpen: boolean;
  stories: StoryItem[];
  storyPageIds: string[];
  pages: Page[];
  onClose: () => void;
}

// A4 세로 기준 페이지 실제 크기 (px)
const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;

// 좌측 미리보기 스케일
const PREVIEW_SCALE = 0.42;
// 우측 썸네일 스케일
const THUMB_SCALE = 0.12;

const EmotionSceneImageModal = ({
  isOpen,
  stories,
  storyPageIds,
  pages,
  onClose,
}: EmotionSceneImageModalProps) => {
  const [activePageId, setActivePageId] = useState<string>(
    () => storyPageIds[0] ?? "",
  );
  const [imageStyle, setImageStyle] = useState<EmotionImageStyle>("photo-boy");
  const [customPrompts, setCustomPrompts] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);

  // 모달 열릴 때 크레딧 잔량 조회
  useEffect(() => {
    if (!isOpen) return;
    void fetchCreditBalance().then(setRemainingCredits);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isGenerating) return;
    onClose();
  };

  const activeIndex = storyPageIds.indexOf(activePageId);
  const activeStory = activeIndex >= 0 ? stories[activeIndex] : null;
  const activePage = pages.find((p) => p.id === activePageId);

  const handleRegenerate = async () => {
    if (!activeStory) return;

    const creditCheck = await checkAiCredits(1);
    if (creditCheck.remaining === 0) {
      useCreditModalStore
        .getState()
        .open("이번 달 이미지 크레딧을 모두 사용했어요.");
      return;
    }

    setIsGenerating(true);
    setProgress(null);

    try {
      // 크레딧 즉시 차감 (생성 시작과 동시에)
      void recordAiCreditUsage("emotion", 1);
      setRemainingCredits((prev) =>
        prev !== null ? Math.max(0, prev - 1) : null,
      );

      const promptMap = new Map<number, string>();
      const custom = customPrompts.get(activePageId);
      if (custom?.trim()) promptMap.set(0, custom.trim());

      const heroImageUrls = await generateEmotionSceneImages(
        [activeStory],
        imageStyle,
        (current, total) => {
          setProgress({ current, total });
        },
        promptMap.size > 0 ? promptMap : undefined,
      );

      const urlMap = new Map<string, string>();
      if (heroImageUrls[0]) {
        urlMap.set(activePageId, heroImageUrls[0]);
      }

      useEmotionSceneStore.getState().requestHeroImagePatch(urlMap);

      const meta = [
        {
          pageIndex: 0,
          originalPrompt: `${activeStory.title} ${activeStory.sentence}`,
          sceneGroup: activeStory.sceneGroup,
          isGroupFirst: true,
          groupFirstImageBase64: null,
          generatedImageUrl: heroImageUrls[0] ?? "",
        },
      ];
      useEmotionSceneStore.getState().setGenerationMeta(meta);

      useToastStore.getState().showToast("이미지가 재생성되었어요.");
    } catch {
      useToastStore
        .getState()
        .showToast("이미지 재생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const getPageSize = (page: Page | undefined) => {
    const o = page?.orientation === "horizontal" ? "horizontal" : "vertical";
    return {
      width: o === "horizontal" ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX,
      height: o === "horizontal" ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX,
    };
  };

  const previewSize = getPageSize(activePage);

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black-90/30"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col rounded-2xl bg-white-100 shadow-xl max-h-[85vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-title-18-semibold text-black-100">
              이미지 재생성
            </h2>
            {remainingCredits !== null && (
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-12-semibold ${
                remainingCredits <= 0
                  ? "bg-error-50 text-error"
                  : remainingCredits <= 5
                    ? "bg-warning-50 text-warning"
                    : "bg-black-5 text-black-60"
              }`}>
                <Sparkles className="h-3 w-3" />
                {remainingCredits}크레딧 남음
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-black-60 transition hover:bg-black-10 hover:text-black-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 좌우 분할 본문 */}
        <div className="flex flex-1 gap-4 overflow-hidden px-6 pb-5">
          {/* 좌측: 미리보기 + 하단 컨트롤 */}
          <div className="flex w-[80%] flex-col gap-3">
            {/* 페이지 미리보기 */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-black-10 bg-black-5/30">
              {activePage ? (
                <div
                  className="shadow-md rounded-sm"
                  style={{
                    width: `${previewSize.width * PREVIEW_SCALE}px`,
                    height: `${previewSize.height * PREVIEW_SCALE}px`,
                  }}
                >
                  <div
                    style={{
                      width: `${previewSize.width}px`,
                      height: `${previewSize.height}px`,
                      transform: `scale(${PREVIEW_SCALE})`,
                      transformOrigin: "top left",
                      pointerEvents: "none",
                    }}
                  >
                    <DesignPaper
                      pageId={`regen-preview-${activePage.id}`}
                      orientation={activePage.orientation ?? "vertical"}
                      elements={activePage.elements}
                      background={activePage.background}
                      selectedIds={[]}
                      editingTextId={null}
                      readOnly
                    />
                  </div>
                </div>
              ) : (
                <span className="text-14-regular text-black-30">
                  페이지를 선택하세요
                </span>
              )}

              {/* 생성 중 오버레이 */}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black-90/40 backdrop-blur-sm rounded-xl">
                  <Loader2 className="h-6 w-6 animate-spin text-white-100" />
                  <span className="text-13-bold text-white-100">
                    {progress
                      ? `이미지 생성 중 (${progress.current}/${progress.total})`
                      : "이미지 생성 중..."}
                  </span>
                </div>
              )}
            </div>

            {/* 하단: 프롬프트 + 캐릭터/재생성 */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-13-bold text-black-70">장면 설명</span>
                <textarea
                  value={customPrompts.get(activePageId) ?? ""}
                  onChange={(e) => {
                    setCustomPrompts((prev) => {
                      const next = new Map(prev);
                      if (e.target.value) next.set(activePageId, e.target.value);
                      else next.delete(activePageId);
                      return next;
                    });
                  }}
                  placeholder="예) 친구와 놀이터에서 즐겁게 노는 장면"
                  rows={2}
                  disabled={isGenerating}
                  className="w-full resize-none rounded-xl border border-black-25 bg-primary-50/30 px-3.5 py-2.5 text-14-regular text-black-80 placeholder:text-black-40 focus:border-primary focus:bg-white-100 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-13-semibold text-black-60">캐릭터</span>
                <label
                  className={`flex cursor-pointer items-center rounded-lg border px-2 py-1 text-13-semibold transition ${imageStyle === "photo-boy" ? "border-primary bg-primary-50 text-primary" : "border-black-20 text-black-60 hover:bg-black-5"}`}
                >
                  <input
                    type="radio"
                    name="regenImageStyle"
                    checked={imageStyle === "photo-boy"}
                    onChange={() => setImageStyle("photo-boy")}
                    className="hidden"
                  />
                  남아
                </label>
                <label
                  className={`flex cursor-pointer items-center rounded-lg border px-2 py-1 text-13-semibold transition ${imageStyle === "photo-girl" ? "border-primary bg-primary-50 text-primary" : "border-black-20 text-black-60 hover:bg-black-5"}`}
                >
                  <input
                    type="radio"
                    name="regenImageStyle"
                    checked={imageStyle === "photo-girl"}
                    onChange={() => setImageStyle("photo-girl")}
                    className="hidden"
                  />
                  여아
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isGenerating) void handleRegenerate();
                }}
                disabled={isGenerating || !activeStory}
                className={`flex self-center items-center justify-center gap-1.5 rounded-lg w-60 py-3 text-13-bold text-white-100 transition ${
                  isGenerating || !activeStory
                    ? "bg-black-20 cursor-not-allowed"
                    : "bg-primary hover:bg-primary-700"
                }`}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {isGenerating ? "생성 중..." : "재생성하기 · 1크레딧"}
                </span>
              </button>
            </div>
          </div>

          {/* 우측: 썸네일 리스트 */}
          <div className="flex w-[20%] flex-col gap-1.5 overflow-y-auto rounded-xl border border-black-10 bg-black-5/30 p-2">
            {storyPageIds.map((pageId, index) => {
              const story = stories[index];
              if (!story) return null;

              const page = pages.find((p) => p.id === pageId);
              const isActive = pageId === activePageId;
              const thumbPageSize = getPageSize(page);

              return (
                <button
                  key={pageId}
                  type="button"
                  onClick={() => {
                    if (!isGenerating) setActivePageId(pageId);
                  }}
                  disabled={isGenerating}
                  className={`relative flex items-center gap-1.5 rounded-lg border p-1.5 transition ${
                    isActive
                      ? "border-primary-200 bg-primary-50"
                      : "border-transparent bg-white-100 hover:bg-black-5 disabled:opacity-50"
                  }`}
                >
                  {/* 선택 인디케이터 */}
                  <div
                    className={`shrink-0 w-0.5 self-stretch rounded-full transition ${
                      isActive ? "bg-primary" : "bg-transparent"
                    }`}
                  />

                  {/* 썸네일 + 번호 */}
                  <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <div
                      className="overflow-hidden rounded"
                      style={{
                        width: `${thumbPageSize.width * THUMB_SCALE}px`,
                        height: `${thumbPageSize.height * THUMB_SCALE}px`,
                      }}
                    >
                      {page ? (
                        <div
                          style={{
                            width: `${thumbPageSize.width}px`,
                            height: `${thumbPageSize.height}px`,
                            transform: `scale(${THUMB_SCALE})`,
                            transformOrigin: "top left",
                            pointerEvents: "none",
                          }}
                        >
                          <DesignPaper
                            pageId={`regen-thumb-${page.id}`}
                            orientation={page.orientation ?? "vertical"}
                            elements={page.elements}
                            background={page.background}
                            selectedIds={[]}
                            editingTextId={null}
                            readOnly
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black-10 text-black-25 text-12-regular">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-11-regular ${isActive ? "text-primary" : "text-black-40"}`}
                    >
                      {index + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionSceneImageModal;
