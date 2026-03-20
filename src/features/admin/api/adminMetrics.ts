/**
 * 관리자 대시보드 지표 조회 API 호출을 담당하는 모듈.
 */
import { supabase } from "@/shared/api/supabase";
import { EXCLUDED_USER_ID_LIST, EXCLUDED_USER_IDS } from "../constants/excludedUsers";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";

export type AdminDateRange = {
  start: string;
  end: string;
};

export type TemplateStat = {
  templateId: string;
  usageCount: number;
  docCount: number;
};

export type TrendPoint = {
  date: string;
  created: number;
  downloads: number | null;
};

export type WeeklyVisitBucket = {
  label: string;
  count: number;
  ratio: number;
};

export type WeekdayVisitBucket = {
  label: string;
  count: number;
  ratio?: number;
};

export type DailyVisitPoint = {
  date: string;
  count: number;
};

export type UserDocSummary = {
  userId: string;
  userName: string | null;
  total: number;
  docs: Array<{
    id: string;
    name: string | null;
    createdAt: string | null;
  }>;
};

export type AiUsageStat = {
  type: string;
  total: number;
  confirmed: number;
  fromLanding: number;
  fromEditor: number;
};

export type AdminMetrics = {
  range: {
    start: string;
    end: string;
    days: number;
  };
  documents: {
    totalAllTime: number | null;
    totalInRange: number;
    trend: TrendPoint[];
  };
  templates: {
    templateDocs: number;
    templateDocRatio: number | null;
    topTemplates: TemplateStat[];
  };
  activity: {
    wau: number | null;
    activeUsers: number | null;
    weeklyVisitAvg: number | null;
    weeklyVisitDistribution: WeeklyVisitBucket[];
    weekdayVisits: WeekdayVisitBucket[];
    dailyVisits: DailyVisitPoint[];
  };
  aiUsage: AiUsageStat[];
  userDocs: UserDocSummary[];
  downloads: {
    total: number | null;
    users: number | null;
    conversionRate: number | null;
    userRatio: number | null;
  };
  availability: {
    activity: string | null;
    weeklyVisits: string | null;
    downloads: string | null;
  };
};

type RpcMetrics = {
  documents?: {
    total_created?: number | null;
  } | null;
  templates?: {
    template_docs?: number | null;
    top_templates?: Array<{
      template_id?: string | null;
      usage_count?: number | null;
      doc_count?: number | null;
    }> | null;
  } | null;
  activity?: {
    wau?: number | null;
    active_users?: number | null;
    has_data?: boolean | null;
    weekly_visit_avg?: number | null;
    weekly_visit_distribution?: WeeklyVisitBucket[] | null;
    weekday_visits?: WeekdayVisitBucket[] | null;
    daily_visits?: DailyVisitPoint[] | null;
  } | null;
  downloads?: {
    total?: number | null;
    users?: number | null;
    has_data?: boolean | null;
    conversion_rate?: number | null;
    user_ratio?: number | null;
  } | null;
  trend?: Array<{
    date?: string | null;
    created?: number | null;
    downloads?: number | null;
  }> | null;
  user_docs?: Array<{
    user_id?: string | null;
    user_name?: string | null;
    total?: number | null;
    docs?: Array<{
      id?: string | null;
      name?: string | null;
      created_at?: string | null;
    }> | null;
  }> | null;
};

type UserMadeRow = {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
};

const parseCanvasData = (value: unknown): CanvasDocument | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as CanvasDocument;
      return Array.isArray(parsed.pages) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    const data = value as CanvasDocument;
    return Array.isArray(data.pages) ? data : null;
  }
  return null;
};

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toStartOfDayIso = (value: string) => {
  const date = parseDateInput(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const toEndOfDayIso = (value: string) => {
  const date = parseDateInput(value);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

const buildDateKeys = (start: Date, end: Date) => {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

export const fetchAdminMetrics = async (
  range: AdminDateRange
): Promise<AdminMetrics> => {
  const startIso = toStartOfDayIso(range.start);
  const endIso = toEndOfDayIso(range.end);
  const excludedFilter =
    EXCLUDED_USER_ID_LIST.length > 0
      ? `(${EXCLUDED_USER_ID_LIST.map((id) => `"${id}"`).join(",")})`
      : null;

  const totalQuery = supabase
    .from("user_made_n")
    .select("id", { count: "exact", head: true });

  if (excludedFilter) {
    totalQuery.not("user_id", "in", excludedFilter);
  }

  const [totalResult, rpcResult] = await Promise.all([
    totalQuery,
    supabase.rpc("admin_dashboard_metrics", {
      start_date: range.start,
      end_date: range.end,
    }),
  ]);

  const totalAllTime = totalResult.error ? null : totalResult.count ?? null;
  const rpcMetrics = rpcResult.error
    ? null
    : (rpcResult.data as RpcMetrics | null);
  const hasRpc = Boolean(rpcMetrics && !rpcResult.error);

  const startDate = parseDateInput(range.start);
  const endDate = parseDateInput(range.end);
  const dayKeys = buildDateKeys(startDate, endDate);
  const rpcTrend = Array.isArray(rpcMetrics?.trend) ? rpcMetrics?.trend : null;
  let totalInRange = rpcMetrics?.documents?.total_created ?? 0;
  let trend: TrendPoint[] = [];
  let templateDocs = rpcMetrics?.templates?.template_docs ?? 0;
  let topTemplates: TemplateStat[] =
    rpcMetrics?.templates?.top_templates?.map((entry) => ({
      templateId: entry.template_id ?? "",
      usageCount: entry.usage_count ?? 0,
      docCount: entry.doc_count ?? 0,
    })) ?? [];
  let userDocs: UserDocSummary[] =
    rpcMetrics?.user_docs
      ?.map((entry) => ({
        userId: entry.user_id ?? "",
        userName: entry.user_name ?? null,
        total: entry.total ?? 0,
        docs:
          entry.docs?.map((doc) => ({
            id: doc.id ?? "",
            name: doc.name ?? null,
            createdAt: doc.created_at ?? null,
          })) ?? [],
      }))
      .filter((entry) => entry.userId && !EXCLUDED_USER_IDS.has(entry.userId)) ??
    [];

  if (!hasRpc) {
    // RPC가 없거나 실패한 환경에서도 대시보드가 동작하도록 테이블 조회 fallback을 제공한다.
    const docsQuery = supabase
      .from("user_made_n")
      .select("id,user_id,name,created_at,canvas_data")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: true });
    if (excludedFilter) {
      docsQuery.not("user_id", "in", excludedFilter);
    }
    const docsResult = await docsQuery;
    if (docsResult.error) {
      throw docsResult.error;
    }

    const docs = ((docsResult.data as UserMadeRow[] | null) ?? []).filter(
      (doc) => !EXCLUDED_USER_IDS.has(doc.user_id)
    );
    const trendMap = new Map(dayKeys.map((key) => [key, 0]));
    const templateStats = new Map<
      string,
      { usageCount: number; docIds: Set<string> }
    >();
    const userDocsMap = new Map<string, UserDocSummary>();
    templateDocs = 0;

    docs.forEach((doc) => {
      if (doc.created_at) {
        const key = toDateKey(new Date(doc.created_at));
        if (trendMap.has(key)) {
          trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
        }
      }

      const canvas = parseCanvasData(doc.canvas_data);
      const pages = canvas?.pages ?? [];
      if (pages.length === 0) return;

      let docHasTemplate = false;
      pages.forEach((page) => {
        if (!page.templateId) return;
        docHasTemplate = true;
        const entry = templateStats.get(page.templateId) ?? {
          usageCount: 0,
          docIds: new Set<string>(),
        };
        entry.usageCount += 1;
        entry.docIds.add(doc.id);
        templateStats.set(page.templateId, entry);
      });

      if (docHasTemplate) {
        templateDocs += 1;
      }

      const entry = userDocsMap.get(doc.user_id) ?? {
        userId: doc.user_id,
        userName: null,
        total: 0,
        docs: [],
      };
      entry.total += 1;
      entry.docs.push({
        id: doc.id,
        name: doc.name,
        createdAt: doc.created_at,
      });
      userDocsMap.set(doc.user_id, entry);
    });

    totalInRange = docs.length;
    trend = dayKeys.map((key) => ({
      date: key,
      created: trendMap.get(key) ?? 0,
      downloads: null,
    }));
    topTemplates = Array.from(templateStats.entries())
      .map(([templateId, entry]) => ({
        templateId,
        usageCount: entry.usageCount,
        docCount: entry.docIds.size,
      }))
      .sort((a, b) => {
        if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
        return b.docCount - a.docCount;
      })
      .slice(0, 5);
    // 사용자 문서 목록은 최근 순 3건만 보여줘 카드 밀도를 유지한다.
    userDocs = Array.from(userDocsMap.values())
      .map((entry) => ({
        ...entry,
        docs: entry.docs
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 3),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  } else {
    // RPC 경로는 서버에서 집계한 트렌드를 우선 사용하고, 비어 있으면 일자 틀만 채워 반환한다.
    trend = rpcTrend && rpcTrend.length > 0
      ? rpcTrend.map((point) => ({
          date: point.date ?? "",
          created: point.created ?? 0,
          downloads: point.downloads ?? 0,
        }))
      : dayKeys.map((key) => ({
          date: key,
          created: 0,
          downloads: 0,
        }));
  }
  // AI 생성 로그 집계 (ai_generation_logs 테이블에서 직접 조회)
  const aiLogsResult = await supabase
    .from("ai_generation_logs")
    .select("type,source,confirmed_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const aiUsageMap = new Map<string, { total: number; confirmed: number; fromLanding: number; fromEditor: number }>();
  if (!aiLogsResult.error && Array.isArray(aiLogsResult.data)) {
    for (const log of aiLogsResult.data as Array<{ type: string; source: string | null; confirmed_at: string | null }>) {
      const type = log.type || "unknown";
      const entry = aiUsageMap.get(type) ?? { total: 0, confirmed: 0, fromLanding: 0, fromEditor: 0 };
      entry.total += 1;
      if (log.confirmed_at) entry.confirmed += 1;
      if (log.source === "landing") entry.fromLanding += 1;
      else entry.fromEditor += 1;
      aiUsageMap.set(type, entry);
    }
  }
  const aiUsage: AiUsageStat[] = Array.from(aiUsageMap.entries())
    .map(([type, stat]) => ({ type, ...stat }))
    .sort((a, b) => b.total - a.total);

  const activityMetrics = rpcMetrics?.activity ?? null;
  const downloadMetrics = rpcMetrics?.downloads ?? null;
  const activityHasData = activityMetrics?.has_data ?? false;
  const downloadHasData = downloadMetrics?.has_data ?? false;

  return {
    range: {
      start: range.start,
      end: range.end,
      days: dayKeys.length,
    },
    documents: {
      totalAllTime,
      totalInRange,
      trend,
    },
    templates: {
      templateDocs,
      templateDocRatio: totalInRange > 0 ? templateDocs / totalInRange : null,
      topTemplates,
    },
    activity: {
      wau: activityMetrics?.wau ?? (hasRpc ? 0 : null),
      activeUsers: activityMetrics?.active_users ?? (hasRpc ? 0 : null),
      weeklyVisitAvg:
        activityMetrics?.weekly_visit_avg != null
          ? Number(activityMetrics.weekly_visit_avg)
          : null,
      weeklyVisitDistribution:
        activityMetrics?.weekly_visit_distribution ?? [],
      weekdayVisits: activityMetrics?.weekday_visits ?? [],
      dailyVisits: activityMetrics?.daily_visits ?? [],
    },
    aiUsage,
    userDocs,
    downloads: {
      total: downloadMetrics?.total ?? (hasRpc ? 0 : null),
      users: downloadMetrics?.users ?? (hasRpc ? 0 : null),
      conversionRate:
        downloadMetrics?.conversion_rate != null
          ? Number(downloadMetrics.conversion_rate)
          : null,
      userRatio:
        downloadMetrics?.user_ratio != null
          ? Number(downloadMetrics.user_ratio)
          : null,
    },
    availability: {
      activity: hasRpc
        ? activityHasData
          ? null
          : "활동/세션 이벤트 로그가 없어 계산할 수 없어요."
        : "활동/세션 이벤트 데이터가 연결되어 있지 않아요.",
      weeklyVisits: hasRpc
        ? activityHasData
          ? null
          : "로그인/세션 이벤트 로그가 없어 계산할 수 없어요."
        : "로그인/세션 이벤트 로그가 없어 계산할 수 없어요.",
      downloads: hasRpc
        ? downloadHasData
          ? null
          : "다운로드 이벤트 로그가 없어 계산할 수 없어요."
        : "다운로드 이벤트 로그가 없어 계산할 수 없어요.",
    },
  };
};
