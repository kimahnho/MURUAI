/**
 * POST /api/genai/image
 * 이미지 생성 Gemini API 프록시. gemini-2.5-flash 모델만 허용.
 * base64 이미지 입출력을 처리한다.
 *
 * 보안:
 * - JWT 인증 필수
 * - 서버 측 크레딧 잔량 확인 (balance > 0)
 * - config allowlist: responseModalities 만 허용
 * - 요청 body 10MB 제한
 * - 내부 Gemini 에러 메시지 클라이언트에 미노출
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

import { AuthError, verifyAuth } from "../_lib/auth.js";
import { getServerGenAI } from "../_lib/genai.js";

const ALLOWED_MODELS = ["gemini-2.5-flash-image"];
const ALLOWED_CONFIG_KEYS = new Set(["responseModalities"]);
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB

export const config = {
  maxDuration: 120,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 요청 body 크기 제한
  const bodySize = JSON.stringify(req.body ?? {}).length;
  if (bodySize > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "요청 크기가 너무 큽니다." });
  }

  // 인증 + userId 추출
  let userId: string;
  try {
    const auth = await verifyAuth(req);
    userId = auth.userId;
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Auth verification failed" });
  }

  // 서버 측 크레딧 잔량 확인
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    const sb = createClient(supabaseUrl, supabaseServiceKey);
    const { data: creditRow } = await sb
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .single();
    const balance: number = (creditRow as { balance: number } | null)?.balance ?? 0;
    if (balance <= 0) {
      return res.status(429).json({ error: "AI 크레딧이 부족합니다. 관리자에게 추가 요청해 주세요." });
    }
  }

  const { model, contents, config: genConfig } = req.body ?? {};

  if (!model || !contents) {
    return res.status(400).json({ error: "model and contents are required" });
  }

  if (!ALLOWED_MODELS.includes(model as string)) {
    return res
      .status(400)
      .json({ error: `Model not allowed. Use: ${ALLOWED_MODELS.join(", ")}` });
  }

  // config allowlist — 허용된 키만 통과
  const safeConfig: Record<string, unknown> = {};
  if (genConfig && typeof genConfig === "object") {
    for (const key of ALLOWED_CONFIG_KEYS) {
      if (key in (genConfig as Record<string, unknown>)) {
        safeConfig[key] = (genConfig as Record<string, unknown>)[key];
      }
    }
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const ai = getServerGenAI();
      const response = await ai.models.generateContent({
        model,
        contents,
        config: Object.keys(safeConfig).length > 0 ? safeConfig : undefined,
      });
      return res.status(200).json(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const isRetryable = message.includes("503") || message.includes("429") || message.includes("UNAVAILABLE") || message.includes("overloaded");
      console.error(`[/api/genai/image] attempt ${attempt + 1}/${MAX_RETRIES}:`, message);

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }

      return res.status(502).json({ error: "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    }
  }
}
