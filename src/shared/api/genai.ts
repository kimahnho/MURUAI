/**
 * GenAI 클라이언트.
 * - 개발 모드 + VITE_GOOGLE_API_KEY: 브라우저에서 Gemini 직접 호출
 * - 개발 모드 + VITE_VERTEX_PROXY_URL: 로컬 Vertex 프록시 경유 (GCP 크레딧)
 * - 프로덕션: /api/genai/* 서버 프록시 경유로 API 키 보호
 *
 * 기존 호출 코드(`getGenAI().models.generateContent(...)`)와
 * 동일한 인터페이스를 유지한다.
 */
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/shared/api/supabase";

/** 텍스트 모델: 우선 3.1 flash lite, 503 시 2.5 flash 폴백 */
export const TEXT_MODEL_PRIMARY = "gemini-3.1-flash-lite-preview";
export const TEXT_MODEL_FALLBACK = "gemini-2.5-flash";

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

/** 서버 에러(503/429/500 등) 감지 */
const isRetryableError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  const status = (error as { status?: number }).status;
  return (
    msg.includes("503") || msg.includes("429") || msg.includes("500") ||
    msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("overloaded") || msg.includes("Service Unavailable") ||
    status === 503 || status === 429 || status === 500
  );
};

/** 텍스트 모델(이미지 아닌 것)이면 503/429 시 폴백 모델로 자동 재시도 */
const withTextModelFallback = (client: GenAIClient): GenAIClient => {
  const original = client.models.generateContent.bind(client.models);
  return {
    models: {
      generateContent: async (params) => {
        const isImageModel = params.model.includes("image");
        try {
          return await original(params);
        } catch (error) {
          if (!isImageModel && isRetryableError(error)) {
            console.warn(`${params.model} 실패, ${TEXT_MODEL_FALLBACK}으로 폴백`);
            return original({ ...params, model: TEXT_MODEL_FALLBACK });
          }
          throw error;
        }
      },
    },
  };
};

// 개발 모드 + API 키: 브라우저에서 Gemini SDK 직접 호출
const createDirectClient = (apiKey: string): GenAIClient => {
  const ai = new GoogleGenAI({ apiKey });
  return {
    models: {
      generateContent: async (params) => {
        const response = await ai.models.generateContent({
          model: params.model,
          contents: params.contents as string,
          config: params.config as Record<string, unknown> | undefined,
        });
        return response as unknown as GenAIResponse;
      },
    },
  };
};

let instance: GenAIClient | null = null;

export const getGenAI = (): GenAIClient => {
  if (!instance) {
    const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
    const vertexProxy = import.meta.env.VITE_VERTEX_PROXY_URL as string | undefined;

    let base: GenAIClient;
    if (import.meta.env.DEV && googleApiKey) {
      // 개발 모드: 브라우저에서 Gemini 직접 호출 (API 프록시 불필요)
      base = createDirectClient(googleApiKey);
    } else if (vertexProxy && import.meta.env.DEV) {
      base = createVertexProxyClient(vertexProxy);
    } else {
      base = createProxyClient();
    }
    instance = withTextModelFallback(base);
  }
  return instance;
};
