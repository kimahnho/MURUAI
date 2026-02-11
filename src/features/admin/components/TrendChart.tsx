export type TrendPoint = {
  date: string;
  created: number;
  downloads?: number | null;
};

const formatLabel = (value: string) => {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${month}.${day}`;
};

const TrendChart = ({
  title,
  data,
  downloadsUnavailableReason,
  isLoading,
}: {
  title: string;
  data: TrendPoint[];
  downloadsUnavailableReason?: string | null;
  isLoading?: boolean;
}) => {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-64 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4" />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-14-semibold text-slate-800">{title}</span>
        {downloadsUnavailableReason && (
          <span className="text-12-regular text-slate-400">
            {downloadsUnavailableReason}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-13-regular text-slate-500">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[110px_1fr_1fr] bg-slate-100 px-3 py-2 text-12-semibold text-slate-600">
            <span>날짜</span>
            <span>생성</span>
            <span>다운로드</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {data.map((point, index) => (
              <div
                key={`${point.date}-${index}`}
                className={`grid grid-cols-[110px_1fr_1fr] px-3 py-2 text-12-regular text-slate-700 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                }`}
              >
                <span className="text-slate-500">{formatLabel(point.date)}</span>
                <span className="text-slate-900">{point.created}</span>
                <span className="text-slate-900">{point.downloads ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
