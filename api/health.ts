/**
 * GET /api/health — 서버리스 함수 동작 확인 + 패키지 import 테스트
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = { server: "ok" };

  // @google/genai import 테스트
  try {
    const { GoogleGenAI } = await import("@google/genai");
    checks.genai = GoogleGenAI ? "ok" : "fail";
  } catch (e) {
    checks.genai = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // @supabase/supabase-js import 테스트
  try {
    const { createClient } = await import("@supabase/supabase-js");
    checks.supabase = createClient ? "ok" : "fail";
  } catch (e) {
    checks.supabase = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 환경변수 존재 여부
  checks.google_api_key = process.env.GOOGLE_API_KEY ? "set" : "missing";
  checks.supabase_url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL) ? "set" : "missing";
  checks.supabase_key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY) ? "set" : "missing";

  return res.status(200).json({ timestamp: Date.now(), checks });
}
