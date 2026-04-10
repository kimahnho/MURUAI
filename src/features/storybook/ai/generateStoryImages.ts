/**
 * 각 페이지의 sceneDescription을 영문 번역 후 그림체 프롬프트와 조합하여
 * Gemini 이미지 모델로 삽화를 생성하고 Cloudinary에 업로드하는 모듈.
 */
import type { GenAIClient } from "@/shared/api/genai";
import { captureSentryError } from "@/shared/utils/sentryUtils";

import { supabase } from "@/shared/api/supabase";
// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";

import type { ArtStyleId, CastCharacter, PageLayout } from "../model/storybookTypes";
import { convertToWebP } from "@/shared/utils/imageConvert";
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

  const { data: webpData, mimeType } = await convertToWebP(base64Data);
  formData.append("file", `data:${mimeType};base64,${webpData}`);
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
  const prompt = `Translate each Korean scene description to English optimized for image generation.

Rules:
- Preserve all visual details: background, character action, facial expression, props, atmosphere/color
- Use vivid, specific English (not "a boy is happy" but "a boy with a wide grin and squinted eyes")
- Keep each translation under 200 words
- Do NOT add details not in the Korean original
- Return a JSON array of strings only, no explanation.

Input:
${JSON.stringify(scenes)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
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

// ─── 단일 페이지 이미지 생성 (멀티 레퍼런스) ───

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

// 공통 규칙 — 모든 이미지에 적용
const COMMON_RULES = `RULES:
- Do NOT include any text, letters, words, numbers, signs, labels in the image.
- Korean culture: shoes removed indoors, ondol floor, low table, indoor shoes at entrance.
- Each character appears EXACTLY ONCE. Do NOT duplicate any character.
- Materials behave realistically: fabric drapes, stones sit on ground, wood has weight.`;


const generateSingleImage = async (
  ai: GenAIClient,
  imagePrompt: string,
  aspectRatio: string,
  characterRef?: string,
  subCharRefs?: Array<{ role: string; data: string }>,
  sceneAnchor?: string,
): Promise<string> => {
  let contents: string | Array<Record<string, unknown>>;

  if (!characterRef) {
    contents = imagePrompt;
  } else {
    const parts: Array<Record<string, unknown>> = [];
    const suffixLines: string[] = [];

    // 주인공 레퍼런스 (항상 첫 번째)
    parts.push({ inlineData: { mimeType: "image/webp" as const, data: characterRef } });
    suffixLines.push("The FIRST image is the main character reference — preserve exact face, hair, clothing, and proportions.");

    // 서브캐릭터 레퍼런스
    if (subCharRefs && subCharRefs.length > 0) {
      for (const sub of subCharRefs) {
        parts.push({ inlineData: { mimeType: "image/webp" as const, data: sub.data } });
        suffixLines.push(`The next image is the "${sub.role}" character reference — preserve this character's exact appearance.`);
      }
    }

    // 씬앵커 (sceneGroup 후속 페이지)
    if (sceneAnchor) {
      parts.push({ inlineData: { mimeType: "image/webp" as const, data: sceneAnchor } });
      suffixLines.push("The last image is a previous scene from the same location — maintain the same background, lighting, and atmosphere.");
      suffixLines.push("Only change characters' actions and expressions as the new scene describes.");
    }

    suffixLines.push("");
    suffixLines.push(COMMON_RULES);

    parts.push({ text: `${imagePrompt}\n\n${suffixLines.join("\n")}` });
    contents = parts;
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
        imageConfig: { aspectRatio },
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
  pages: Array<{ sceneDescription: string; sceneGroup: number; text: string }>,
  artStyleId: ArtStyleId,
  layout: PageLayout,
  referenceImageBase64?: string,
  onProgress?: (current: number, total: number) => void,
  customPromptTemplate?: string,
  subCharacters?: CastCharacter[],
): Promise<string[]> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }

  const preset = ART_STYLE_PRESETS.find((p) => p.id === artStyleId);
  if (!preset && !customPromptTemplate) {
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
  const stylePostfix = customPromptTemplate ?? preset?.promptTemplate ?? "";
  const aspectRatio = layout === "horizontal" ? "3:4" : "16:9";

  // ── Phase 1: 듀얼 레퍼런스로 base64 수집 ──
  // 캐릭터 레퍼런스: 항상 원본 고정 (외형 일관성)
  // 장면 앵커: sceneGroup별 첫 생성 이미지 고정 (배경/분위기 연속성)
  const compressedMainRef = referenceImageBase64
    ? (await convertToWebP(referenceImageBase64)).data
    : undefined;

  const base64Images: string[] = new Array(pages.length);
  const sceneGroupAnchors = new Map<number, string>();
  const castCharacters = subCharacters ?? [];

  // 서브캐릭터 ref를 WebP로 압축
  const compressedSubRefs: Array<{ role: string; data: string; pages: number[] }> = [];
  for (const sc of castCharacters) {
    if (sc.imageBase64) {
      const { data } = await convertToWebP(sc.imageBase64);
      compressedSubRefs.push({ role: sc.role, data, pages: sc.pages });
    }
  }

  for (let i = 0; i < pages.length; i++) {
    const scene = englishScenes[i] ?? koreanScenes[i];
    const storyText = pages[i].text;
    const imagePrompt = `Story text: "${storyText}"\n\nScene: ${scene}, ${stylePostfix}`;
    const group = pages[i].sceneGroup;
    const pageNum = i + 1;

    // 이 페이지에 등장하는 서브캐릭터 ref만 선택
    const pageSubRefs = compressedSubRefs
      .filter((s) => s.pages.includes(pageNum))
      .map((s) => ({ role: s.role, data: s.data }));

    const sceneAnchor = sceneGroupAnchors.get(group);
    const base64 = await generateSingleImage(
      ai,
      imagePrompt,
      aspectRatio,
      compressedMainRef,
      pageSubRefs.length > 0 ? pageSubRefs : undefined,
      sceneAnchor,
    );

    // sceneGroup 첫 페이지 결과를 장면 앵커로 저장
    if (!sceneAnchor) {
      const { data: compressedAnchor } = await convertToWebP(base64);
      sceneGroupAnchors.set(group, compressedAnchor);
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
