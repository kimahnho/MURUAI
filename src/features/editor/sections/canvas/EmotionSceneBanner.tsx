/**
 * 감정추론 AI 이미지 생성 플로팅 배너.
 * 텍스트 생성 후 캔버스 상단에 표시되어 이미지 생성/재생성/확정 플로우를 안내한다.
 * 다중 생성 세트를 지원하며, 현재 선택된 페이지에 해당하는 세트만 표시한다.
 */
import { useState } from "react";
import { Check, ImageIcon, Loader2, RefreshCw, X } from "lucide-react";

import type { Page } from "@/features/editor/model/pageTypes";
import type { EmotionImageStyle } from "@/features/editor/sections/sidebar/content/EmotionInferenceChoiceModal";
import { generateEmotionSceneImages } from "@/features/editor/ai/generateEmotionSceneImages";
import {
  useEmotionSceneStore,
  type BannerPhase,
  type PendingGeneration,
} from "@/features/editor/store/emotionSceneStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import EmotionSceneImageModal from "./EmotionSceneImageModal";

interface EmotionSceneBannerProps {
  pages: Page[];
  selectedPageId: string;
}

const EmotionSceneBanner = ({ pages, selectedPageId }: EmotionSceneBannerProps) => {
  const pendingGenerations = useEmotionSceneStore((s) => s.pendingGenerations);
  const generatingProgress = useEmotionSceneStore(
    (s) => s.generatingProgress,
  );
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [imageStyle, setImageStyle] =
    useState<EmotionImageStyle>("photo-boy");

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

  const handleGenerateImages = async () => {
    const store = useEmotionSceneStore.getState();
    store.setBannerPhase(originalIds, "generating");

    try {
      const heroImageUrls = await generateEmotionSceneImages(
        stories,
        imageStyle,
        (current, total) => {
          useEmotionSceneStore.getState().setGeneratingProgress({
            current,
            total,
          });
        },
      );

      const urlMap = new Map<string, string>();
      storyPageIds.forEach((pageId, index) => {
        if (heroImageUrls[index]) {
          urlMap.set(pageId, heroImageUrls[index]);
        }
      });

      useEmotionSceneStore.getState().requestHeroImagePatch(urlMap);

      const groupFirstUrls = new Map<number, string>();
      const meta = stories.map((story, i) => {
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
    } catch {
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
    useEmotionSceneStore.getState().removePendingGeneration(originalIds);
  };

  return (
    <>
      <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-lg">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <BannerContent
              phase={bannerPhase}
              progress={generatingProgress}
              imageStyle={imageStyle}
              onImageStyleChange={setImageStyle}
              onGenerate={handleGenerateImages}
              onRegenerate={() => setIsRegenModalOpen(true)}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          </div>
          {bannerPhase === "generating" && (
            <span className="text-12-regular text-amber-600">
              이미지 생성 중에는 내용을 수정하지 마세요
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
  onImageStyleChange,
  onGenerate,
  onRegenerate,
  onConfirm,
  onDismiss,
}: {
  phase: BannerPhase;
  progress: { current: number; total: number } | null;
  imageStyle: EmotionImageStyle;
  onImageStyleChange: (style: EmotionImageStyle) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) => {
  if (phase === "generating") {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
        <span className="text-14-semibold text-amber-800">
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
        <Check className="h-4 w-4 text-amber-600" />
        <span className="text-14-semibold text-amber-800">
          이미지가 생성되었어요!
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-13-semibold text-amber-700 transition hover:bg-amber-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          이미지 재생성하기
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-13-semibold text-white-100 transition hover:bg-[#D97706]"
        >
          확정하기
        </button>
      </>
    );
  }

  return (
    <>
      <ImageIcon className="h-4 w-4 text-amber-600" />
      <span className="text-14-semibold text-amber-800 whitespace-nowrap">
        텍스트를 확인 후 이미지를 생성하세요
      </span>
      <div className="flex items-center gap-1.5">
        <label className="flex cursor-pointer items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-13-semibold transition hover:bg-amber-100">
          <input
            type="radio"
            name="imageStyle"
            checked={imageStyle === "photo-boy"}
            onChange={() => onImageStyleChange("photo-boy")}
            className="h-3.5 w-3.5 accent-[#F59E0B]"
          />
          <span className="text-amber-800">남아</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-13-semibold transition hover:bg-amber-100">
          <input
            type="radio"
            name="imageStyle"
            checked={imageStyle === "photo-girl"}
            onChange={() => onImageStyleChange("photo-girl")}
            className="h-3.5 w-3.5 accent-[#F59E0B]"
          />
          <span className="text-amber-800">여아</span>
        </label>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-13-semibold text-white-100 transition hover:bg-[#D97706]"
      >
        이미지 생성하기
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-700"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
};

export default EmotionSceneBanner;
