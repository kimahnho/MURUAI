/**
 * 각 페이지의 sceneDescription을 영문 번역 후 그림체 프롬프트와 조합하여
 * Gemini 이미지 모델로 삽화를 생성하고 Cloudinary에 업로드하는 모듈.
 */
import type { GenAIClient } from "@/shared/api/genai";
import { captureSentryError } from "@/shared/utils/sentryUtils";

import { supabase } from "@/shared/api/supabase";
// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";

import type { ArtStyleId, PageLayout } from "../model/storybookTypes";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

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
  ai: GenAIClient,
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

// ─── 단일 페이지 이미지 생성 (듀얼 레퍼런스) ───

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// 캐릭터 레퍼런스만 있을 때 (sceneGroup 첫 페이지)
const CHARACTER_ONLY_SUFFIX = `The attached image is the character reference for this story.
Preserve this character's exact face, hair, clothing, body proportions, and overall appearance.
Draw the character in the new scene described above, keeping the art style consistent.`;

// 캐릭터 레퍼런스 + 장면 앵커 둘 다 있을 때 (sceneGroup 후속 페이지)
const DUAL_REF_SUFFIX = `Two reference images are attached.
The FIRST image is the character reference — preserve this character's exact face, hair, clothing, and proportions.
The SECOND image is a previous scene from the same location — maintain the same background environment, lighting, color temperature, and atmosphere.
Only change the character's action and expression as the new scene describes.`;

const generateSingleImage = async (
  ai: GenAIClient,
  imagePrompt: string,
  aspectRatio: string,
  characterRef?: string,
  sceneAnchor?: string,
): Promise<string> => {
  let contents: string | Array<Record<string, unknown>>;

  if (characterRef && sceneAnchor) {
    // 듀얼 레퍼런스: 캐릭터 고정 + 장면 연속성
    contents = [
      { inlineData: { mimeType: "image/png" as const, data: characterRef } },
      { inlineData: { mimeType: "image/png" as const, data: sceneAnchor } },
      { text: `${imagePrompt}\n\n${DUAL_REF_SUFFIX}` },
    ];
  } else if (characterRef) {
    // 캐릭터 레퍼런스만 (sceneGroup 첫 페이지)
    contents = [
      { inlineData: { mimeType: "image/png" as const, data: characterRef } },
      { text: `${imagePrompt}\n\n${CHARACTER_ONLY_SUFFIX}` },
    ];
  } else {
    // 레퍼런스 없음 (텍스트 전용)
    contents = imagePrompt;
  }

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
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }

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

  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  // 10개 장면을 한 번에 영문 번역
  const koreanScenes = pages.map((p) => p.sceneDescription);
  let englishScenes: string[];
  try {
    englishScenes = await translateScenesToEnglish(ai, koreanScenes);
  } catch (error) {
    console.error("Scene translation failed, using Korean descriptions:", error);
    captureSentryError(error, "스토리북 장면 번역");
    englishScenes = koreanScenes;
  }

  // 프롬프트 조합: [영문 장면] + ", " + [promptTemplate]
  const stylePostfix = preset.promptTemplate;
  const aspectRatio = layout === "horizontal" ? "3:4" : "16:9";

  // ── Phase 1: sceneGroup 기반 듀얼 레퍼런스로 base64 수집 ──
  // 캐릭터 레퍼런스: 항상 원본 고정 (외형 일관성)
  // 장면 앵커: sceneGroup별 첫 생성 이미지 고정 (배경/분위기 연속성, 열화 없음)
  const base64Images: string[] = new Array(pages.length);
  const sceneGroupAnchors = new Map<number, string>();

  for (let i = 0; i < pages.length; i++) {
    const scene = englishScenes[i] ?? koreanScenes[i];
    const imagePrompt = `${scene}, ${stylePostfix}`;
    const group = pages[i].sceneGroup;

    const sceneAnchor = sceneGroupAnchors.get(group);
    const base64 = await generateSingleImage(
      ai,
      imagePrompt,
      aspectRatio,
      referenceImageBase64,
      sceneAnchor,
    );

    // sceneGroup의 첫 페이지 결과를 해당 그룹의 장면 앵커로 저장
    if (!sceneAnchor) {
      sceneGroupAnchors.set(group, base64);
    }

    base64Images[i] = base64;
    onProgress?.(i + 1, pages.length);
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
