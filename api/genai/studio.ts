/**
 * POST /api/genai/studio
 * 치료 AI 전용 Gemini 프록시.
 * - JWT 인증 필수
 * - 서버에서 도메인 레퍼런스를 시스템 프롬프트에 주입
 * - 클라이언트에서 systemInstruction을 받지 않음 (서버가 조립)
 * - 입력 안전 검사 (위기 키워드 감지)
 *
 * 보안:
 * - 요청 body 10MB 제한
 * - responseSchema 타입 검증 (객체 또는 null만 허용)
 * - 내부 Gemini 에러 메시지 클라이언트에 미노출
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { AuthError, verifyAuth } from "../_lib/auth.js";
import { getServerGenAI } from "../_lib/genai.js";
import { buildServerSystemPrompt, checkSafety } from "../_lib/studio/buildPrompt.js";

const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 8192;
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

  // 인증
  try {
    await verifyAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Auth verification failed" });
  }

  const {
    contents,
    domain,
    lightweight,
    autoLearnedContext,
    studentDiagnosis,
    studentOverlay,
    therapistOverlay,
    responseSchema,
  } = req.body ?? {};

  if (!contents) {
    return res.status(400).json({ error: "contents is required" });
  }

  // responseSchema 타입 검증 — 객체 또는 null/undefined만 허용
  if (responseSchema !== undefined && responseSchema !== null && typeof responseSchema !== "object") {
    return res.status(400).json({ error: "responseSchema must be an object" });
  }

  // 서버 측 안전 검사 — 마지막 사용자 메시지에서 위기 키워드 감지
  const lastUserMessage = Array.isArray(contents)
    ? contents
        .filter((c: { role?: string }) => c.role === "user")
        .pop()
    : null;
  if (lastUserMessage?.parts?.[0]?.text) {
    const safety = checkSafety(lastUserMessage.parts[0].text);
    if (!safety.isSafe) {
      return res.status(200).json({
        candidates: [{
          content: {
            parts: [{ text: safety.message }],
            role: "model",
          },
        }],
        safetyBlocked: true,
        crisisDetected: safety.crisisDetected,
      });
    }
  }

  // 시스템 프롬프트 조립 (도메인 레퍼런스 주입)
  const systemInstruction = buildServerSystemPrompt({
    domain,
    lightweight: lightweight ?? true,
    autoLearnedContext,
    studentDiagnosis,
    studentOverlay,
    therapistOverlay,
  });

  try {
    const ai = getServerGenAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.5,
        responseMimeType: "application/json",
        ...(responseSchema && { responseSchema }),
      },
    });
    return res.status(200).json(response);
  } catch (err) {
    console.error("[/api/genai/studio] Gemini API error:", err);
    return res.status(502).json({ error: "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
  }
}
