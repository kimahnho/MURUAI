/**
 * POST /api/genai/text
 * 텍스트 전용 Gemini API 프록시. 503 시 폴백 모델로 자동 재시도.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { AuthError, verifyAuth } from "../_lib/auth.js";
import { getServerGenAI } from "../_lib/genai.js";

const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-3.1-flash-lite-preview"];
const FALLBACK_MODEL = "gemini-2.5-flash";

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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

  if (!ALLOWED_MODELS.includes(model)) {
    return res
      .status(400)
      .json({ error: `Model not allowed. Use: ${ALLOWED_MODELS.join(", ")}` });
  }

  const ai = getServerGenAI();
  const configParam = genConfig && Object.keys(genConfig).length > 0 ? { config: genConfig } : {};

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
        const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : "Unknown error";
        return res.status(502).json({ error: `Gemini API error (fallback): ${fallbackMessage}` });
      }
    }

    console.error("[/api/genai/text] Gemini API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Gemini API error: ${message}` });
  }
}
