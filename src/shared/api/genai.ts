/**
 * GenAI 클라이언트.
 * - 개발 모드 + VITE_GOOGLE_API_KEY 존재 시: 브라우저에서 직접 Gemini API 호출
 * - 그 외(프로덕션): /api/genai/* 서버 프록시 경유로 API 키 보호
 *
 * 기존 호출 코드(`getGenAI().models.generateContent(...)`)와
 * 동일한 인터페이스를 유지한다.
 */
import { GoogleGenAI } from "@google/genai";
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

// 직접 호출 클라이언트 (개발 모드 전용)
const createDirectClient = (apiKey: string): GenAIClient => {
  const ai = new GoogleGenAI({ apiKey });
  return {
    models: {
      generateContent: (params) =>
        ai.models.generateContent(params as Parameters<typeof ai.models.generateContent>[0]) as Promise<GenAIResponse>,
    },
  };
};

// Vertex AI 로컬 프록시 클라이언트 (개발 전용 — GCP 크레딧 사용)
const createVertexProxyClient = (proxyUrl: string): GenAIClient => ({
  models: {
    generateContent: async (params) => {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          `Vertex proxy error: ${response.status}`;
        throw new Error(message);
      }

      return response.json() as Promise<GenAIResponse>;
    },
  },
});

// 프록시 클라이언트 (프로덕션)
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
  if (!instance) {
    const vertexProxy = import.meta.env.VITE_VERTEX_PROXY_URL as string | undefined;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

    if (vertexProxy && import.meta.env.DEV) {
      // Vertex AI 로컬 프록시 (GCP 크레딧 사용)
      instance = createVertexProxyClient(vertexProxy);
    } else if (apiKey && import.meta.env.DEV) {
      // AI Studio 직접 호출
      instance = createDirectClient(apiKey);
    } else {
      // 프로덕션 프록시
      instance = createProxyClient();
    }
  }
  return instance;
};
