/**
 * POST /api/payment/callback
 * 나이스페이 결제창 인증 완료 후 콜백.
 * Server 승인 모델: 인증 결과 수신 → 위변조 검증 → 승인 API 호출 → 결과 리다이렉트.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const NICEPAY_CLIENT_ID = process.env.NICEPAY_CLIENT_ID ?? "";
const NICEPAY_SECRET_KEY = process.env.NICEPAY_SECRET_KEY ?? "";

// 샌드박스: sandbox-api / 운영: api
const NICEPAY_API_BASE = "https://sandbox-api.nicepay.co.kr";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { authResultCode, tid, orderId, amount, authToken, signature } =
    req.body;

  // 인증 실패
  if (authResultCode !== "0000") {
    const msg = encodeURIComponent(req.body.authResultMsg ?? "인증 실패");
    return res.redirect(302, `/payment-fail?msg=${msg}`);
  }

  // 위변조 검증: sha256(authToken + clientId + amount + secretKey)
  const expected = crypto
    .createHash("sha256")
    .update(authToken + NICEPAY_CLIENT_ID + amount + NICEPAY_SECRET_KEY)
    .digest("hex");

  if (signature !== expected) {
    return res.redirect(
      302,
      `/payment-fail?msg=${encodeURIComponent("위변조 감지")}`,
    );
  }

  // 승인 API 호출 (Basic 인증)
  const credentials = Buffer.from(
    `${NICEPAY_CLIENT_ID}:${NICEPAY_SECRET_KEY}`,
  ).toString("base64");

  try {
    const approveRes = await fetch(
      `${NICEPAY_API_BASE}/v1/payments/${tid}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: Number(amount) }),
      },
    );

    const result = await approveRes.json();

    if (result.resultCode === "0000") {
      // 승인 성공
      const params = new URLSearchParams({
        orderId: orderId ?? "",
        tid: tid ?? "",
        amount: String(amount),
        cardName: result.card?.cardName ?? "",
      });
      return res.redirect(302, `/payment-success?${params.toString()}`);
    }

    // 승인 실패
    const msg = encodeURIComponent(result.resultMsg ?? "승인 실패");
    return res.redirect(302, `/payment-fail?msg=${msg}`);
  } catch (err) {
    // 네트워크 오류 시 망취소 시도
    try {
      await fetch(`${NICEPAY_API_BASE}/v1/payments/${tid}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "승인 API 타임아웃 — 망취소",
          orderId,
          cancelAmt: Number(amount),
        }),
      });
    } catch {
      // 망취소도 실패 — 로그만 남김
    }

    return res.redirect(
      302,
      `/payment-fail?msg=${encodeURIComponent("결제 처리 중 오류가 발생했습니다.")}`,
    );
  }
}
