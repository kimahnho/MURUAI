/**
 * POST /api/genai/image
 * 이미지 생성 Gemini API 프록시. gemini-2.5-flash-image 모델만 허용.
 * base64 이미지 입출력을 처리한다.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { AuthError, verifyAuth } from "../_lib/auth.js";
import { getServerGenAI } from "../_lib/genai.js";

const ALLOWED_MODELS = ["gemini-2.5-flash-image"];

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

  try {
    const ai = getServerGenAI();
    const response = await ai.models.generateContent({
      model,
      contents,
      config: genConfig,
    });
    return res.status(200).json(response);
  } catch (err) {
    console.error("[/api/genai/image] Gemini API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Gemini API error: ${message}` });
  }
}
