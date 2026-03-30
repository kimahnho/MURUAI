/**
 * 학습지 이미지 생성 — Gemini 2.5 Flash Image로 A4 학습지 이미지 5장 생성.
 * 각 WorksheetSuggestion에 대해 완성된 학습지 페이지 이미지를 생성한다.
 */
import type { WorksheetSuggestion, TherapyDomain } from "../model/therapyTypes";
import { THERAPY_DOMAIN_LABELS } from "../model/therapyTypes";
import { getGenAI } from "@/shared/api/genai";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const IMAGE_MODEL = "gemini-2.5-flash-image";

// ── 아트 스타일 (Style A: Flat Illustration — 기본) ──

const ART_STYLE = `Clean, flat Korean children's educational illustration style.
Thick black outlines (2-3px). Solid bright colors with minimal shading.
Pure white background that extends to ALL edges — NO borders, NO frames, NO margins, NO decorative outlines.
Rounded, friendly shapes.
No text, labels, numbers, or symbols in the image.
No 3D rendering, no anime, no watermarks.
The image must fill the ENTIRE canvas edge-to-edge with NO visible border or frame of any kind.`;

// ── 활동 유형별 레이아웃 힌트 ──

const LAYOUT_HINTS: Record<string, string> = {
  findSame: "A reference image on the left, 3-4 candidate images on the right arranged in a grid. One matches exactly.",
  matchPairs: "Two columns. Left column has 3-4 items. Right column has matching items in different order. Dotted lines connect them.",
  spotDifference: "Two nearly identical scenes side by side. 3-5 subtle differences between them.",
  categorize: "6-8 objects scattered in the center. Two labeled baskets/boxes at the bottom for sorting.",
  emotionInference: "A scene showing a child in a situation (center). Below: 4 emotion face choices in a row.",
  lineConnect: "Two columns of items. Left and right columns should be connected by drawing lines.",
  sequencing: "4-5 scene cards arranged in a row showing a sequence of events. Numbers below each card.",
};

// ── 단일 학습지 이미지 생성 ──

async function generateSingleImage(
  sheet: WorksheetSuggestion,
  domain: TherapyDomain,
): Promise<string> {
  const ai = getGenAI();
  const layoutHint = LAYOUT_HINTS[sheet.worksheetType] ?? "Activity items arranged clearly on the page.";
  const domainLabel = THERAPY_DOMAIN_LABELS[domain];

  const prompt = `Generate a COMPLETE A4 educational worksheet page image that fills the ENTIRE canvas.
Portrait orientation (3:4 aspect ratio, like 210×297mm). Pure white background extending to ALL edges. Print-ready.
The content must fill the full page — no empty margins, no page border effect.

Domain: ${domainLabel} (${domain})
Title: "${sheet.title}"
Activity: ${sheet.description}
Difficulty: ${sheet.difficulty}
Number of items: ${sheet.itemCount}

${ART_STYLE}

PAGE LAYOUT:
=== TOP AREA (15% of page) ===
Leave empty white space for title text overlay.

=== MAIN CONTENT AREA (55-70% of page) ===
${layoutHint}
- Use ${sheet.itemCount} items appropriate for ${sheet.difficulty} difficulty.
- All illustrations should be simple, clear, and child-friendly.
- Objects should be large enough for young children to identify.

=== BOTTOM AREA (15-30% of page) ===
Response area: dotted lines or circles for marking answers.
Leave space for name/date field.

CRITICAL RULES:
- No text anywhere in the image. No Korean or English characters. Only illustrations.
- No border, frame, or outline around the page. The white background must extend to all edges.
- No drop shadow or page-like framing effect. The image IS the page, not a picture of a page.`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["Text", "Image"],
          imageConfig: { aspectRatio: "3:4" },
        },
      });

      // base64 이미지 추출
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inline = (part as { inlineData?: { data: string; mimeType: string } }).inlineData;
        if (inline?.data) {
          return inline.data;
        }
      }
      throw new Error("이미지가 생성되지 않았습니다.");
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw new Error("Unreachable");
}

// ── Cloudinary 업로드 ──

async function uploadToCloudinary(base64Data: string, userId: string): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    // Cloudinary 미설정 시 data URL 반환
    return `data:image/png;base64,${base64Data}`;
  }

  const formData = new FormData();
  formData.append("file", `data:image/png;base64,${base64Data}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `muru_therapy_worksheet/${userId}`);
  formData.append("public_id", crypto.randomUUID());

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) throw new Error("Cloudinary 업로드 실패");

  const payload = (await response.json()) as { public_id: string; format?: string };
  const ext = payload.format ?? "png";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${payload.public_id}.${ext}`;
}

// ── 메인: 5장 학습지 이미지 생성 ──

export async function generateWorksheetImages(
  sheets: WorksheetSuggestion[],
  domain: TherapyDomain,
  userId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  const total = sheets.length;
  const base64Images: string[] = [];

  // Phase 1: 순차 이미지 생성
  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);
    const base64 = await generateSingleImage(sheets[i], domain);
    base64Images.push(base64);
  }

  // Phase 2: Cloudinary 일괄 업로드
  const urls = await Promise.all(
    base64Images.map((b64) => uploadToCloudinary(b64, userId)),
  );

  return urls;
}
