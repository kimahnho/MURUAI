/**
 * 감정추론 히어로 이미지 재생성 모달.
 * 10장의 스토리 페이지 중 다시 생성할 페이지를 체크박스로 선택한 뒤 재생성을 실행한다.
 */
import { useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";

import type { StoryItem } from "@/features/editor/ai/generateEmotionStory";
import type { EmotionImageStyle } from "@/features/editor/sections/sidebar/content/EmotionInferenceChoiceModal";
import type { Page } from "@/features/editor/model/pageTypes";
import { generateEmotionSceneImages } from "@/features/editor/ai/generateEmotionSceneImages";
import { useEmotionSceneStore } from "@/features/editor/store/emotionSceneStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import {
  checkAiCredits,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";

interface EmotionSceneImageModalProps {
  isOpen: boolean;
  stories: StoryItem[];
  storyPageIds: string[];
  pages: Page[];
  onClose: () => void;
  onComplete: () => void;
}

/** 페이지에서 히어로 roundRect의 fill URL을 추출한다. 없으면 null. */
const extractHeroImageUrl = (page: Page | undefined): string | null => {
  if (!page) return null;
  for (const el of page.elements) {
    if (
      el.type === "roundRect" &&
      !el.subType &&
      typeof el.fill === "string" &&
      el.fill.startsWith("url(")
    ) {
      return el.fill.slice(4, -1);
    }
  }
  return null;
};

const EmotionSceneImageModal = ({
  isOpen,
  stories,
  storyPageIds,
  pages,
  onClose,
  onComplete,
}: EmotionSceneImageModalProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(storyPageIds),
  );
  const [imageStyle, setImageStyle] =
    useState<EmotionImageStyle>("photo-boy");
  const [customPrompts, setCustomPrompts] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isGenerating) return;
    onClose();
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === storyPageIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(storyPageIds));
    }
  };

  const handleRegenerate = async () => {
    if (selectedIds.size === 0) return;

    // 선택된 pageId에 매핑되는 story 추출
    const selectedEntries: Array<{ pageId: string; story: StoryItem }> = [];
    storyPageIds.forEach((pageId, index) => {
      if (selectedIds.has(pageId) && stories[index]) {
        selectedEntries.push({ pageId, story: stories[index] });
      }
    });

    // 이미지 크레딧 체크 — 부분 재생성 지원
    const creditCheck = await checkAiCredits(selectedEntries.length);
    if (creditCheck.remaining === 0) {
      useCreditModalStore
        .getState()
        .open("이번 달 이미지 크레딧을 모두 사용했어요.");
      return;
    }
    // 크레딧이 부족하면 앞 페이지부터 크레딧만큼만 재생성
    let actualEntries = selectedEntries;
    if (creditCheck.remaining < selectedEntries.length) {
      actualEntries = selectedEntries.slice(0, creditCheck.remaining);
      useToastStore
        .getState()
        .showToast(`남은 크레딧이 부족해 ${creditCheck.remaining}장만 재생성돼요.`);
    }

    setIsGenerating(true);
    setProgress(null);

    try {
      const actualStories = actualEntries.map((e) => e.story);

      // pageId 기반 커스텀 프롬프트를 index 기반으로 변환
      const promptMap = new Map<number, string>();
      actualEntries.forEach((entry, i) => {
        const custom = customPrompts.get(entry.pageId);
        if (custom?.trim()) promptMap.set(i, custom.trim());
      });

      const heroImageUrls = await generateEmotionSceneImages(
        actualStories,
        imageStyle,
        (current, total) => {
          setProgress({ current, total });
        },
        promptMap.size > 0 ? promptMap : undefined,
      );

      // pageId → URL 매핑 생성
      const urlMap = new Map<string, string>();
      actualEntries.forEach((entry, i) => {
        if (heroImageUrls[i]) {
          urlMap.set(entry.pageId, heroImageUrls[i]);
        }
      });

      useEmotionSceneStore.getState().requestHeroImagePatch(urlMap);

      // 재생성용 메타데이터 저장
      const groupFirstUrls = new Map<number, string>();
      const meta = actualStories.map((story, i) => {
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

      // 이미지 크레딧 차감 (성공 후, 실제 재생성 수만큼)
      void recordAiCreditUsage("emotion", actualStories.length);

      onComplete();
    } catch {
      useToastStore
        .getState()
        .showToast("이미지 재생성에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const isAllSelected = selectedIds.size === storyPageIds.length;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black-90/30"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl bg-white-100 p-6 shadow-xl max-h-[80vh]">
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-title-18-semibold text-black-100">
              다시 생성할 페이지를 선택하세요
            </h2>
            <p className="mt-1 text-13-regular text-black-50">
              선택한 페이지의 장면 이미지를 다시 생성합니다
            </p>
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

        {/* 이미지 스타일 선택 */}
        <div className="mb-3 flex items-center gap-3">
          <span className="text-14-semibold text-black-80">캐릭터:</span>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="regenImageStyle"
              checked={imageStyle === "photo-boy"}
              onChange={() => setImageStyle("photo-boy")}
              className="h-3.5 w-3.5 accent-[#F59E0B]"
            />
            <span className="text-13-regular text-black-70">남아</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="regenImageStyle"
              checked={imageStyle === "photo-girl"}
              onChange={() => setImageStyle("photo-girl")}
              className="h-3.5 w-3.5 accent-[#F59E0B]"
            />
            <span className="text-13-regular text-black-70">여아</span>
          </label>
        </div>

        {/* 전체 선택 */}
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-14-semibold text-black-80">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleAll}
            className="h-4 w-4 accent-[#F59E0B]"
          />
          전체 선택
        </label>

        {/* 썸네일 그리드 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {storyPageIds.map((pageId, index) => {
              const story = stories[index];
              if (!story) return null;

              const page = pages.find((p) => p.id === pageId);
              const heroUrl = extractHeroImageUrl(page);
              const isChecked = selectedIds.has(pageId);

              return (
                <label
                  key={pageId}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                    isChecked
                      ? "border-[#F59E0B] bg-amber-50/50"
                      : "border-black-15 bg-white hover:bg-black-5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleId(pageId)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#F59E0B]"
                  />
                  <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                    <span className="text-13-semibold text-black-80 truncate">
                      {index + 1}. {story.title}
                    </span>
                    {/* 히어로 썸네일 */}
                    <div className="h-16 w-full overflow-hidden rounded-lg bg-black-5">
                      {heroUrl ? (
                        <img
                          src={heroUrl}
                          alt={story.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-black-30">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    {/* 커스텀 장면 설명 입력 */}
                    {isChecked && (
                      <input
                        type="text"
                        value={customPrompts.get(pageId) ?? ""}
                        onChange={(e) => {
                          setCustomPrompts((prev) => {
                            const next = new Map(prev);
                            if (e.target.value) next.set(pageId, e.target.value);
                            else next.delete(pageId);
                            return next;
                          });
                        }}
                        placeholder="장면 설명을 직접 입력하세요 (선택)"
                        className="w-full rounded-lg border border-black-15 px-2.5 py-1.5 text-12-regular text-black-80 placeholder:text-black-30 focus:border-[#F59E0B] focus:outline-none"
                      />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 크레딧 안내 */}
        {selectedIds.size > 0 && !isGenerating && (
          <p className="mt-3 text-center text-12-regular text-black-40">
            {selectedIds.size}장 선택 · {selectedIds.size}크레딧 사용
          </p>
        )}

        {/* 하단 버튼 */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isGenerating}
            className="flex-1 rounded-xl border border-black-15 py-2.5 text-14-semibold text-black-60 transition hover:bg-black-5 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedIds.size > 0 && !isGenerating) setIsConfirmOpen(true);
            }}
            disabled={selectedIds.size === 0 || isGenerating}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-14-semibold text-white-100 transition ${
              selectedIds.size === 0
                ? "bg-black-20 cursor-not-allowed"
                : isGenerating
                  ? "bg-[#F59E0B]/70 cursor-not-allowed"
                  : "bg-[#F59E0B] hover:bg-[#D97706]"
            }`}
          >
            {isGenerating && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            <span className="truncate">
              {isGenerating
                ? progress
                  ? `이미지 생성 중 (${progress.current}/${progress.total})`
                  : "이미지 생성 중..."
                : selectedIds.size > 0
                  ? `${selectedIds.size}장 재생성하기`
                  : "페이지를 선택하세요"}
            </span>
          </button>
        </div>
      </div>

      {/* 크레딧 차감 확인 */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          void handleRegenerate();
        }}
        title="이미지를 재생성할까요?"
        description={`${selectedIds.size}장의 이미지를 재생성하면 ${selectedIds.size}크레딧이 차감됩니다.`}
        confirmLabel="재생성하기"
        cancelLabel="취소"
      />
    </div>
  );
};

export default EmotionSceneImageModal;
