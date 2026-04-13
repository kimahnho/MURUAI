/**
 * POST /api/genai/text
 * 텍스트 전용 Gemini API 프록시. 503 시 폴백 모델로 자동 재시도.
 *
 * 보안:
 * - JWT 인증 필수
 * - 서버 측 크레딧 잔량 확인 (balance > 0) — 단, 텍스트 생성은 크레딧 무료이므로 체크 스킵
 * - config allowlist: responseModalities, temperature, maxOutputTokens, responseMimeType 만 허용
 * - 요청 body 10MB 제한
 * - 내부 Gemini 에러 메시지 클라이언트에 미노출
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { AuthError, verifyAuth } from "../_lib/auth.js";
import { getServerGenAI } from "../_lib/genai.js";

const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-3.1-flash-lite-preview"];
const FALLBACK_MODEL = "gemini-2.5-flash";
const ALLOWED_CONFIG_KEYS = new Set([
  "responseModalities",
  "temperature",
  "maxOutputTokens",
  "responseMimeType",
]);
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB

export const config = {
  maxDuration: 60,
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

  try {
    await verifyAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Auth verification failed" });
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

  const ai = getServerGenAI();
  const configParam = Object.keys(safeConfig).length > 0 ? { config: safeConfig } : {};

  // 1차 시도
  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      ...configParam,
    });
    return res.status(200).json(response);
  } catch (err) {
    const is503 = err instanceof Error && (err.message.includes("503") || err.message.includes("UNAVAILABLE") || err.message.includes("429"));

    // 503이고 폴백 모델이 다르면 재시도
    if (is503 && model !== FALLBACK_MODEL) {
      console.warn(`[/api/genai/text] ${model} 503 → ${FALLBACK_MODEL}로 폴백`);
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents,
          ...configParam,
        });
        return res.status(200).json(fallbackResponse);
      } catch (fallbackErr) {
        console.error("[/api/genai/text] 폴백도 실패:", fallbackErr);
        return res.status(502).json({ error: "텍스트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
      }
    }

    console.error("[/api/genai/text] Gemini API error:", err);
    return res.status(502).json({ error: "텍스트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
  }
}
