/**
 * 대시보드 조회 기간 필터 선택 UI를 제공하는 컴포넌트.
 */
import type { DateRangePreset, DateRangeState } from "../hooks/useAdminDashboard";

const presets: { id: DateRangePreset; label: string }[] = [
  { id: "7d", label: "최근 7일" },
  { id: "30d", label: "최근 30일" },
  { id: "custom", label: "커스텀" },
];

const DateRangeFilter = ({
  range,
  onPresetChange,
  onCustomRangeChange,
  isLoading,
}: {
  range: DateRangeState;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (start: string, end: string) => void;
  isLoading?: boolean;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => { onPresetChange(preset.id); }}
            disabled={isLoading}
            className={`rounded-xl px-3 py-1.5 text-12-semibold transition ${
              range.preset === preset.id
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {range.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={range.start}
            onChange={(event) => {
              onCustomRangeChange(event.target.value, range.end);
            }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-12-regular text-slate-900"
          />
          <span className="text-12-regular text-slate-400">~</span>
          <input
            type="date"
            value={range.end}
            onChange={(event) => {
              onCustomRangeChange(range.start, event.target.value);
            }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-12-regular text-slate-900"
          />
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
