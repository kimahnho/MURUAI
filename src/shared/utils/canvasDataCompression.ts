/**
 * canvas_data gzip 압축/해제 유틸리티.
 * 저장 시 JSON → gzip → base64 문자열로 압축하고,
 * 로드 시 압축 여부를 자동 감지하여 CanvasDocument로 복원한다.
 */
import pako from "pako";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";

const GZIP_PREFIX = "__gzip:";

/** CanvasDocument → gzip 압축 base64 문자열 */
export const compressCanvasData = (data: unknown): string => {
  const json = JSON.stringify(data);
  const compressed = pako.gzip(json);
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  return GZIP_PREFIX + btoa(binary);
};

/** 압축/비압축 canvas_data → CanvasDocument | null. 기존 JSONB 객체, JSON 문자열, 압축 문자열 모두 처리 */
export const decompressCanvasData = (
  value: unknown,
): CanvasDocument | null => {
  if (!value) return null;
  try {
    // 기존 JSONB 객체 (비압축)
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      return Array.isArray(obj.pages) ? (value as CanvasDocument) : null;
    }
    if (typeof value === "string") {
      // gzip 압축 문자열
      if (value.startsWith(GZIP_PREFIX)) {
        const base64 = value.slice(GZIP_PREFIX.length);
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const json = pako.inflate(bytes, { to: "string" });
        const parsed = JSON.parse(json) as Record<string, unknown>;
        return Array.isArray(parsed.pages) ? (parsed as CanvasDocument) : null;
      }
      // 비압축 JSON 문자열 (기존 호환)
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return Array.isArray(parsed.pages) ? (parsed as CanvasDocument) : null;
    }
  } catch {
    return null;
  }
  return null;
};
