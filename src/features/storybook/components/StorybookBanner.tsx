/**
 * 스토리북 생성 상황판 — 에디터 상단 플로팅 배너.
 *
 * 배너 상태:
 *  - generating : 주인공 썸네일 + 진행률(3/10)
 *  - completed  : 페이지 타일 grid, 실패 페이지는 ❌ (재시도 클릭 가능)
 *  - failed     : 전부 실패. "전체 다시 시작" 버튼
 *
 * 생성 중 세트가 있으면 우선 표시(선택 페이지 무관),
 * 완료/부분실패 세트는 선택 페이지가 속한 것만 표시.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader2, RefreshCw, X } from "lucide-react";

import type { Page } from "@/features/editor/model/pageTypes";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import {
  useStorybookSceneStore,
  type StorybookBannerPhase,
} from "../store/storybookSceneStore";
import StorybookImageModal from "./StorybookImageModal";

const isValidStoryPage = (page: Page) => page.elements.length > 1;

interface StorybookBannerProps {
  pages: Page[];
  selectedPageId: string;
  setPages?: (update: (prev: Page[]) => Page[]) => void;
}

const StorybookBanner = ({ pages, selectedPageId, setPages }: StorybookBannerProps) => {
  const pendingGenerations = useStorybookSceneStore((s) => s.pendingGenerations);
  const generatingProgress = useStorybookSceneStore((s) => s.generatingProgress);
  const pageMetaBySet = useStorybookSceneStore((s) => s.pageMetaBySet);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [regenPageId, setRegenPageId] = useState<string | null>(null);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);

  // 고아 세트 정리 — completed/failed 상태에서 모든 페이지가 사라졌으면 제거
  useEffect(() => {
    const pageMap = new Map(pages.map((p) => [p.id, p]));
    for (const pg of pendingGenerations) {
      if (pg.bannerPhase === "generating") continue;
      const hasValidPage = pg.storyPageIds.some((id) => {
        const page = pageMap.get(id);
        return page && isValidStoryPage(page);
      });
      if (!hasValidPage) {
        useStorybookSceneStore.getState().removePendingGeneration(pg.setKey);
      }
    }
  }, [pages, pendingGenerations]);

  const { matchedGeneration, validStoryPageIds } = useMemo(() => {
    const generating = pendingGenerations.find((pg) => pg.bannerPhase === "generating");
    if (generating) {
      const pageMap = new Map(pages.map((p) => [p.id, p]));
      const validIds = generating.storyPageIds.filter((id) => {
        const page = pageMap.get(id);
        return page && isValidStoryPage(page);
      });
      return { matchedGeneration: generating, validStoryPageIds: validIds };
    }
    const pageMap = new Map(pages.map((p) => [p.id, p]));
    for (const pg of pendingGenerations) {
      const validIds = pg.storyPageIds.filter((id) => {
        const page = pageMap.get(id);
        return page && isValidStoryPage(page);
      });
      if (validIds.length === 0) continue;
      if (validIds.includes(selectedPageId)) {
        return { matchedGeneration: pg, validStoryPageIds: validIds };
      }
    }
    return { matchedGeneration: null, validStoryPageIds: [] as string[] };
  }, [pages, pendingGenerations, selectedPageId]);

  if (!matchedGeneration) return null;

  const phase = matchedGeneration.bannerPhase;
  const setKey = matchedGeneration.setKey;
  const canCollapse = phase !== "generating";
  const pageMeta = pageMetaBySet[setKey] ?? [];

  // 실패 페이지 판별 — completed 페이즈에서 pageMeta.generatedImageUrl 비어있으면 실패
  const failedPageIds = new Set(
    pageMeta.filter((m) => !m.generatedImageUrl).map((m) => m.pageId),
  );
  const failedCount = failedPageIds.size;
  const successCount = matchedGeneration.storyPageIds.length - failedCount;

  const handleRestart = () => {
    if (!setPages) return;
    // 기존 페이지 삭제
    setPages((prev) => prev.filter((p) => !matchedGeneration.storyPageIds.includes(p.id)));
    useStorybookSceneStore.getState().removePendingGeneration(setKey);
    setIsRestartConfirmOpen(false);
  };

  return (
    <>
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30 rounded-xl bg-white-100 border border-black-15 shadow-lg"
        style={{ minWidth: 360, maxWidth: "92%" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <CharacterThumb src={matchedGeneration.characterImageUrl} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-13-semibold text-black-90 truncate">
              {matchedGeneration.bookTitle || "스토리북"}
            </span>
            <BannerStatusLine
              phase={phase}
              progress={generatingProgress}
              totalPages={matchedGeneration.storyPageIds.length}
              failedCount={failedCount}
              successCount={successCount}
            />
          </div>
          {canCollapse && (
            <button
              type="button"
              onClick={() => { setIsCollapsed((v) => !v); }}
              className="shrink-0 p-1 rounded hover:bg-black-5 text-black-50"
              title={isCollapsed ? "펼치기" : "접기"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* 페이지 타일 + 액션 영역 */}
        {!isCollapsed && phase !== "generating" && matchedGeneration.storyPageIds.length > 0 && (
          <div className="px-4 pb-3 pt-1 border-t border-black-10">
            {phase === "completed" && matchedGeneration.storyPageIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {matchedGeneration.storyPageIds.map((pageId, idx) => (
                  <PageTile
                    key={pageId}
                    index={idx}
                    pageId={pageId}
                    isCurrent={pageId === selectedPageId}
                    isValid={validStoryPageIds.includes(pageId)}
                    isFailed={failedPageIds.has(pageId)}
                    onClick={() => { setRegenPageId(pageId); }}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-2 gap-2">
              <p className="text-11-regular text-black-50 flex-1 min-w-0">
                {phase === "failed"
                  ? "모든 이미지 생성에 실패했어요."
                  : failedCount > 0
                    ? `❌ 실패한 ${failedCount}장을 클릭해 다시 그려주세요 (1 크레딧/장)`
                    : "페이지 타일을 클릭해 다시 그릴 수 있어요 (1 크레딧/장)"}
              </p>
              <button
                type="button"
                onClick={() => { setIsRestartConfirmOpen(true); }}
                className="shrink-0 flex items-center gap-1 text-12-semibold text-primary hover:text-primary-700 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                전체 다시 시작
              </button>
            </div>
          </div>
        )}
      </div>

      {regenPageId && (
        <StorybookImageModal
          pageId={regenPageId}
          setKey={setKey}
          pages={pages}
          onClose={() => { setRegenPageId(null); }}
        />
      )}

      <ConfirmDialog
        isOpen={isRestartConfirmOpen}
        title={`기존 ${matchedGeneration.storyPageIds.length}장을 지우고 다시 시작할까요?`}
        description="이 세트의 모든 페이지가 삭제됩니다. 되돌릴 수 없어요."
        confirmLabel="지우고 다시 시작"
        cancelLabel="취소"
        onConfirm={handleRestart}
        onClose={() => { setIsRestartConfirmOpen(false); }}
        variant="danger"
      />
    </>
  );
};

// ─── 서브 컴포넌트 ───

const CharacterThumb = ({ src }: { src: string }) => (
  <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 border-primary-200 bg-black-5">
    {src ? (
      <img src={src} alt="주인공" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-black-30">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )}
  </div>
);

const BannerStatusLine = ({
  phase,
  progress,
  totalPages,
  failedCount,
  successCount,
}: {
  phase: StorybookBannerPhase;
  progress: { current: number; total: number } | null;
  totalPages: number;
  failedCount: number;
  successCount: number;
}) => {
  if (phase === "generating") {
    const current = progress?.current ?? 0;
    const total = progress?.total ?? totalPages;
    return (
      <span className="flex items-center gap-1.5 text-12-regular text-primary">
        <Loader2 className="h-3 w-3 animate-spin" />
        생성 중 {current}/{total}
      </span>
    );
  }
  if (phase === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-12-regular text-error-700">
        <AlertTriangle className="h-3 w-3" />
        전부 실패 — 다시 시도해 주세요
      </span>
    );
  }
  if (phase === "completed") {
    if (failedCount > 0) {
      return (
        <span className="flex items-center gap-1.5 text-12-regular text-warning-700">
          <AlertTriangle className="h-3 w-3" />
          {successCount}장 완성 · {failedCount}장 실패
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-12-regular text-success-700">
        <CheckCircle className="h-3 w-3" />
        {totalPages}장 완성
      </span>
    );
  }
  return <span className="text-12-regular text-black-50">준비 중...</span>;
};

const PageTile = ({
  index,
  pageId: _pageId,
  isCurrent,
  isValid,
  isFailed,
  onClick,
}: {
  index: number;
  pageId: string;
  isCurrent: boolean;
  isValid: boolean;
  isFailed: boolean;
  onClick: () => void;
}) => {
  let icon: React.ReactNode;
  let baseClass: string;
  if (!isValid) {
    icon = <X className="h-3 w-3" />;
    baseClass = "bg-black-5 text-black-30";
  } else if (isFailed) {
    icon = <X className="h-3 w-3" />;
    baseClass = "bg-error-50 text-error-700 hover:bg-error-100";
  } else {
    icon = <CheckCircle className="h-3 w-3" />;
    baseClass = "bg-success-50 text-success-700 hover:bg-success-100";
  }

  const currentRing = isCurrent ? "ring-2 ring-primary-300" : "";
  const clickable = isValid;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-11-semibold transition ${baseClass} ${currentRing} ${
        clickable ? "cursor-pointer" : "cursor-default"
      }`}
      title={`${index + 1}페이지${isFailed ? " — 실패, 클릭해 다시 그리기" : " — 클릭해 다시 그리기"}`}
    >
      {icon}
      <span>{index + 1}</span>
    </button>
  );
};

export default StorybookBanner;
