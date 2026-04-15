/**
 * POST /api/payment/create-order
 * 서버에서 주문을 생성하고 고정 가격을 반환한다.
 * 클라이언트는 productId만 보내고, 금액은 서버가 결정 — 금액 변조 원천 차단.
 *
 * 엣지케이스 대응:
 * - 좀비 주문 정리: 30분 이상된 pending 주문 자동 expired 처리
 * - 환경변수 누락 시 즉시 실패
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { AuthError, verifyAuth } from "../_lib/auth.js";
import { findPackage } from "../_lib/paymentProducts.js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NICEPAY_CLIENT_ID = process.env.NICEPAY_CLIENT_ID;

// 30분 이상된 pending 주문은 좀비 — 자동 만료
const PENDING_EXPIRE_MINUTES = 30;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 환경변수 검증
  if (!supabaseUrl || !supabaseServiceKey || !NICEPAY_CLIENT_ID) {
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
  const productId = String(req.body?.productId ?? "");
  const pkg = findPackage(productId);
  if (!pkg) {
    return res.status(400).json({ error: "유효하지 않은 상품입니다." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 좀비 주문 정리: 이 사용자의 30분 이상된 pending 주문을 expired로 변경
  const expireCutoff = new Date(
    Date.now() - PENDING_EXPIRE_MINUTES * 60 * 1000,
  ).toISOString();

  await supabase
    .from("payment_orders")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", expireCutoff);

  // 주문 생성
  const orderId = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from("payment_orders")
    .insert({
      user_id: userId,
      order_id: orderId,
      product_id: pkg.id,
      product_name: pkg.name,
      credit_amount: pkg.credits,
      amount: pkg.price,
      status: "pending",
    });

  if (insertError) {
    console.error("[create-order] DB insert failed:", insertError);
    return res.status(500).json({ error: "주문 생성에 실패했습니다." });
  }

  return res.status(200).json({
    orderId,
    amount: pkg.price,
    goodsName: pkg.name,
    clientId: NICEPAY_CLIENT_ID,
  });
}
