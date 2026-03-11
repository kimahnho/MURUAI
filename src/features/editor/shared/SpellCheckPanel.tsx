/**
 * 맞춤법 검사 결과를 오른쪽 사이드 패널로 표시하는 컴포넌트.
 * 로딩 중에는 스피너를, 결과가 있으면 체크박스 기반 교정 목록을 보여준다.
 */
import { useState } from "react";
import { X, Check, Loader2, RefreshCw, ArrowRight, Space, Type, BookOpen } from "lucide-react";
import { useSpellCheckStore, buildCorrectionKey } from "../store/spellCheckStore";
import type { SpellCheckResult, SpellCorrection } from "../ai/checkSpelling";
import { mp } from "@/shared/utils/mixpanel";

// 오류 유형별 좌측 색상 바
const getAccentColor = (reason: string): string => {
  if (reason.includes("띄어쓰기")) return "bg-orange-400";
  if (reason.includes("문법")) return "bg-purple-400";
  return "bg-red-400";
};

const SpellCheckPanel = () => {
  const results = useSpellCheckStore((s) => s.results);
  const isChecking = useSpellCheckStore((s) => s.isChecking);
  const isPanelOpen = useSpellCheckStore((s) => s.isPanelOpen);
  const closePanel = useSpellCheckStore((s) => s.closePanel);
  const actionMap = useSpellCheckStore((s) => s.actionMap);
  const applyAction = useSpellCheckStore((s) => s.applyAction);
  const applier = useSpellCheckStore((s) => s.applier);
  const requestRecheck = useSpellCheckStore((s) => s.requestRecheck);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // 결과 리셋 시 초기화 플래그도 리셋
  if (!results && isInitialized) {
    setIsInitialized(false);
    setCheckedKeys(new Set());
  }

  if (!isPanelOpen) return null;

  // 로딩 상태
  if (isChecking || !results) {
    return (
      <div className="absolute right-0 top-0 bottom-0 z-30 flex w-80 flex-col bg-white-100 shadow-lg">
        <PanelHeader subtitle="검사 중..." onClose={closePanel} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-13-regular text-black-50">맞춤법을 검사하고 있어요</span>
        </div>
      </div>
    );
  }

  // 결과 도착 시 체크 초기화
  if (!isInitialized && results.length > 0) {
    const allPendingKeys = new Set<string>();
    for (const r of results) {
      r.corrections.forEach((_, idx) => {
        const key = buildCorrectionKey(r.elementId, r.field, idx);
        if (!actionMap.has(key)) allPendingKeys.add(key);
      });
    }
    setCheckedKeys(allPendingKeys);
    setIsInitialized(true);
  }

  // 페이지별 그룹화
  const grouped = new Map<string, { pageNumber: number; items: SpellCheckResult[] }>();
  for (const r of results) {
    const existing = grouped.get(r.pageId);
    if (existing) {
      existing.items.push(r);
    } else {
      grouped.set(r.pageId, { pageNumber: r.pageNumber, items: [r] });
    }
  }

  // 카운트 계산
  const allKeys: string[] = [];
  for (const r of results) {
    r.corrections.forEach((_, idx) => {
      allKeys.push(buildCorrectionKey(r.elementId, r.field, idx));
    });
  }
  const totalCount = allKeys.length;
  const doneCount = allKeys.filter((k) => actionMap.has(k)).length;
  const pendingCount = totalCount - doneCount;
  const pendingKeys = allKeys.filter((k) => !actionMap.has(k));
  const checkedPendingKeys = pendingKeys.filter((k) => checkedKeys.has(k));
  const isAllChecked = pendingKeys.length > 0 && checkedPendingKeys.length === pendingKeys.length;

  const toggleCheck = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApplySelected = () => {
    if (checkedPendingKeys.length === 0) return;
    const keySet = new Set(checkedPendingKeys);
    const toApply: SpellCheckResult[] = [];
    for (const r of results) {
      const selected: SpellCorrection[] = [];
      r.corrections.forEach((c, idx) => {
        if (keySet.has(buildCorrectionKey(r.elementId, r.field, idx))) selected.push(c);
      });
      if (selected.length > 0) toApply.push({ ...r, corrections: selected });
    }
    if (toApply.length > 0 && applier) {
      applier(toApply);
      applyAction(checkedPendingKeys, "applied");
      setCheckedKeys((prev) => {
        const next = new Set(prev);
        for (const k of checkedPendingKeys) next.delete(k);
        return next;
      });
      mp.track("맞춤법 검사", { correction_count: toApply.reduce((s, r) => s + r.corrections.length, 0) });
    }
  };

  const handleIgnoreGroup = (items: SpellCheckResult[]) => {
    const keys: string[] = [];
    for (const r of items) {
      r.corrections.forEach((_, idx) => {
        const key = buildCorrectionKey(r.elementId, r.field, idx);
        if (!actionMap.has(key)) keys.push(key);
      });
    }
    if (keys.length > 0) {
      applyAction(keys, "ignored");
      setCheckedKeys((prev) => {
        const next = new Set(prev);
        for (const k of keys) next.delete(k);
        return next;
      });
    }
  };

  const isGroupDone = (items: SpellCheckResult[]) =>
    items.every((r) => r.corrections.every((_, idx) => actionMap.has(buildCorrectionKey(r.elementId, r.field, idx))));

  const getGroupPendingCount = (items: SpellCheckResult[]) => {
    let count = 0;
    for (const r of items) {
      r.corrections.forEach((_, idx) => {
        if (!actionMap.has(buildCorrectionKey(r.elementId, r.field, idx))) count++;
      });
    }
    return count;
  };

  // 오류 없음
  if (totalCount === 0) {
    return (
      <div className="absolute right-0 top-0 bottom-0 z-30 flex w-80 flex-col bg-white-100 shadow-lg">
        <PanelHeader subtitle="검사 완료" onClose={closePanel} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <span className="text-14-semibold text-black-80">맞춤법 오류가 없습니다</span>
          <button
            type="button"
            onClick={requestRecheck}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-13-regular text-black-50 transition hover:bg-black-5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            다시 검사하기
          </button>
        </div>
      </div>
    );
  }

  const subtitle = pendingCount > 0 ? `${pendingCount}건 남음` : "모두 완료";
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 flex w-80 flex-col bg-white-100 shadow-lg">
      {/* 헤더 */}
      <PanelHeader subtitle={subtitle} onClose={closePanel} />

      {/* 프로그레스 바 + 전체 선택 */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black-10">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-11-regular text-black-50 tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </div>
        {pendingCount > 0 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={isAllChecked ? () => setCheckedKeys(new Set()) : () => setCheckedKeys(new Set(pendingKeys))}
              className="text-12-regular text-primary hover:text-primary/80"
            >
              {isAllChecked ? "전체 해제" : "전체 선택"}
            </button>
          </div>
        )}
      </div>

      {/* 본문 스크롤 */}
      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className="flex flex-col gap-5">
          {Array.from(grouped.entries()).map(([pageId, { pageNumber, items }]) => {
            if (isGroupDone(items)) return null;
            const groupPending = getGroupPendingCount(items);

            return (
              <div key={pageId} className="flex flex-col gap-2">
                {/* 페이지 구분 */}
                <div className="flex items-center justify-between">
                  <span className="text-12-semibold text-black-60">
                    페이지 {pageNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleIgnoreGroup(items)}
                    className="text-11-regular text-black-40 hover:text-black-60"
                  >
                    {groupPending}건 무시
                  </button>
                </div>

                {/* 교정 카드 */}
                {items.map((result) =>
                  result.corrections.map((correction, idx) => {
                    const key = buildCorrectionKey(result.elementId, result.field, idx);
                    if (actionMap.has(key)) return null;
                    return (
                      <CorrectionCard
                        key={key}
                        correction={correction}
                        isChecked={checkedKeys.has(key)}
                        onToggleCheck={() => toggleCheck(key)}
                      />
                    );
                  }),
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 */}
      <div className="border-t border-black-10 px-4 py-3">
        {pendingCount > 0 ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={checkedPendingKeys.length === 0}
              className="w-full rounded-xl bg-primary py-2.5 text-14-semibold text-white-100 transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkedPendingKeys.length === pendingCount
                ? `모두 수정 (${pendingCount}건)`
                : `선택 수정 (${checkedPendingKeys.length}건)`}
            </button>
            <button
              type="button"
              onClick={requestRecheck}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-13-regular text-black-50 transition hover:bg-black-5 active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              다시 검사하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 py-1">
            <span className="text-13-semibold text-green-600">모든 검사를 완료했어요</span>
            <button
              type="button"
              onClick={requestRecheck}
              className="w-full rounded-xl bg-primary py-2.5 text-14-semibold text-white-100 transition hover:bg-primary/90 active:scale-[0.98]"
            >
              새로 검사하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 공통 패널 헤더
const PanelHeader = ({ subtitle, onClose }: { subtitle: string; onClose: () => void }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <div className="flex items-baseline gap-2">
      <span className="text-15-semibold text-black-90">맞춤법 검사</span>
      <span className="text-12-regular text-black-40">{subtitle}</span>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="flex h-7 w-7 items-center justify-center rounded-md text-black-40 transition hover:bg-black-5 hover:text-black-70"
      aria-label="닫기"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

// 오류 유형 아이콘
const ErrorTypeIcon = ({ reason }: { reason: string }) => {
  if (reason.includes("띄어쓰기")) return <Space className="h-3 w-3 text-orange-500" />;
  if (reason.includes("문법")) return <BookOpen className="h-3 w-3 text-purple-500" />;
  return <Type className="h-3 w-3 text-red-500" />;
};

// 교정 카드: 컴팩트한 한 줄 디자인
const CorrectionCard = ({ correction, isChecked, onToggleCheck }: {
  correction: SpellCorrection;
  isChecked: boolean;
  onToggleCheck: () => void;
}) => {
  const accent = getAccentColor(correction.reason);

  return (
    <div className="flex overflow-hidden rounded-lg bg-black-5/60">
      {/* 좌측 색상 바 */}
      <div className={`w-0.5 shrink-0 ${accent}`} />

      {/* 내용 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 py-2">
        {/* 원문 → 수정안 */}
        <div className="flex items-center gap-1.5">
          <ErrorTypeIcon reason={correction.reason} />
          <span className="truncate text-16-regular text-red-500 line-through">{correction.original}</span>
          <ArrowRight className="h-2.5 w-2.5 shrink-0 text-black-25" />
          <span className="truncate text-16-semibold text-green-600">{correction.corrected}</span>
        </div>
        {/* 이유 */}
        <span className="text-14-regular text-black-40 pl-4.5">{correction.reason}</span>
      </div>

      {/* 체크박스 */}
      <button
        type="button"
        onClick={onToggleCheck}
        className="flex shrink-0 items-center px-2.5"
      >
        <div className={`flex h-4 w-4 items-center justify-center rounded border transition ${
          isChecked
            ? "border-primary bg-primary"
            : "border-black-25 hover:border-black-40"
        }`}>
          {isChecked && <Check className="h-2.5 w-2.5 text-white-100" />}
        </div>
      </button>
    </div>
  );
};

export default SpellCheckPanel;
