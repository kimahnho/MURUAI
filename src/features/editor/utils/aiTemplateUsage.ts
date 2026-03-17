/**
 * AI 템플릿(스토리북/감정추론) 월간 사용량 조회 및 기록 유틸.
 * ai_template_usage 테이블 기반, RLS로 본인 데이터만 접근 가능.
 */
import { supabase } from "@/shared/api/supabase";

export const MONTHLY_AI_TEMPLATE_LIMIT = 30;

/** 이번 달 AI 템플릿 사용 횟수를 반환한다. */
export const fetchMonthlyAiTemplateUsage = async (): Promise<number> => {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const { count, error } = await supabase
    .from("ai_template_usage")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart);
  if (error) {
    console.warn("ai_template_usage count failed", error);
    return 0;
  }
  return count ?? 0;
};

/** AI 템플릿 생성 1건을 기록한다. 비차단 — 실패해도 사용자 흐름을 막지 않는다. */
export const recordAiTemplateUsage = async (
  type: "storybook" | "emotion",
): Promise<void> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase
    .from("ai_template_usage")
    .insert({ user_id: data.user.id, type });
  if (error) console.warn("ai_template_usage insert failed", error);
};
