/**
 * 각 페이지의 sceneDescription을 영문 번역 후 그림체 프롬프트와 조합하여
 * Gemini 이미지 모델로 삽화를 생성하고 Cloudinary에 업로드하는 모듈.
 */
import { GoogleGenAI } from "@google/genai";

import { supabase } from "@/shared/api/supabase";
import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";

import type { ArtStyleId, PageLayout } from "../model/storybookTypes";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";

const GOOGLE_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
);

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

// ─── Cloudinary 업로드 (useAiImageGeneration 패턴 복사) ───

const getCloudinaryUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
};

const uploadToCloudinary = async (
  base64Data: string,
  userId: string,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  const folder = `muru_storybook_gen/${userId}`;

  formData.append("file", `data:image/png;base64,${base64Data}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload to Cloudinary");
  }

  const payload = (await response.json()) as {
    public_id: string;
    format?: string;
  };

  return payload.format
    ? `${payload.public_id}.${payload.format}`
    : payload.public_id;
};

// ─── 한→영 번역 (10개 장면 일괄) ───

const translateScenesToEnglish = async (
  ai: GoogleGenAI,
  scenes: string[],
): Promise<string[]> => {
  const prompt = `Translate each Korean scene description to concise English for an image generation prompt. Return a JSON array of strings only, no explanation.

Input:
${JSON.stringify(scenes)}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseModalities: ["Text"],
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.text,
  )?.text;
  if (!text) throw new Error("번역 응답이 없습니다.");

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("번역 JSON을 찾을 수 없습니다.");

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  return parsed.map((item) => (typeof item === "string" ? item : String(item)));
};

// ─── 단일 페이지 이미지 생성 ───

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// 그룹 후속 장면에서 일관성 유지를 위한 레퍼런스 프롬프트 접미어
const CONSISTENCY_SUFFIX =
  "Maintain the same character appearance, art style, and background setting as the reference image. Only change the character's pose and expression to match the new scene description.";

// 최대 3회 재시도 + 재시도 간 2초 지연으로 간헐적 빈 응답 대응
const generateSingleImage = async (
  ai: GoogleGenAI,
  imagePrompt: string,
  aspectRatio: string,
  referenceBase64?: string,
): Promise<string> => {
  // 레퍼런스 이미지가 있으면 inlineData + 일관성 프롬프트 추가
  const contents = referenceBase64
    ? [
        { inlineData: { mimeType: "image/png" as const, data: referenceBase64 } },
        { text: `${imagePrompt}\n\n${CONSISTENCY_SUFFIX}` },
      ]
    : imagePrompt;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents,
      config: {
        responseModalities: ["Text", "Image"],
        imageConfig: {
          aspectRatio,
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((part) => part.inlineData);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
  }

  throw new Error("No image generated after retries");
};

// ─── 메인 함수 ───

/**
 * 10페이지 삽화를 순차 생성하여 Cloudinary URL 배열을 반환한다.
 * Phase 1: 모든 이미지를 base64로 수집 (하나라도 실패 시 throw — Cloudinary 비용 발생 안 함)
 * Phase 2: 전부 성공 후 일괄 Cloudinary 업로드
 */
export const generateStoryImages = async (
  pages: Array<{ sceneDescription: string; sceneGroup: number }>,
  artStyleId: ArtStyleId,
  layout: PageLayout,
  referenceImageBase64?: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> => {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key is not configured");
  }

  const preset = ART_STYLE_PRESETS.find((p) => p.id === artStyleId);
  if (!preset) {
    throw new Error(`Unknown art style: ${artStyleId}`);
  }

  // 사용자 인증 확인
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

  // 10개 장면을 한 번에 영문 번역
  const koreanScenes = pages.map((p) => p.sceneDescription);
  let englishScenes: string[];
  try {
    englishScenes = await translateScenesToEnglish(ai, koreanScenes);
  } catch (error) {
    console.error("Scene translation failed, using Korean descriptions:", error);
    englishScenes = koreanScenes;
  }

  // 프롬프트 조합: [영문 장면] + ", " + [promptTemplate]
  const stylePostfix = preset.promptTemplate;
  const aspectRatio = layout === "horizontal" ? "3:4" : "16:9";

  // ── Phase 1: sceneGroup 기반 그룹별 순차 생성 ──
  const base64Images: string[] = new Array(pages.length);
  const groupFirstImages = new Map<number, string>();
  let completedCount = 0;

  // sceneGroup → 원본 인덱스 배열로 그룹핑
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < pages.length; i++) {
    const group = pages[i].sceneGroup;
    const indices = groupMap.get(group) ?? [];
    indices.push(i);
    groupMap.set(group, indices);
  }

  for (const indices of groupMap.values()) {
    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const scene = englishScenes[idx] ?? koreanScenes[idx];
      const imagePrompt = `${scene}, ${stylePostfix}`;
      const isGroupFirst = j === 0;

      // 그룹 첫 장: 캐릭터 레퍼런스 사용, 후속: 그룹 첫 장 생성 이미지 사용
      const reference = isGroupFirst
        ? referenceImageBase64
        : groupFirstImages.get(pages[idx].sceneGroup);

      const base64 = await generateSingleImage(ai, imagePrompt, aspectRatio, reference);
      base64Images[idx] = base64;

      if (isGroupFirst) {
        groupFirstImages.set(pages[idx].sceneGroup, base64);
      }

      completedCount++;
      onProgress?.(completedCount, pages.length);
    }
  }

  // ── Phase 2: 일괄 Cloudinary 업로드 ──
  const imageUrls: string[] = [];

  for (const base64 of base64Images) {
    const imagePath = await uploadToCloudinary(base64, userId);
    const imageUrl = getCloudinaryUrl(imagePath);
    imageUrls.push(imageUrl);
  }

  return imageUrls;
};
