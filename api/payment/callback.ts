/**
 * POST /api/payment/callback
 * 나이스페이 결제창 인증 완료 후 콜백 (Server 승인 모델).
 *
 * 엣지케이스 대응:
 * - 이중 콜백 → pending→processing 낙관적 잠금으로 1건만 통과
 * - RPC 실패 → credit_pending 상태 저장 + 에러 페이지 (성공 아님)
 * - tid 저장 실패 → 크레딧 충전 전에 tid 먼저 저장
 * - JSON 파싱 에러 → try-catch로 보호
 * - 망취소 실패 → requires_review 상태 저장
 * - 환경변수 누락 → 즉시 500 반환
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// 환경변수 즉시 검증
const NICEPAY_CLIENT_ID = process.env.NICEPAY_CLIENT_ID;
const NICEPAY_SECRET_KEY = process.env.NICEPAY_SECRET_KEY;
const NICEPAY_API_BASE =
  process.env.NICEPAY_API_BASE ?? "https://sandbox-api.nicepay.co.kr";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 영숫자 + 하이픈/밑줄만 허용
const sanitize = (val: unknown): string =>
  String(val ?? "").replace(/[^a-zA-Z0-9_-]/g, "");

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

  // 환경변수 검증 — 빈 문자열로 진행하지 않고 즉시 실패
  if (!NICEPAY_CLIENT_ID || !NICEPAY_SECRET_KEY) {
    log("callback_error", { reason: "nicepay_credentials_missing" });
    return failRedirect(res, "server_error");
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

  // 2. 낙관적 잠금: pending → processing 원자적 전환
  //    두 번째 콜백은 이 UPDATE가 0행 영향 → 이중 충전 차단
  const { data: locked, error: lockError } = await supabase
    .from("payment_orders")
    .update({ status: "processing" })
    .eq("order_id", orderId)
    .eq("status", "pending")
    .select("order_id, amount, credit_amount")
    .single();

  if (lockError || !locked) {
    // 이미 처리 중이거나 완료된 주문
    const { data: existing } = await supabase
      .from("payment_orders")
      .select("status")
      .eq("order_id", orderId)
      .single();

    if (existing?.status === "paid") {
      log("callback_already_paid", { orderId });
      return res.redirect(302, `/payment-success?orderId=${orderId}`);
    }

    log("callback_lock_failed", {
      orderId,
      currentStatus: existing?.status,
      error: lockError?.message,
    });
    return failRedirect(res, "order_not_found");
  }

  // 3. 금액 비교
  if (locked.amount !== amount) {
    log("callback_amount_mismatch", {
      orderId,
      dbAmount: locked.amount,
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

  // 5. 승인 API 호출 (8초 타임아웃)
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

    // JSON 파싱 보호
    let result: Record<string, unknown>;
    try {
      result = await approveRes.json();
    } catch {
      log("callback_json_parse_error", { orderId, tid });
      await supabase
        .from("payment_orders")
        .update({ status: "failed" })
        .eq("order_id", orderId);
      return failRedirect(res, "approve_failed");
    }

    if (result.resultCode === "0000") {
      // 6. tid/card_name 먼저 저장 (환불 시 tid 필수)
      const { error: tidError } = await supabase
        .from("payment_orders")
        .update({
          tid,
          card_name: (result.card as Record<string, string>)?.cardName ?? null,
        })
        .eq("order_id", orderId);

      if (tidError) {
        log("callback_tid_save_failed", {
          orderId,
          tid,
          error: tidError.message,
        });
        // tid 저장 실패 → 환불 불가능해지므로 진행 중단
        await supabase
          .from("payment_orders")
          .update({ status: "requires_review" })
          .eq("order_id", orderId);
        return failRedirect(res, "server_error");
      }

      // 7. 원자적 크레딧 충전 (RPC: processing → paid + balance 증가)
      const { error: rpcError } = await supabase.rpc("add_payment_credits", {
        p_order_id: orderId,
        p_credit_amount: locked.credit_amount,
      });

      if (rpcError) {
        log("callback_credit_rpc_failed", {
          orderId,
          tid,
          error: rpcError.message,
        });
        // 결제는 완료됐지만 크레딧 미충전 → credit_pending (관리자 확인 필요)
        await supabase
          .from("payment_orders")
          .update({ status: "credit_pending" })
          .eq("order_id", orderId);
        return failRedirect(res, "credit_failed");
      }

      log("callback_success", { orderId, tid, amount });

      const params = new URLSearchParams({
        orderId,
        amount: String(amount),
        credits: String(locked.credit_amount),
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

    // 9. 타임아웃/네트워크 오류 → 망취소 (유효기간 1시간)
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

      await supabase
        .from("payment_orders")
        .update({ status: "failed" })
        .eq("order_id", orderId);
    } catch (cancelErr) {
      // 망취소도 실패 → requires_review (관리자 수동 확인 필요)
      log("callback_net_cancel_failed", {
        orderId,
        tid,
        error: cancelErr instanceof Error ? cancelErr.message : "unknown",
      });
      await supabase
        .from("payment_orders")
        .update({ status: "requires_review" })
        .eq("order_id", orderId);
    }

    return failRedirect(res, "network_error");
  }
}
