/**
 * 관리자 지표 KPI 카드를 요약 표시하는 컴포넌트.
 */
import { Users, FileText, LayoutTemplate, Download } from "lucide-react";

export type KpiCardData = {
  title: string;
  value: string | null;
  subValue?: string | null;
  hint?: string | null;
};

const CARD_ICONS = [Users, FileText, LayoutTemplate, Download];

const KpiCards = ({
  items,
  isLoading,
}: {
  items: KpiCardData[];
  isLoading?: boolean;
}) => {
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
      {items.map((item, index) => {
        const Icon = CARD_ICONS[index % CARD_ICONS.length];
        return (
          <div
            key={item.title}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-13-regular text-black-70">{item.title}</span>
              <span className="text-title-22-semibold text-black-90">
                {item.value ?? "-"}
              </span>
              {item.subValue && (
                <span className="text-12-regular text-black-70">
                  {item.subValue}
                </span>
              )}
              {item.hint && (
                <span className="text-12-regular text-black-70">
                  {item.hint}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KpiCards;
