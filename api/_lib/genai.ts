/**
 * 서버 사이드 Google GenAI 클라이언트.
 * GOOGLE_API_KEY(VITE_ 접두사 없음)를 사용하여 API 키가 브라우저에 노출되지 않는다.
 */
import { GoogleGenAI } from "@google/genai";

const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY ?? process.env.VITE_GOOGLE_API_KEY;

let instance: GoogleGenAI | null = null;

export const getServerGenAI = (): GoogleGenAI => {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }
  if (!instance) {
    instance = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  }
  return instance;
};
