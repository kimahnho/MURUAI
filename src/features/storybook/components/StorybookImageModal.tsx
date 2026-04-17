/**
 * 스토리북 페이지별 재생성 모달.
 * - 선택된 페이지의 기존 이미지/장면 설명을 보여주고, 사용자가 장면을 수정한 뒤 "다시 그리기"
 * - 크레딧 1장 차감 후 `regenerateStoryImage` 호출
 * - 성공 시 `storybookSceneStore.requestImagePatch` 로 에디터에 반영
 */
import { useMemo, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";

import type { Page } from "@/features/editor/model/pageTypes";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import {
  checkAiCredits,
  recordAiCreditUsage,
} from "@/features/editor/utils/aiTemplateUsage";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";
import { useToastStore } from "@/features/editor/store/toastStore";

import { useStorybookSceneStore } from "../store/storybookSceneStore";
import { regenerateStoryImage } from "../ai/regenerateStoryImage";

interface StorybookImageModalProps {
  pageId: string;
  setKey: string;
  pages: Page[];
  onClose: () => void;
}

const StorybookImageModal = ({ pageId, setKey, pages, onClose }: StorybookImageModalProps) => {
  const pending = useStorybookSceneStore(
    (s) => s.pendingGenerations.find((pg) => pg.storyPageIds[0] === setKey),
  );
  const allMeta = useStorybookSceneStore((s) => s.pageMetaBySet[setKey]);

  const pageMeta = useMemo(
    () => allMeta?.find((m) => m.pageId === pageId) ?? null,
    [allMeta, pageId],
  );

  const pageIndex = pending?.storyPageIds.indexOf(pageId) ?? -1;
  const page = pages.find((p) => p.id === pageId) ?? null;

  const [sceneInput, setSceneInput] = useState(pageMeta?.sceneDescription ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (!pending || !pageMeta || !page) return;
    const sceneText = sceneInput.trim();
    if (!sceneText) {
      setErrorMessage("장면 설명이 비어 있어요.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const credit = await checkAiCredits(1);
      if (!credit.canProceed) {
        useCreditModalStore
          .getState()
          .open("크레딧이 부족해 다시 그리기를 진행할 수 없어요.");
        setIsGenerating(false);
        return;
      }

      const characterRef = pending.characterImageBase64;
      if (!characterRef) {
        throw new Error("주인공 레퍼런스가 메모리에 없어 다시 그리기 불가");
      }

      const scenChanged = sceneText !== (pageMeta.sceneDescription ?? "");
      const newUrl = await regenerateStoryImage({
        sceneDescription: sceneText,
        text: pageMeta.text,
        sceneGroup: pageMeta.sceneGroup,
        groupAnchorBase64: pageMeta.groupAnchorBase64,
        characterRefBase64: characterRef,
        artStyleId: pending.artStyleId,
        customPromptTemplate: pending.customPromptTemplate,
        layout: pending.layout,
        subCharacters: pending.subCharacters,
        translateKorean: scenChanged, // 수정된 장면만 재번역
      });

      // 크레딧 차감 + 이미지 패치 요청
      void recordAiCreditUsage("storybook", 1);
      useStorybookSceneStore.getState().requestImagePatch({ [pageId]: newUrl });
      useStorybookSceneStore.getState().updatePageMeta(setKey, pageId, {
        sceneDescription: sceneText,
        generatedImageUrl: newUrl,
      });
      useToastStore.getState().showToast("페이지를 다시 그렸어요.", "success");
      onClose();
    } catch (error) {
      captureSentryError(error, "스토리북 페이지 재생성");
      setErrorMessage("재생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!pending || pageIndex < 0) return null;

  const currentImageUrl = pageMeta?.generatedImageUrl;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex flex-col rounded-2xl bg-white-100 shadow-2xl w-full"
        style={{ maxWidth: 640, maxHeight: "90vh" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-black-40 hover:bg-black-5"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 flex-1 min-h-0 overflow-y-auto">
          <h2 className="text-title-18-semibold text-black-90 mb-1">
            {pageIndex + 1}페이지 다시 그리기
          </h2>
          <p className="text-13-regular text-black-60 mb-5">
            장면 설명을 수정한 뒤 다시 그리기를 누르면 이 페이지만 새로 그려요. (1 크레딧)
          </p>

          {/* 기존 이미지 프리뷰 */}
          {currentImageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border border-black-15">
              <img
                src={currentImageUrl}
                alt={`${pageIndex + 1}페이지`}
                className="w-full object-cover"
                style={{ maxHeight: 280 }}
              />
            </div>
          )}

          {/* 장면 설명 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-13-semibold text-black-80">장면 설명</span>
            <textarea
              value={sceneInput}
              onChange={(e) => { setSceneInput(e.target.value); }}
              rows={5}
              disabled={isGenerating}
              className="w-full resize-none rounded-lg border border-black-25 px-3 py-2 text-13-regular focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </label>

          {errorMessage && (
            <p className="mt-3 text-12-regular text-error-700">{errorMessage}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-lg px-4 py-2 text-13-semibold text-black-60 hover:bg-black-5 disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => { void handleRegenerate(); }}
            disabled={isGenerating || !sceneInput.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-13-semibold text-white-100 hover:bg-primary-700 disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                다시 그리기 · 1크레딧
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorybookImageModal;
