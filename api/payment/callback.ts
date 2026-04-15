/**
 * POST /api/payment/callback
 * 나이스페이 결제창 인증 완료 후 콜백 (Server 승인 모델).
 *
 * 보안 체크리스트:
 * 1. 입력값 검증 (tid/orderId 문자 필터, amount 정수)
 * 2. DB 주문 조회 + status === 'pending' 확인
 * 3. 금액 비교 (DB vs 콜백)
 * 4. signature 검증
 * 5. 멱등 상태 전환 (pending → paid)
 * 6. 승인 API 8초 타임아웃
 * 7. 성공 시 add_payment_credits RPC (원자적 충전)
 * 8. 타임아웃 시 망취소
 * 9. 모든 단계 구조화 로깅
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const NICEPAY_CLIENT_ID = process.env.NICEPAY_CLIENT_ID ?? "";
const NICEPAY_SECRET_KEY = process.env.NICEPAY_SECRET_KEY ?? "";
const NICEPAY_API_BASE =
  process.env.NICEPAY_API_BASE ?? "https://sandbox-api.nicepay.co.kr";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 영숫자 + 하이픈/밑줄만 허용
const sanitize = (val: unknown): string =>
  String(val ?? "").replace(/[^a-zA-Z0-9_-]/g, "");

const FAIL_MESSAGES: Record<string, string> = {
  auth_failed: "결제 인증에 실패했어요.",
  invalid_input: "잘못된 요청이에요.",
  order_not_found: "주문 정보를 찾을 수 없어요.",
  amount_mismatch: "결제 금액이 일치하지 않아요.",
  signature_invalid: "결제 데이터 검증에 실패했어요.",
  approve_failed: "결제 승인에 실패했어요.",
  network_error: "결제 처리 중 오류가 발생했어요.",
  server_error: "서버 오류가 발생했어요.",
};

function log(event: string, data: Record<string, unknown>) {
  console.error(
    JSON.stringify({ event, ...data, timestamp: new Date().toISOString() }),
  );
}

function failRedirect(res: VercelResponse, code: string) {
  return res.redirect(302, `/payment-fail?code=${code}`);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    log("callback_error", { reason: "supabase_config_missing" });
    return failRedirect(res, "server_error");
  }

  // 1. 입력값 검증
  const tid = sanitize(req.body?.tid);
  const orderId = sanitize(req.body?.orderId);
  const amount = Math.floor(Number(req.body?.amount));
  const authResultCode = String(req.body?.authResultCode ?? "");
  const authToken = String(req.body?.authToken ?? "");
  const signature = String(req.body?.signature ?? "");

  if (!tid || !orderId || !Number.isFinite(amount) || amount <= 0) {
    log("callback_invalid_input", { tid, orderId, amount });
    return failRedirect(res, "invalid_input");
  }

  // 인증 실패
  if (authResultCode !== "0000") {
    log("callback_auth_failed", {
      orderId,
      authResultCode,
      msg: req.body?.authResultMsg,
    });
    return failRedirect(res, "auth_failed");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 2. DB 주문 조회 + pending 확인
  const { data: order, error: orderError } = await supabase
    .from("payment_orders")
    .select("order_id, amount, credit_amount, status")
    .eq("order_id", orderId)
    .single();

  if (orderError || !order) {
    log("callback_order_not_found", { orderId, error: orderError?.message });
    return failRedirect(res, "order_not_found");
  }

  if (order.status !== "pending") {
    log("callback_already_processed", { orderId, status: order.status });
    // 이미 처리된 주문 — 성공 페이지로 보냄 (멱등)
    return res.redirect(302, `/payment-success?orderId=${orderId}`);
  }

  // 3. 금액 비교
  if (order.amount !== amount) {
    log("callback_amount_mismatch", {
      orderId,
      dbAmount: order.amount,
      callbackAmount: amount,
    });
    await supabase
      .from("payment_orders")
      .update({ status: "failed" })
      .eq("order_id", orderId);
    return failRedirect(res, "amount_mismatch");
  }

  // 4. signature 검증
  const expected = crypto
    .createHash("sha256")
    .update(authToken + NICEPAY_CLIENT_ID + String(amount) + NICEPAY_SECRET_KEY)
    .digest("hex");

  if (signature !== expected) {
    log("callback_signature_invalid", { orderId, tid });
    await supabase
      .from("payment_orders")
      .update({ status: "failed" })
      .eq("order_id", orderId);
    return failRedirect(res, "signature_invalid");
  }

  // 5~6. 승인 API 호출 (8초 타임아웃)
  const credentials = Buffer.from(
    `${NICEPAY_CLIENT_ID}:${NICEPAY_SECRET_KEY}`,
  ).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const approveRes = await fetch(
      `${NICEPAY_API_BASE}/v1/payments/${tid}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    const result = await approveRes.json();

    if (result.resultCode === "0000") {
      // 7. 원자적 크레딧 충전 + 주문 상태 업데이트
      const { error: rpcError } = await supabase.rpc("add_payment_credits", {
        p_order_id: orderId,
        p_credit_amount: order.credit_amount,
      });

      if (rpcError) {
        log("callback_credit_rpc_failed", {
          orderId,
          tid,
          error: rpcError.message,
        });
        // RPC 실패해도 결제는 완료됨 — 수동 확인 필요
      }

      // tid, card_name 저장
      await supabase
        .from("payment_orders")
        .update({ tid, card_name: result.card?.cardName ?? null })
        .eq("order_id", orderId);

      log("callback_success", { orderId, tid, amount });

      const params = new URLSearchParams({
        orderId,
        amount: String(amount),
        credits: String(order.credit_amount),
      });
      return res.redirect(302, `/payment-success?${params.toString()}`);
    }

    // 8. 승인 실패
    log("callback_approve_failed", {
      orderId,
      tid,
      resultCode: result.resultCode,
      resultMsg: result.resultMsg,
    });
    await supabase
      .from("payment_orders")
      .update({ status: "failed" })
      .eq("order_id", orderId);
    return failRedirect(res, "approve_failed");
  } catch (err) {
    clearTimeout(timeout);

    // 9. 타임아웃/네트워크 오류 → 망취소
    log("callback_network_error", {
      orderId,
      tid,
      error: err instanceof Error ? err.message : "unknown",
    });

    try {
      const cancelController = new AbortController();
      const cancelTimeout = setTimeout(() => cancelController.abort(), 8000);
      await fetch(`${NICEPAY_API_BASE}/v1/payments/${tid}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "승인 API 타임아웃 — 망취소",
          orderId,
          cancelAmt: amount,
        }),
        signal: cancelController.signal,
      });
      clearTimeout(cancelTimeout);
      log("callback_net_cancel_success", { orderId, tid });
    } catch (cancelErr) {
      log("callback_net_cancel_failed", {
        orderId,
        tid,
        error: cancelErr instanceof Error ? cancelErr.message : "unknown",
      });
    }

    await supabase
      .from("payment_orders")
      .update({ status: "failed" })
      .eq("order_id", orderId);
    return failRedirect(res, "network_error");
  }
}

/** 에러 코드 → 한국어 메시지 매핑 (프론트엔드에서도 사용) */
export { FAIL_MESSAGES };
