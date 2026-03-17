/**
 * Google GenAI 클라이언트 팩토리.
 * 프로젝트 전체에서 단일 인스턴스를 공유한다.
 *
 * 브라우저 환경에서는 Vertex AI project/location 기반 인증이 불가하므로
 * API Key만으로 초기화한다.
 */
import { GoogleGenAI } from "@google/genai";

import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";

// ── 기존 Google AI (Gemini API) 초기화 ──
// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );
// let instance: GoogleGenAI | null = null;
// export const getGenAI = (): GoogleGenAI => {
//   if (!GOOGLE_API_KEY) throw new Error("Google API key is not configured");
//   if (!instance) instance = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
//   return instance;
// };

// ── Vertex AI 초기화 (API Key 인증 — 브라우저 호환) ──
// 참고: 브라우저에서는 project/location 기반 인증이 불가하므로 apiKey만 사용.
// project/location은 서버사이드(Node.js) 전용.
const GCP_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GCP_API_KEY as string | undefined,
);

let instance: GoogleGenAI | null = null;

export const getGenAI = (): GoogleGenAI => {
  if (!GCP_API_KEY) {
    throw new Error(
      "GCP API key is not configured (VITE_GCP_API_KEY)",
    );
  }
  if (!instance) {
    instance = new GoogleGenAI({
      apiKey: GCP_API_KEY,
    });
  }
  return instance;
};
