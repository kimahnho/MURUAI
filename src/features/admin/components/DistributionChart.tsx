export type DistributionBucket = {
  label: string;
  value: number;
};

const DistributionChart = ({
  title,
  data,
  unavailableReason,
  isLoading,
}: {
  title: string;
  data: DistributionBucket[];
  unavailableReason?: string | null;
  isLoading?: boolean;
}) => {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex h-56 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4" />
    );
  }

  const maxValue = data.reduce((max, bucket) => Math.max(max, bucket.value), 0);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-14-semibold text-slate-800">{title}</span>
        {unavailableReason && (
          <span className="text-12-regular text-slate-400">
            {unavailableReason}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-13-regular text-slate-500">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((bucket) => {
            const percent =
              maxValue > 0 ? Math.round((bucket.value / maxValue) * 100) : 0;
            return (
              <div key={bucket.label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-12-regular text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                    {bucket.label}
                  </span>
                  <span className="text-slate-500">
                    {bucket.value}명 · {percent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-violet-400"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DistributionChart;
