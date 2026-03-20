/**
 * 기간별 추세 데이터를 테이블로 표시하는 컴포넌트.
 */
export type TrendPoint = {
  date: string;
  created: number;
  downloads?: number | null;
};

const formatLabel = (value: string) => {
  const parts = value.split("-");
  if (parts.length < 3) return value;
  return `${parts[1]}.${parts[2]}`;
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
      <div className="flex h-64 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5" />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-14-semibold text-black-90">{title}</span>
        {downloadsUnavailableReason && (
          <span className="text-12-regular text-black-70">
            {downloadsUnavailableReason}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[100px_1fr_1fr] bg-black-5 px-3 py-2 text-12-semibold text-black-70">
            <span>날짜</span>
            <span>생성</span>
            <span>다운로드</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {data.map((point, index) => (
              <div
                key={`${point.date}-${index}`}
                className={`grid grid-cols-[100px_1fr_1fr] px-3 py-2 text-13-regular ${
                  index % 2 === 0 ? "bg-white" : "bg-black-5"
                }`}
              >
                <span className="text-black-70">{formatLabel(point.date)}</span>
                <span className="text-black-80">{point.created}</span>
                <span className="text-black-80">{point.downloads ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
