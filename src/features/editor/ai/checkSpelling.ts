/**
 * Gemini 2.5 Flash를 사용해 한국어 맞춤법/띄어쓰기/문법을 검사하는 모듈.
 */
import { GoogleGenAI } from "@google/genai";
import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import type { TextItem } from "../utils/spellCheckTextExtractor";

const GOOGLE_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
);

export type SpellCorrection = {
  original: string;
  corrected: string;
  reason: string;
};

export type SpellCheckResult = {
  elementId: string;
  pageId: string;
  pageNumber: number;
  field: string;
  corrections: SpellCorrection[];
};

// AI 응답의 raw 형태 (id 필드를 사용)
type RawSpellResult = {
  id: string;
  pageId: string;
  field: string;
  corrections: SpellCorrection[];
};

const BATCH_SIZE = 50;

// GoogleGenAI 인스턴스 lazy 초기화
let genAiInstance: GoogleGenAI | null = null;
const getGenAI = (): GoogleGenAI => {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key is not configured");
  }
  if (!genAiInstance) {
    genAiInstance = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  }
  return genAiInstance;
};

const buildPrompt = (items: TextItem[]) =>
  `당신은 한국어 맞춤법, 띄어쓰기, 문법 검사 전문가입니다.

아래 텍스트 목록의 맞춤법, 띄어쓰기, 문법을 검사해주세요.
수정이 필요한 항목만 JSON 배열로 출력하세요. 수정할 내용이 없으면 빈 배열 []을 출력하세요.

[텍스트 목록]
${items.map((item) => JSON.stringify({ id: item.elementId, pageId: item.pageId, field: item.field, text: item.text })).join("\n")}

[출력 형식 — 수정이 필요한 항목만, JSON만 출력 (설명/마크다운 없음)]
[
  {
    "id": "요소ID",
    "pageId": "페이지ID",
    "field": "필드명",
    "corrections": [
      { "original": "틀린 부분", "corrected": "올바른 부분", "reason": "사유 (예: 맞춤법, 띄어쓰기, 문법)" }
    ]
  }
]`;

const isValidRawResult = (item: unknown): item is RawSpellResult => {
  if (typeof item !== "object" || item === null) return false;
  const rec = item as Record<string, unknown>;
  if (typeof rec.id !== "string" || typeof rec.pageId !== "string") return false;
  if (typeof rec.field !== "string") return false;
  if (!Array.isArray(rec.corrections) || rec.corrections.length === 0) return false;
  return rec.corrections.every((c: unknown) => {
    if (typeof c !== "object" || c === null) return false;
    const cr = c as Record<string, unknown>;
    return (
      typeof cr.original === "string" &&
      typeof cr.corrected === "string" &&
      typeof cr.reason === "string"
    );
  });
};

const parseResponse = (raw: string, itemsMap: Map<string, TextItem>): SpellCheckResult[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  let parsed: unknown[];
  try {
    parsed = JSON.parse(jsonMatch[0]) as unknown[];
  } catch {
    console.error("[checkSpelling] AI 응답 JSON 파싱 실패:", jsonMatch[0]);
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(isValidRawResult)
    .map((rawItem) => {
      const sourceItem = itemsMap.get(`${rawItem.id}::${rawItem.field}`);
      return {
        elementId: rawItem.id,
        pageId: rawItem.pageId,
        pageNumber: sourceItem?.pageNumber ?? 0,
        field: rawItem.field,
        corrections: rawItem.corrections,
      };
    });
};

const callGemini = async (items: TextItem[]): Promise<SpellCheckResult[]> => {
  const ai = getGenAI();

  // elementId + field → TextItem 매핑 (pageNumber 조회용)
  const itemsMap = new Map<string, TextItem>();
  for (const item of items) {
    itemsMap.set(`${item.elementId}::${item.field}`, item);
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(items),
    config: { responseModalities: ["Text"] },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) return [];

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) return [];

  return parseResponse(textPart.text, itemsMap);
};

export const checkSpelling = async (
  items: TextItem[],
): Promise<SpellCheckResult[]> => {
  if (items.length === 0) return [];

  if (items.length <= BATCH_SIZE) {
    return callGemini(items);
  }

  const batches: TextItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(batches.map(callGemini));
  return results.flat();
};
