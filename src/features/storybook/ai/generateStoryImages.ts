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

/** 페이지에 전달할 레퍼런스 이미지와 역할 설명을 동적으로 조립한다. */
const buildMultiRefContents = (
  imagePrompt: string,
  characterRef: string | undefined,
  subCharRefs: Map<string, string>,
  pageCharacterRoles: string[],
  castCharacters: CastCharacter[],
  sceneAnchor: string | undefined,
): string | Array<Record<string, unknown>> => {
  if (!characterRef) return imagePrompt;

  // 텍스트 먼저, 이미지 뒤에 — Gemini가 역할을 이해한 후 이미지 해석
  const textLines: string[] = [];
  let imageIdx = 1;

  // 절대 규칙 (최상단)
  textLines.push("NO TEXT in the image. No letters, words, numbers, signs, labels, captions.");
  textLines.push("");

  // 캐릭터 정의 — 태그 + 위치 + 1회만
  textLines.push("CHARACTERS (each appears EXACTLY ONCE):");
  textLines.push(`@maincharacter: [IMAGE ${imageIdx}] reference. Draw this character ONCE in a new pose.`);
  imageIdx++;

  for (const role of pageCharacterRoles) {
    const ref = subCharRefs.get(role);
    const cast = castCharacters.find((c) => c.role === role);
    if (ref) {
      textLines.push(`@${role}: [IMAGE ${imageIdx}] reference. Draw ONCE. ${cast?.appearance ?? ""}`);
      imageIdx++;
    } else if (cast) {
      textLines.push(`@${role}: ${cast.appearance}. Draw ONCE. (no reference image)`);
    }
  }
  textLines.push("");

  // 배경 (캐릭터와 분리)
  textLines.push(`SCENE: ${imagePrompt}`);
  textLines.push("");

  // 씬앵커
  if (sceneAnchor) {
    textLines.push(`[IMAGE ${imageIdx}] = BACKGROUND REFERENCE ONLY.`);
    textLines.push("- Match the walls, floor, sky, furniture, lighting, colors from this image.");
    textLines.push("- COMPLETELY IGNORE every person, animal, or creature in this image.");
    textLines.push("- Do NOT draw anyone from this image. Only match the environment.");
    textLines.push("");
  }

  // 크기/물리 규칙
  textLines.push("SIZE: A child is ~120cm. A dog is knee-height. An adult is 1.5x a child.");
  textLines.push("PHYSICS: Objects obey gravity. Materials behave realistically.");
  textLines.push("Fill empty space with environment elements (trees, sky, furniture), NOT with extra characters.");

  // 텍스트 파트 먼저
  const parts: Array<Record<string, unknown>> = [];
  parts.push({ text: textLines.join("\n") });

  // 이미지 파트 뒤에
  parts.push({ inlineData: { mimeType: "image/png" as const, data: characterRef } });

  for (const role of pageCharacterRoles) {
    const ref = subCharRefs.get(role);
    if (ref) {
      parts.push({ inlineData: { mimeType: "image/png" as const, data: ref } });
    }
  }

  if (sceneAnchor) {
    parts.push({ inlineData: { mimeType: "image/png" as const, data: sceneAnchor } });
  }

  return parts;
};

const generateSingleImage = async (
  ai: GenAIClient,
  imagePrompt: string,
  aspectRatio: string,
  characterRef: string | undefined,
  subCharRefs: Map<string, string>,
  pageCharacterRoles: string[],
  castCharacters: CastCharacter[],
  sceneAnchor: string | undefined,
): Promise<string> => {
  const contents = buildMultiRefContents(
    imagePrompt, characterRef, subCharRefs,
    pageCharacterRoles, castCharacters, sceneAnchor,
  );

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
  pages: Array<{ sceneDescription: string; sceneGroup: number }>,
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

  // ── Phase 1: 멀티 레퍼런스 기반 base64 수집 ──
  // 주인공 + 서브캐릭터 레퍼런스 + sceneGroup 장면 앵커
  const base64Images: string[] = new Array(pages.length);
  const sceneGroupAnchors = new Map<number, string>();
  const castCharacters = subCharacters ?? [];
  const subCharRefs = new Map<string, string>();
  for (const sc of castCharacters) {
    if (sc.imageBase64) subCharRefs.set(sc.role, sc.imageBase64);
  }

  for (let i = 0; i < pages.length; i++) {
    const scene = englishScenes[i] ?? koreanScenes[i];
    const imagePrompt = `${scene}, ${stylePostfix}`;
    const group = pages[i].sceneGroup;
    const pageNum = i + 1;

    // 이 페이지에 등장하는 서브캐릭터 역할 목록
    const pageCharacterRoles = castCharacters
      .filter((c) => c.pages.includes(pageNum))
      .map((c) => c.role);

    const sceneAnchor = sceneGroupAnchors.get(group);
    const base64 = await generateSingleImage(
      ai,
      imagePrompt,
      aspectRatio,
      referenceImageBase64,
      subCharRefs,
      pageCharacterRoles,
      castCharacters,
      sceneAnchor,
    );

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
