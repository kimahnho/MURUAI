/**
 * POST /api/payment/cancel
 * 결제 취소/환불 API.
 *
 * 엣지케이스 대응:
 * - NICEpay 성공 + RPC 실패 → refund_pending 상태 저장 (관리자 확인)
 * - 7일 계산을 KST 기준으로 고정
 * - JSON 파싱 에러 보호
 * - 환경변수 누락 즉시 실패
 * - 중복 환불 방지: paid→refunding 낙관적 잠금
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

import { AuthError, verifyAuth } from "../_lib/auth.js";

const NICEPAY_CLIENT_ID = process.env.NICEPAY_CLIENT_ID;
const NICEPAY_SECRET_KEY = process.env.NICEPAY_SECRET_KEY;
const NICEPAY_API_BASE =
  process.env.NICEPAY_API_BASE ?? "https://sandbox-api.nicepay.co.kr";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REFUND_DAYS_LIMIT = 7;
// KST offset: +9시간
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function log(event: string, data: Record<string, unknown>) {
  console.error(
    JSON.stringify({ event, ...data, timestamp: new Date().toISOString() }),
  );
}

function toKSTDate(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 환경변수 검증
  if (!NICEPAY_CLIENT_ID || !NICEPAY_SECRET_KEY) {
    return res.status(500).json({ error: "서버 설정 오류" });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "서버 설정 오류" });
  }

  // 인증
  let userId: string;
  try {
    const auth = await verifyAuth(req);
    userId = auth.userId;
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: "로그인이 필요합니다." });
    }
    return res.status(500).json({ error: "인증 오류" });
  }

  // 입력 검증
  const orderId = String(req.body?.orderId ?? "").replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  );
  const reason = String(req.body?.reason ?? "사용자 요청 환불").slice(0, 200);

  if (!orderId) {
    return res.status(400).json({ error: "주문번호가 필요합니다." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 낙관적 잠금: paid → refunding (중복 환불 방지)
  const { data: order, error: lockError } = await supabase
    .from("payment_orders")
    .update({ status: "refunding" })
    .eq("order_id", orderId)
    .eq("status", "paid")
    .select("order_id, user_id, amount, credit_amount, tid, paid_at")
    .single();

  if (lockError || !order) {
    return res
      .status(400)
      .json({ error: "이미 처리 중이거나 환불 불가한 주문입니다." });
  }

  // 본인 주문 확인
  if (order.user_id !== userId) {
    // 잠금 롤백
    await supabase
      .from("payment_orders")
      .update({ status: "paid" })
      .eq("order_id", orderId);
    return res.status(403).json({ error: "본인 주문만 취소할 수 있습니다." });
  }

  // 7일 이내 확인 (KST 기준)
  if (order.paid_at) {
    const paidKST = toKSTDate(new Date(order.paid_at));
    const nowKST = toKSTDate(new Date());
    const daysSincePaid =
      (nowKST.getTime() - paidKST.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePaid > REFUND_DAYS_LIMIT) {
      // 잠금 롤백
      await supabase
        .from("payment_orders")
        .update({ status: "paid" })
        .eq("order_id", orderId);
      return res
        .status(400)
        .json({ error: "결제 후 7일이 지나 환불할 수 없습니다." });
    }
  }

  // tid 확인
  if (!order.tid) {
    await supabase
      .from("payment_orders")
      .update({ status: "paid" })
      .eq("order_id", orderId);
    return res
      .status(400)
      .json({ error: "거래 정보가 없어 환불할 수 없습니다." });
  }

  // 나이스페이 취소 API 호출
  const credentials = Buffer.from(
    `${NICEPAY_CLIENT_ID}:${NICEPAY_SECRET_KEY}`,
  ).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const cancelRes = await fetch(
      `${NICEPAY_API_BASE}/v1/payments/${order.tid}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          orderId,
          cancelAmt: order.amount,
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    // JSON 파싱 보호
    let result: Record<string, unknown>;
    try {
      result = await cancelRes.json();
    } catch {
      log("cancel_json_parse_error", { orderId });
      await supabase
        .from("payment_orders")
        .update({ status: "paid" })
        .eq("order_id", orderId);
      return res.status(500).json({ error: "환불 응답 처리에 실패했습니다." });
    }

    if (result.resultCode !== "0000") {
      log("cancel_failed", {
        orderId,
        resultCode: result.resultCode,
        resultMsg: result.resultMsg,
      });
      // 잠금 롤백
      await supabase
        .from("payment_orders")
        .update({ status: "paid" })
        .eq("order_id", orderId);
      return res
        .status(400)
        .json({ error: (result.resultMsg as string) ?? "취소에 실패했습니다." });
    }

    // NICEpay 취소 성공 → 크레딧 차감 RPC
    const { error: rpcError } = await supabase.rpc("refund_payment_credits", {
      p_order_id: orderId,
      p_refund_credits: order.credit_amount,
      p_reason: reason,
    });

    if (rpcError) {
      log("cancel_rpc_failed", { orderId, error: rpcError.message });
      // NICEpay 환불은 됐지만 크레딧 미차감 → refund_pending (관리자 확인)
      await supabase
        .from("payment_orders")
        .update({ status: "refund_pending" })
        .eq("order_id", orderId);
      return res.status(500).json({
        error:
          "환불은 완료됐으나 크레딧 처리에 문제가 생겼어요. 관리자에게 문의해주세요.",
      });
    }

    log("cancel_success", { orderId, amount: order.amount });
    return res.status(200).json({
      success: true,
      message: "환불이 완료되었습니다. 3~7영업일 내에 카드사에서 환불됩니다.",
    });
  } catch (err) {
    clearTimeout(timeout);
    log("cancel_network_error", {
      orderId,
      error: err instanceof Error ? err.message : "unknown",
    });
    // 네트워크 오류 → 잠금 롤백
    await supabase
      .from("payment_orders")
      .update({ status: "paid" })
      .eq("order_id", orderId);
    return res
      .status(500)
      .json({ error: "환불 처리 중 오류가 발생했습니다." });
  }
}
