/**
 * 문서/사용량 분포 데이터를 수평 막대 차트로 시각화하는 컴포넌트.
 */
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
      <div className="flex h-56 w-full animate-pulse flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5" />
    );
  }

  const maxValue = data.reduce((max, bucket) => Math.max(max, bucket.value), 0);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-14-semibold text-black-90">{title}</span>
        {unavailableReason && (
          <span className="text-12-regular text-black-70">
            {unavailableReason}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="flex h-36 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((bucket) => {
            const percent =
              maxValue > 0 ? Math.round((bucket.value / maxValue) * 100) : 0;
            return (
              <div key={bucket.label} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-right text-12-semibold text-black-70">
                  {bucket.label}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-black-5">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg bg-primary-200 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                  <span className="relative z-10 flex h-full items-center px-2 text-12-regular text-black-70">
                    {bucket.value}명
                  </span>
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
