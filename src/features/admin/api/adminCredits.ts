/**
 * 관리자 전용 RPC 래퍼 — 유저 목록, 크레딧 요청 관리.
 */
import { supabase } from "@/shared/api/supabase";

// ─── 타입 ───

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  provider: string;
  last_sign_in_at: string | null;
  created_at: string;
  role: string;
  credit_balance: number;
  credit_total_used: number;
  credit_refill_count: number;
}

export interface AdminCreditRequest {
  request_id: string;
  user_id: string;
  user_email: string;
  user_display_name: string;
  status: string;
  credit_balance: number;
  created_at: string;
  reviewed_at: string | null;
}

// ─── 유저 목록 ───

export const fetchUserList = async (): Promise<AdminUser[]> => {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return (data as AdminUser[]) ?? [];
};

// ─── 크레딧 요청 목록 ───

export const fetchCreditRequests = async (): Promise<AdminCreditRequest[]> => {
  const { data, error } = await supabase.rpc("admin_list_credit_requests");
  if (error) throw error;
  return (data as AdminCreditRequest[]) ?? [];
};

// ─── 크레딧 요청 승인/거절 ───

export const manageCreditRequest = async (
  requestId: string,
  action: "approved" | "rejected",
): Promise<void> => {
  const { error } = await supabase.rpc("admin_manage_credit_request", {
    p_request_id: requestId,
    p_action: action,
  });
  if (error) throw error;
};

// ─── 수동 크레딧 충전 ───

/** 관리자가 특정 유저의 크레딧을 수동으로 충전한다. */
export const adminAdjustUserCredits = async (
  userId: string,
  amount: number,
): Promise<void> => {
  const { error } = await supabase.rpc("admin_adjust_user_credits", {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
};
