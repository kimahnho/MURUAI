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

// ─── 적응형 앵커 리셋 판단 ───

// 같은 앵커(이전 생성 이미지)로 연속 생성할 최대 횟수 — 초과 시 품질 보호를 위해 자동 리셋
const MAX_ANCHOR_CHAIN = 3;

// 이전 장면과 현재 장면의 물리적 배경이 바뀌었는지 AI가 판단
const shouldResetAnchor = async (
  ai: GenAIClient,
  prevScene: string,
  currentScene: string,
): Promise<boolean> => {
  const prompt = `You are evaluating two consecutive scenes in a children's story book.

Previous scene: "${prevScene}"
Current scene: "${currentScene}"

Should the current scene use a completely NEW background/setting?
Answer YES if:
- The physical location has clearly changed (e.g., forest → village, home → school)
- The scene composition needs to be fundamentally different

Answer NO if:
- The scenes share the same or similar setting
- Only the character's action/emotion changes, not the environment

Answer ONLY "YES" or "NO".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseModalities: ["Text"] },
    });

    const text =
      response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? "";
    return text.trim().toUpperCase().startsWith("YES");
  } catch {
    // 판단 실패 시 연속 사용 — MAX_ANCHOR_CHAIN에서 안전하게 리셋됨
    return false;
  }
};

// ─── 단일 페이지 이미지 생성 ───

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// 연속 생성 시: 이전 이미지를 레퍼런스로 일관성 유지
const CONSISTENCY_SUFFIX = `The attached image is a previous scene from the same story.
Maintain the exact same character appearance, art style, lighting, and color palette.
Only change the scene details as described.`;

const generateSingleImage = async (
  ai: GenAIClient,
  imagePrompt: string,
  aspectRatio: string,
  referenceBase64?: string,
): Promise<string> => {
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

  // ── Phase 1: 적응형 순차 생성으로 base64 수집 (모두 성공해야 진행) ──
  // AI가 장면 간 맥락 변화를 실시간 판단하여 앵커를 리셋하거나 연속 사용
  const base64Images: string[] = new Array(pages.length);
  let currentAnchor: string | undefined = referenceImageBase64;
  let chainLength = 0;

  for (let i = 0; i < pages.length; i++) {
    const scene = englishScenes[i] ?? koreanScenes[i];
    const imagePrompt = `${scene}, ${stylePostfix}`;
    let needsReset = false;

    if (i === 0 || !currentAnchor) {
      needsReset = true;
    } else if (chainLength >= MAX_ANCHOR_CHAIN) {
      needsReset = true;
    } else {
      const prevScene = englishScenes[i - 1] ?? koreanScenes[i - 1];
      needsReset = await shouldResetAnchor(ai, prevScene, scene);
    }

    let base64: string;
    if (needsReset) {
      // 리셋: 캐릭터 레퍼런스로 생성 (없으면 텍스트 전용)
      base64 = await generateSingleImage(ai, imagePrompt, aspectRatio, referenceImageBase64);
      currentAnchor = base64;
      chainLength = 0;
    } else {
      // 연속: 현재 앵커(이전 생성 이미지)를 레퍼런스로 사용
      base64 = await generateSingleImage(ai, imagePrompt, aspectRatio, currentAnchor);
      chainLength++;
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
