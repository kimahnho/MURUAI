import type { DateRangeState } from "../hooks/useAdminDashboard";
import type { DailyVisitPoint } from "../api/adminMetrics";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthLabel = (date: Date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const formatRangeLabel = (start: Date, end: Date) => {
  const startLabel = `${start.getFullYear()}.${`${start.getMonth() + 1}`.padStart(2, "0")}.${`${start.getDate()}`.padStart(2, "0")}`;
  const endLabel = `${end.getFullYear()}.${`${end.getMonth() + 1}`.padStart(2, "0")}.${`${end.getDate()}`.padStart(2, "0")}`;
  return `${startLabel} ~ ${endLabel}`;
};

const getMonthSections = (rangeStart: Date, rangeEnd: Date) => {
  const sections: Array<{ monthStart: Date; monthEnd: Date }> = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  while (cursor <= endMonth) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    sections.push({ monthStart, monthEnd });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return sections;
};

const buildCalendarDays = (start: Date, end: Date) => {
  const startOfWeek = new Date(start);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(end);
  endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

  const days: Date[] = [];
  const cursor = new Date(startOfWeek);
  while (cursor <= endOfWeek) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { days, startOfWeek, endOfWeek };
};

const WeekdayCalendar = ({
  title,
  range,
  data,
  isLoading,
  unavailableReason,
}: {
  title: string;
  range: DateRangeState;
  data: DailyVisitPoint[];
  isLoading?: boolean;
  unavailableReason?: string | null;
}) => {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-64 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4" />
    );
  }

  const rangeStart = parseDateInput(range.start);
  const rangeEnd = parseDateInput(range.end);
  const counts = new Map(data.map((point) => [point.date, point.count]));

  const renderGrid = (days: Date[], highlightRange: { start: Date; end: Date }) => (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_LABELS.map((label) => (
        <div key={`label-${label}`} className="text-center text-11-regular text-slate-400">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const key = toDateKey(day);
        const count = counts.get(key) ?? 0;
        const inRange = day >= highlightRange.start && day <= highlightRange.end;
        const isActive = count > 0 && inRange;
        const baseClass = "rounded-xl border p-2 text-center";
        const styleClass = !inRange
          ? "border-slate-100 bg-white text-slate-300"
          : isActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-400";
        return (
          <div key={key} className={`${baseClass} ${styleClass}`}>
            <div className="text-12-semibold">
              {day.getDate()}
            </div>
            <div className="text-11-regular">
              {inRange ? `${count}명` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );

  const { days, startOfWeek, endOfWeek } = buildCalendarDays(rangeStart, rangeEnd);
  const sections = range.preset === "30d" ? getMonthSections(rangeStart, rangeEnd) : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-14-semibold text-slate-800">{title}</span>
          {range.preset === "7d" && (
            <span className="text-12-regular text-slate-500">
              표시 주: {formatRangeLabel(startOfWeek, endOfWeek)}
            </span>
          )}
        </div>
        {unavailableReason && (
          <span className="text-12-regular text-slate-400">
            {unavailableReason}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-13-regular text-slate-500">
          표시할 데이터가 없습니다.
        </div>
      ) : range.preset === "30d" && sections ? (
        <div className="flex flex-col gap-6">
          {sections.map((section) => {
            const monthDays = buildCalendarDays(section.monthStart, section.monthEnd).days;
            return (
              <div key={formatMonthLabel(section.monthStart)} className="flex flex-col gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-12-regular text-slate-600">
                  {formatMonthLabel(section.monthStart)}
                </span>
                {renderGrid(monthDays, { start: rangeStart, end: rangeEnd })}
              </div>
            );
          })}
        </div>
      ) : (
        renderGrid(days, { start: rangeStart, end: rangeEnd })
      )}
    </div>
  );
};

export default WeekdayCalendar;
