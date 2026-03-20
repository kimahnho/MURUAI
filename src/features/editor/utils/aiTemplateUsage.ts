/**
 * AI 이미지 크레딧 관리 유틸.
 * ai_template_usage 테이블 기반 (image_count 컬럼으로 이미지 단위 차감).
 * ai_credit_requests 테이블 기반 크레딧 추가 요청.
 * RLS로 본인 데이터만 접근 가능.
 */
import { supabase } from "@/shared/api/supabase";

/** 월간 이미지 크레딧 한도 */
export const MONTHLY_AI_CREDIT_LIMIT = 30;

/** @deprecated MONTHLY_AI_CREDIT_LIMIT 사용 */
export const MONTHLY_AI_TEMPLATE_LIMIT = MONTHLY_AI_CREDIT_LIMIT;

// ─── 사용량 조회 ───

/** 이번 달 소진된 이미지 크레딧 수를 반환한다. (SUM(image_count)) */
export const fetchMonthlyAiCreditUsage = async (): Promise<number> => {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const { data, error } = await supabase
    .from("ai_template_usage")
    .select("image_count")
    .gte("created_at", monthStart);
  if (error) {
    console.warn("ai_template_usage sum failed", error);
    return 0;
  }
  return (data ?? []).reduce(
    (sum, row) => sum + ((row as { image_count?: number }).image_count ?? 1),
    0,
  );
};

/** @deprecated fetchMonthlyAiCreditUsage 사용 */
export const fetchMonthlyAiTemplateUsage = fetchMonthlyAiCreditUsage;

// ─── 크레딧 체크 ───

/** 이미지 생성 전 크레딧이 충분한지 확인한다. */
export const checkAiCredits = async (
  requiredCount: number,
): Promise<{ canProceed: boolean; used: number; remaining: number }> => {
  const used = await fetchMonthlyAiCreditUsage();
  const remaining = Math.max(0, MONTHLY_AI_CREDIT_LIMIT - used);
  return { canProceed: remaining >= requiredCount, used, remaining };
};

// ─── 크레딧 차감 ───

/** AI 이미지 생성 크레딧을 기록한다. 비차단 — 실패해도 사용자 흐름을 막지 않는다. */
export const recordAiCreditUsage = async (
  type: "storybook" | "emotion",
  imageCount: number,
): Promise<void> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase
    .from("ai_template_usage")
    .insert({ user_id: data.user.id, type, image_count: imageCount });
  if (error) console.warn("ai_template_usage insert failed", error);
};

/** @deprecated recordAiCreditUsage 사용 */
export const recordAiTemplateUsage = async (
  type: "storybook" | "emotion",
): Promise<void> => {
  await recordAiCreditUsage(type, 1);
};

// ─── 크레딧 요청 ───

/** 추가 크레딧을 요청한다. 비차단. */
export const requestMoreCredits = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { error } = await supabase
    .from("ai_credit_requests")
    .insert({ user_id: data.user.id });
  if (error) {
    console.warn("ai_credit_requests insert failed", error);
    return false;
  }
  return true;
};

/** 이번 달 크레딧 추가 요청을 보낸 적이 있는지 확인한다. */
export const hasRequestedCreditsThisMonth = async (): Promise<boolean> => {
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const { count, error } = await supabase
    .from("ai_credit_requests")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart);
  if (error) {
    console.warn("ai_credit_requests check failed", error);
    return false;
  }
  return (count ?? 0) > 0;
};
