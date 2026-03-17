/**
 * Google GenAI 클라이언트 팩토리.
 * 프로젝트 전체에서 단일 인스턴스를 공유한다.
 */
import { GoogleGenAI } from "@google/genai";

import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";

const GOOGLE_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
);

let instance: GoogleGenAI | null = null;

export const getGenAI = (): GoogleGenAI => {
  if (!GOOGLE_API_KEY) throw new Error("Google API key is not configured");
  if (!instance) instance = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  return instance;
};
