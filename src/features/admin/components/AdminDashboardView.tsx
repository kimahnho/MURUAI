import { Link } from "react-router-dom";
import DateRangeFilter from "./DateRangeFilter";
import KpiCards from "./KpiCards";
import TrendChart from "./TrendChart";
import DistributionChart from "./DistributionChart";
import WeekdayCalendar from "./WeekdayCalendar";
import TemplatesTable from "./TemplatesTable";
import type { AdminMetrics } from "../api/adminMetrics";
import type { DateRangePreset, DateRangeState } from "../hooks/useAdminDashboard";

const formatNumber = (value: number | null) =>
  value == null ? "-" : value.toLocaleString("ko-KR");

const AdminDashboardView = ({
  adminEmail,
  range,
  metrics,
  isLoading,
  isFetching,
  errorMessage,
  onRetry,
  onPresetChange,
  onCustomRangeChange,
  onSignOut,
}: {
  adminEmail: string | null;
  range: DateRangeState;
  metrics: AdminMetrics | null;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange: (start: string, end: string) => void;
  onSignOut: () => void;
}) => {
  const totalInRange = metrics?.documents.totalInRange ?? 0;
  const totalAllTime = metrics?.documents.totalAllTime ?? null;
  const templateDocs = metrics?.templates.templateDocs ?? 0;
  const templateDocRatio = metrics?.templates.templateDocRatio ?? null;
  const wau = metrics?.activity.wau ?? null;
  const weeklyVisitAvg = metrics?.activity.weeklyVisitAvg ?? null;
  const downloadTotal = metrics?.downloads.total ?? null;
  const downloadConversion = metrics?.downloads.conversionRate ?? null;
  const downloadUserRatio = metrics?.downloads.userRatio ?? null;

  const kpiItems = metrics
    ? [
        {
          title: "주간 활성 사용자(WAU)",
          value: wau != null ? `${formatNumber(wau)}명` : "-",
          subValue:
            weeklyVisitAvg != null
              ? `유저당 방문일수 평균 ${weeklyVisitAvg.toFixed(1)}일`
              : undefined,
          hint: metrics.availability.activity,
        },
        {
          title: "자료 제작(기간)",
          value: `${formatNumber(totalInRange)}건`,
          subValue: `전체 ${formatNumber(totalAllTime)}건`,
        },
        {
          title: "템플릿 사용률",
          value:
            templateDocRatio == null
              ? "-"
              : `${(templateDocRatio * 100).toFixed(1)}%`,
          subValue: `템플릿 기반 ${formatNumber(templateDocs)}건`,
        },
        {
          title: "다운로드",
          value: downloadTotal != null ? `${formatNumber(downloadTotal)}건` : "-",
          subValue:
            downloadConversion != null
              ? `전환율 ${(downloadConversion * 100).toFixed(1)}%`
              : undefined,
          hint:
            downloadUserRatio != null
              ? `다운로드 유저 비율 ${(downloadUserRatio * 100).toFixed(1)}%`
              : metrics.availability.downloads,
        },
      ]
    : [];

  const trendData = metrics ? metrics.documents.trend : [];
  const distributionLabelMap: Record<string, string> = {
    "1": "1일",
    "2": "2일",
    "3-4": "3~4일",
    "5-7": "5~7일",
    "8+": "8일+",
  };
  const distributionData = metrics
    ? metrics.activity.weeklyVisitDistribution.map((bucket) => ({
        label: distributionLabelMap[bucket.label] ?? bucket.label,
        value: bucket.count,
      }))
    : [];
  const userDocs = metrics?.userDocs ?? [];

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50 px-10 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-title-20-semibold text-slate-900">
              관리자 대시보드
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-12-regular text-indigo-700">
              Admin
            </span>
          </div>
          <span className="text-12-regular text-slate-500">
            {adminEmail ?? "admin@muruai.com"}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-12-regular text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              조회 기간: {range.start} ~ {range.end}
            </span>
            {metrics?.range.days != null && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {metrics.range.days}일
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isFetching && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-12-regular text-amber-700">
              데이터 업데이트 중
            </span>
          )}
          <DateRangeFilter
            range={range}
            onPresetChange={onPresetChange}
            onCustomRangeChange={onCustomRangeChange}
            isLoading={isLoading}
          />
          <button
            type="button"
            onClick={onSignOut}
            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-12-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-14-regular text-rose-600">
          <span>데이터를 불러오지 못했어요. {errorMessage}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-rose-200 bg-white px-3 py-1 text-12-semibold text-rose-600"
          >
            다시 시도
          </button>
        </div>
      )}

      <KpiCards items={kpiItems} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TrendChart
            title="일자별 추이 (생성/다운로드)"
            data={trendData}
            downloadsUnavailableReason={metrics?.availability.downloads ?? null}
            isLoading={isLoading}
          />
        </div>
        <div className="flex flex-col gap-4">
          <DistributionChart
            title="주간 방문일수 분포"
            data={distributionData}
            unavailableReason={metrics?.availability.weeklyVisits ?? null}
            isLoading={isLoading}
          />
          <WeekdayCalendar
            title="요일별 방문 유저"
            range={range}
            data={metrics?.activity.dailyVisits ?? []}
            unavailableReason={metrics?.availability.weeklyVisits ?? null}
            isLoading={isLoading}
          />
        </div>
      </div>

      <TemplatesTable
        title="Top 템플릿"
        templates={metrics?.templates.topTemplates ?? []}
        isLoading={isLoading}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-14-semibold text-slate-800">유저별 자료</span>
          <Link
            to="/admin/user-docs"
            className="text-12-semibold text-indigo-600 hover:underline"
          >
            전체 보기
          </Link>
        </div>
        {userDocs.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-13-regular text-slate-500">
            유저별 자료 데이터가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {userDocs.map((entry) => {
              const displayName = entry.userName || entry.userId;
              return (
                <Link
                  key={entry.userId}
                  to={`/admin/user-docs?userId=${encodeURIComponent(entry.userId)}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-14-semibold text-slate-900">
                      {displayName}
                    </span>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-12-regular text-sky-700">
                      {entry.total}개
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.docs.map((doc) => (
                      <span
                        key={doc.id}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-12-regular text-slate-600"
                      >
                        {doc.name || "제목 없음"}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardView;
