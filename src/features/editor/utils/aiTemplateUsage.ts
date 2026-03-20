/**
 * AI 이미지 크레딧 관리 유틸.
 * user_credits 테이블 기반 잔량 추적 (balance/total_used/refill_count).
 * ai_template_usage 테이블은 이력 기록 전용 (잔량 계산에 미사용).
 * ai_credit_requests 테이블 기반 크레딧 추가 요청.
 * RLS로 본인 데이터만 접근 가능.
 */
import { supabase } from "@/shared/api/supabase";

/** 기본 이미지 크레딧 한도 */
export const MONTHLY_AI_CREDIT_LIMIT = 30;

/** @deprecated MONTHLY_AI_CREDIT_LIMIT 사용 */
export const MONTHLY_AI_TEMPLATE_LIMIT = MONTHLY_AI_CREDIT_LIMIT;

// ─── 잔량 조회 (user_credits 기반) ───

/** 현재 크레딧 잔량을 반환한다. */
export const fetchCreditBalance = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userData.user.id)
    .single();
  if (error) {
    console.warn("user_credits balance query failed", error);
    return 0;
  }
  return data?.balance ?? 0;
};

/**
 * @deprecated fetchCreditBalance 사용.
 * 하위 호환을 위해 유지 — 잔량을 "이번 달 사용량"으로 변환.
 */
export const fetchMonthlyAiCreditUsage = async (): Promise<number> => {
  const balance = await fetchCreditBalance();
  return MONTHLY_AI_CREDIT_LIMIT - balance;
};

/** @deprecated fetchMonthlyAiCreditUsage 사용 */
export const fetchMonthlyAiTemplateUsage = fetchMonthlyAiCreditUsage;

// ─── 크레딧 체크 ───

/** 이미지 생성 전 크레딧이 충분한지 확인한다. */
export const checkAiCredits = async (
  requiredCount: number,
): Promise<{ canProceed: boolean; used: number; remaining: number }> => {
  const remaining = await fetchCreditBalance();
  const used = MONTHLY_AI_CREDIT_LIMIT - remaining;
  return { canProceed: remaining >= requiredCount, used, remaining };
};

// ─── 크레딧 차감 ───

/** AI 이미지 생성 크레딧을 차감한다. use_credits RPC로 원자적 처리. */
export const recordAiCreditUsage = async (
  type: "storybook" | "emotion",
  imageCount: number,
): Promise<void> => {
  // 1) user_credits에서 원자적 차감
  const { data: actualCount, error: rpcError } = await supabase.rpc(
    "use_credits",
    { count: imageCount },
  );
  if (rpcError) console.warn("use_credits rpc failed", rpcError);

  // 2) ai_template_usage에 이력 기록 (비차단)
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    const { error } = await supabase
      .from("ai_template_usage")
      .insert({
        user_id: userData.user.id,
        type,
        image_count: (actualCount as number) ?? imageCount,
      });
    if (error) console.warn("ai_template_usage insert failed", error);
  }
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
