export type KpiCardData = {
  title: string;
  value: string | null;
  subValue?: string | null;
  hint?: string | null;
};

const KpiCards = ({
  items,
  isLoading,
}: {
  items: KpiCardData[];
  isLoading?: boolean;
}) => {
  const cardPalette = [
    "border-t-sky-400",
    "border-t-emerald-400",
    "border-t-violet-400",
    "border-t-amber-400",
  ];

  if (isLoading && items.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`kpi-skeleton-${index}`}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.title}
          className={`flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm border-t-4 ${
            cardPalette[index % cardPalette.length]
          }`}
        >
          <span className="text-14-semibold text-slate-600">{item.title}</span>
          <div className="flex flex-col gap-1">
            <span className="text-title-22-semibold text-slate-900">
              {item.value ?? "데이터 없음"}
            </span>
            {item.subValue && (
              <span className="text-12-regular text-slate-500">
                {item.subValue}
              </span>
            )}
            {item.hint && (
              <span className="text-12-regular text-slate-400">
                {item.hint}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
