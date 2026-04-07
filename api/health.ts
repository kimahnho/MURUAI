/**
 * GET /api/health — 서버리스 함수 동작 확인 (인프라 정보 노출 금지)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: "ok", timestamp: Date.now() });
}
