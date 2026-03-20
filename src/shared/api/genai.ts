/**
 * GenAI 프록시 클라이언트.
 * 브라우저에서 직접 Gemini API를 호출하지 않고,
 * /api/genai/* 서버 라우트를 경유하여 API 키를 보호한다.
 *
 * 기존 호출 코드(`getGenAI().models.generateContent(...)`)와
 * 동일한 인터페이스를 유지한다.
 */
import { supabase } from "@/shared/api/supabase";

/** 기존 GoogleGenAI와 호환되는 프록시 타입 */
export type GenAIClient = {
  models: {
    generateContent: (params: {
      model: string;
      contents: unknown;
      config?: unknown;
    }) => Promise<GenAIResponse>;
  };
};

/** Gemini API 응답 타입 (프록시 경유 시 동일한 구조) */
export type GenAIResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }>;
    };
  }>;
};

const createProxyClient = (): GenAIClient => ({
  models: {
    generateContent: async (params) => {
      const isImageModel = params.model.includes("image");
      const endpoint = isImageModel ? "/api/genai/image" : "/api/genai/text";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          model: params.model,
          contents: params.contents,
          config: params.config,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { error?: string }).error ??
          `API proxy error: ${response.status}`;
        throw new Error(message);
      }

      return response.json() as Promise<GenAIResponse>;
    },
  },
});

let instance: GenAIClient | null = null;

export const getGenAI = (): GenAIClient => {
  if (!instance) instance = createProxyClient();
  return instance;
};
