/**
 * 관리자 대시보드 화면 — 탭 네비게이션(대시보드/크레딧/유저) + 각 섹션.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ChevronRight } from "lucide-react";
import Tabs from "@/shared/ui/Tabs";
import DateRangeFilter from "./DateRangeFilter";
import KpiCards from "./KpiCards";
import TrendChart from "./TrendChart";
import DistributionChart from "./DistributionChart";
import WeekdayCalendar from "./WeekdayCalendar";
import TemplatesTable from "./TemplatesTable";
import CreditRequestsSection from "./CreditRequestsSection";
import UserListSection from "./UserListSection";
import type { AdminMetrics } from "../api/adminMetrics";
import type { DateRangePreset, DateRangeState } from "../hooks/useAdminDashboard";

const formatNumber = (value: number | null) =>
  value == null ? "-" : value.toLocaleString("ko-KR");

type AdminTab = "dashboard" | "credits" | "users";

const TAB_ITEMS: { id: AdminTab; label: string }[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "credits", label: "크레딧 요청" },
  { id: "users", label: "유저 관리" },
];

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
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-title-20-semibold text-black-90">
              관리자 대시보드
            </span>
            <span className="text-12-regular text-black-70">
              {adminEmail ?? ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="rounded-full bg-primary-50 px-3 py-1 text-12-regular text-primary">
              업데이트 중
            </span>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-13-bold text-black-70 hover:bg-black-5"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs
        items={TAB_ITEMS}
        activeId={activeTab}
        onTabChange={(id) => setActiveTab(id as AdminTab)}
      />

      {/* 대시보드 탭 */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeFilter
              range={range}
              onPresetChange={onPresetChange}
              onCustomRangeChange={onCustomRangeChange}
              isLoading={isLoading}
            />
            <div className="flex items-center gap-2 text-12-regular text-black-70">
              <span>{range.start} ~ {range.end}</span>
              {metrics?.range.days != null && (
                <span className="text-black-70">({metrics.range.days}일)</span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-error-100 bg-error-50 px-4 py-3 text-14-regular text-error-700">
              <span>데이터를 불러오지 못했어요. {errorMessage}</span>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl border border-error-100 bg-white px-3 py-1 text-13-bold text-error-700 hover:bg-error-50"
              >
                다시 시도
              </button>
            </div>
          )}

          <KpiCards items={kpiItems} isLoading={isLoading} />

          {/* AI 기능 사용량 — 핵심 지표 */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <span className="text-14-semibold text-black-90">AI 기능 사용량</span>
            {(metrics?.aiUsage ?? []).length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
                AI 사용 데이터가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {(metrics?.aiUsage ?? []).map((stat) => {
                  const typeLabel =
                    stat.type === "emotion" ? "감정 추론 활동" :
                    stat.type === "storybook" ? "스토리북" :
                    stat.type;
                  return (
                    <div key={stat.type} className="flex flex-col gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-4">
                      <div className="flex items-center justify-between">
                        <span className="text-title-16-semibold text-black-90">{typeLabel}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-title-22-semibold text-primary">{stat.total}</span>
                          <span className="text-14-regular text-black-70">회</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-13-regular text-black-70">
                        <span>메인 페이지 <strong>{stat.fromLanding}</strong>건</span>
                        <span>에디터 <strong>{stat.fromEditor}</strong>건</span>
                        <span>확정 <strong>{stat.confirmed}</strong>건</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

          {/* 유저별 자료 */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-14-semibold text-black-90">유저별 자료</span>
              <Link
                to="/admin/user-docs"
                className="flex items-center gap-1 text-13-bold text-primary hover:underline"
              >
                전체 보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {userDocs.length === 0 ? (
              <div className="flex h-28 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
                유저별 자료 데이터가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {userDocs.map((entry) => {
                  const displayName = entry.userName || entry.userId;
                  return (
                    <Link
                      key={entry.userId}
                      to={`/admin/user-docs?userId=${encodeURIComponent(entry.userId)}`}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 transition hover:border-primary-200 hover:bg-primary-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-14-semibold text-black-80">
                          {displayName}
                        </span>
                        <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-12-semibold text-primary">
                          {entry.total}개
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.docs.map((doc) => (
                          <span
                            key={doc.id}
                            className="rounded-md bg-black-5 px-2 py-0.5 text-12-regular text-black-70"
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
      )}

      {/* 크레딧 요청 탭 */}
      {activeTab === "credits" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <CreditRequestsSection />
        </div>
      )}

      {/* 유저 관리 탭 */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <UserListSection />
        </div>
      )}
    </div>
  );
};

export default AdminDashboardView;
