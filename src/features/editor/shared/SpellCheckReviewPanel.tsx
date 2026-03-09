/**
 * 맞춤법 검사 결과를 페이지별로 보여주고, 선택한 교정만 반영할 수 있는 검토 패널.
 * ExportModal 내부에서 조건부 렌더링된다.
 */
import { useState } from "react";
import { Check } from "lucide-react";
import type { SpellCheckResult, SpellCorrection } from "../ai/checkSpelling";

interface SpellCheckReviewPanelProps {
  results: SpellCheckResult[];
  onApply: (selected: SpellCheckResult[]) => void;
  onCancel: () => void;
}

type CheckState = Map<string, Set<number>>;

// correction 고유 키: elementId + field + correction index
const buildKey = (r: SpellCheckResult) => `${r.elementId}::${r.field}`;

const SpellCheckReviewPanel = ({
  results,
  onApply,
  onCancel,
}: SpellCheckReviewPanelProps) => {
  // 페이지별 그룹화 (SpellCheckResult.pageNumber를 사용해 실제 페이지 번호 표시)
  const grouped = new Map<string, { pageNumber: number; items: SpellCheckResult[] }>();
  for (const r of results) {
    const existing = grouped.get(r.pageId);
    if (existing) {
      existing.items.push(r);
    } else {
      grouped.set(r.pageId, { pageNumber: r.pageNumber, items: [r] });
    }
  }

  // 전체 correction 개수
  const totalCount = results.reduce((sum, r) => sum + r.corrections.length, 0);

  // 체크 상태: Map<elementKey, Set<correctionIndex>>
  const [checked, setChecked] = useState<CheckState>(() => {
    const init: CheckState = new Map();
    for (const r of results) {
      const key = buildKey(r);
      init.set(key, new Set(r.corrections.map((_, i) => i)));
    }
    return init;
  });

  const checkedCount = Array.from(checked.values()).reduce(
    (sum, set) => sum + set.size,
    0,
  );

  const toggleCorrection = (r: SpellCheckResult, idx: number) => {
    setChecked((prev) => {
      const next = new Map(prev);
      const key = buildKey(r);
      const set = new Set(next.get(key) ?? []);
      if (set.has(idx)) {
        set.delete(idx);
      } else {
        set.add(idx);
      }
      next.set(key, set);
      return next;
    });
  };

  const selectAll = () => {
    const init: CheckState = new Map();
    for (const r of results) {
      init.set(buildKey(r), new Set(r.corrections.map((_, i) => i)));
    }
    setChecked(init);
  };

  const deselectAll = () => {
    setChecked(new Map());
  };

  const handleApply = () => {
    // 선택된 correction만 포함하는 결과 생성
    const selected: SpellCheckResult[] = [];
    for (const r of results) {
      const key = buildKey(r);
      const indices = checked.get(key);
      if (!indices || indices.size === 0) continue;

      const filteredCorrections = r.corrections.filter((_, i) => indices.has(i));
      if (filteredCorrections.length > 0) {
        selected.push({ ...r, corrections: filteredCorrections });
      }
    }
    onApply(selected);
  };

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-14-semibold text-black-90">맞춤법 오류가 없습니다.</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black-25 px-4 py-2 text-14-semibold text-black-80 transition hover:border-black-40"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-14-semibold text-black-90">
          총 {totalCount}건의 수정 사항 ({checkedCount}건 선택됨)
        </span>
        <div className="flex gap-2 text-12-regular">
          <button
            type="button"
            onClick={selectAll}
            className="text-primary hover:text-primary/80"
          >
            전체 선택
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="text-black-60 hover:text-black-90"
          >
            전체 해제
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {Array.from(grouped.entries()).map(([pageId, { pageNumber, items }]) => (
            <div key={pageId} className="flex flex-col gap-2">
              <span className="text-12-semibold text-black-70">
                페이지 {pageNumber}
              </span>
              <div className="flex flex-col gap-1.5 rounded-lg border border-black-20 p-2">
                {items.map((result) =>
                  result.corrections.map((correction, idx) => {
                    const key = buildKey(result);
                    const isChecked = checked.get(key)?.has(idx) ?? false;
                    return (
                      <CorrectionRow
                        key={`${key}-${idx}`}
                        correction={correction}
                        isChecked={isChecked}
                        onToggle={() => toggleCorrection(result, idx)}
                      />
                    );
                  }),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-black-25 py-3 text-14-semibold text-black-80 transition hover:border-black-40"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={checkedCount === 0}
          className="flex-1 rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          반영하기
        </button>
      </div>
    </div>
  );
};

interface CorrectionRowProps {
  correction: SpellCorrection;
  isChecked: boolean;
  onToggle: () => void;
}

const CorrectionRow = ({
  correction,
  isChecked,
  onToggle,
}: CorrectionRowProps) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-black-5"
  >
    <div
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
        isChecked
          ? "border-primary bg-primary"
          : "border-black-30"
      }`}
    >
      {isChecked && <Check className="h-3 w-3 text-white-100" />}
    </div>
    <div className="flex flex-col gap-0.5">
      <div className="text-13-regular">
        <span className="text-red-500 line-through">{correction.original}</span>
        <span className="mx-1.5 text-black-40">&rarr;</span>
        <span className="text-green-600 font-medium">{correction.corrected}</span>
      </div>
      <span className="text-11-regular text-black-50">{correction.reason}</span>
    </div>
  </button>
);

export default SpellCheckReviewPanel;
