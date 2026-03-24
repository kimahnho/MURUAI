/**
 * 감정 추론 활동의 히어로 박스 장면 이미지를 AI로 생성하는 모듈.
 * 2단계 파이프라인: Phase 1에서 10장 base64를 모두 수집한 뒤,
 * Phase 2에서 일괄 Cloudinary 업로드하여 불필요한 저장을 방지한다.
 */
import type { GenAIClient } from "@/shared/api/genai";

import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";
import { characterBoy, characterGirl } from "@/shared/assets";

import type { StoryItem } from "./generateEmotionStory";
import type { EmotionImageStyle } from "../sections/sidebar/content/EmotionInferenceChoiceModal";

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

// ─── 장면 스타일 프롬프트 ───

const SCENE_STYLE_PROMPT = `SCENE SETTING (Default: Modern South Korea, 2024):
Background must depict ONE specific Korean everyday environment with enough detail for children to immediately recognize the setting. Choose the most contextually appropriate:

- Korean apartment living room: sofa, low coffee table, TV on a stand, framed picture on wall, wooden floor
- Elementary school classroom: rows of desks, blackboard/whiteboard at front, windows on one side, teacher's desk, wall clock
- Korean convenience store: refrigerator units along back wall, product shelves (2–3 rows), checkout counter with register
- Neighborhood park: paved path, 1–2 benches, 2–3 trees, distant apartment buildings visible in background
- School cafeteria: long tables with benches, food tray station visible, plain walls
- Home kitchen/dining area: dining table with chairs, kitchen counter, refrigerator

Background detail level: recognizable and contextually rich, but NOT cluttered. Background should feel natural and lived-in with realistic lighting and depth.

CHARACTERS:
- MAXIMUM 4 characters. Only as many as the social situation requires — no extras.
- No crowds, no bystanders, no partially-visible figures at scene edges.
- Realistic-looking Korean children or adults (age appropriate to the scenario) — NOT cartoon or illustrated.
- Each character shows ONE clear, unambiguous emotion with a natural, realistic facial expression.
- Clothing: casual, everyday Korean children's clothing with natural colors and textures.
- No accessories unless directly required by the scenario.
- Characters clearly grouped and centered — not scattered across the frame.

STYLE:
- Photorealistic style — the image should look like a real photograph or a high-quality 3D render.
- Natural lighting with soft shadows and depth.
- Warm, natural color tones — the scene should feel inviting and realistic.
- Slight shallow depth-of-field is acceptable to keep focus on characters.
- The overall mood should be warm, bright, and child-friendly.

MANDATORY PROHIBITIONS:
- NO cartoon, illustration, flat art, or anime style — MUST be photorealistic
- NO text, labels, numbers, or symbols anywhere in the image
- NO decorative borders or frames
- NO overly dramatic lighting or dark atmosphere
- NO uncanny valley — characters should look natural

COMPOSITION:
- Social interaction occupies the center of the frame.
- Camera: straight-on, slightly above eye level (child's eye level).
- Full or three-quarter body view — do not crop characters at knees or mid-torso.
- Single clear focal point. Background supports the scene but never competes with the characters.`;

// ─── Cloudinary 업로드 ───

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
  signal?: AbortSignal,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  const folder = `muru_emotion_scene/${userId}`;

  formData.append("file", `data:image/png;base64,${base64Data}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
      signal,
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

// ─── 캐릭터 이미지 → base64 변환 ───

const loadImageAsBase64 = async (src: string): Promise<string> => {
  const response = await fetch(src);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // "data:image/png;base64,..." → base64 부분만 추출
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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

// ─── 단일 장면 이미지 생성 ───

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

// 리셋 시: 캐릭터 레퍼런스로 새 이미지 생성 (성별 동적 주입)
const buildResetSuffix = (gender: "boy" | "girl") =>
  `Use the attached character reference photo as the main character in this scene.
The main character MUST be a Korean ${gender} — maintain this gender consistently. Do NOT mix genders.
The character must look like a real person matching the reference photo — same realistic style, NOT cartoon or illustrated.
The character should show the appropriate emotion for the situation described with a natural facial expression.`;

// 연속 시: 이전 생성 이미지를 레퍼런스로 일관성 유지 (성별 동적 주입)
const buildContinuationSuffix = (gender: "boy" | "girl") =>
  `The attached image is a previous scene from the same story, set in the SAME location.
The main character MUST remain a Korean ${gender} — do NOT change the character's gender.
Maintain the exact same:
- Character appearance (face, body, clothing)
- Art style, lighting, and color palette
- Background/setting: Keep the SAME location and environment as the reference image
- Visual consistency with the reference

Change only:
- Character's pose and facial expression to match the current situation
Do NOT change the background — the story is still happening in the same place.
The character must look like a real person — same realistic style, NOT cartoon or illustrated.`;

const generateSingleSceneImage = async (
  ai: GenAIClient,
  sceneDescription: string,
  referenceBase64: string,
  isReset: boolean,
  gender: "boy" | "girl",
  signal?: AbortSignal,
): Promise<string> => {
  const suffix = isReset ? buildResetSuffix(gender) : buildContinuationSuffix(gender);
  const fullPrompt = `${SCENE_STYLE_PROMPT}\n\nScene: ${sceneDescription}\n\nIMPORTANT: The main character is a Korean ${gender}.\n\n${suffix}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException("Image generation aborted", "AbortError");
    if (attempt > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, RETRY_DELAY_MS);
        signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Image generation aborted", "AbortError")); }, { once: true });
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            inlineData: { mimeType: "image/png", data: referenceBase64 },
          },
          { text: fullPrompt },
        ],
        config: {
          responseModalities: ["Text", "Image"],
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find((part) => part.inlineData);
      if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    } catch (error) {
      // 마지막 시도에서도 실패하면 throw
      if (attempt === MAX_RETRIES - 1) throw error;
      // 일시적 에러(503, 429 등)는 재시도
      console.warn(`Image generation attempt ${attempt + 1} failed, retrying...`, error);
    }
  }

  throw new Error("No image generated after retries");
};

// ─── 메인 함수 ───

/**
 * 10개 감정 추론 스토리의 장면 이미지를 생성하고 Cloudinary URL 배열을 반환한다.
 * Phase 1: 10장 base64 모두 수집 (하나라도 실패 시 throw)
 * Phase 2: 일괄 Cloudinary 업로드
 */
export const generateEmotionSceneImages = async (
  stories: StoryItem[],
  imageStyle: EmotionImageStyle,
  onProgress?: (current: number, total: number) => void,
  customPrompts?: Map<number, string>,
  signal?: AbortSignal,
): Promise<string[]> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  // 캐릭터 참조 이미지 로드
  const characterSrc = imageStyle === "photo-boy" ? characterBoy : characterGirl;
  const characterBase64 = await loadImageAsBase64(characterSrc);
  const gender: "boy" | "girl" = imageStyle === "photo-boy" ? "boy" : "girl";

  // 장면 설명 구성 — 커스텀 프롬프트가 있으면 기본 설명 뒤에 추가
  const koreanScenes = stories.map((s, i) => {
    const base = `${s.title} ${s.sentence}`;
    const custom = customPrompts?.get(i);
    return custom ? `${base} (배경: ${custom})` : base;
  });
  let englishScenes: string[];
  try {
    englishScenes = await translateScenesToEnglish(ai, koreanScenes);
  } catch (error) {
    captureSentryError(error, "감정추론 장면 번역");
    console.error("Scene translation failed, using Korean descriptions:", error);
    englishScenes = koreanScenes;
  }

  // ── Phase 1: sceneGroup 기반 순차 생성으로 base64 수집 (모두 성공해야 진행) ──
  // sceneGroup이 바뀌면 캐릭터 레퍼런스로 리셋, 같으면 이전 이미지를 레퍼런스로 유지
  const base64Images: string[] = new Array(stories.length);
  let currentAnchor: string = characterBase64;

  for (let i = 0; i < stories.length; i++) {
    if (signal?.aborted) throw new DOMException("Image generation aborted", "AbortError");
    const scene = englishScenes[i] ?? koreanScenes[i];
    const needsReset =
      i === 0 || stories[i].sceneGroup !== stories[i - 1].sceneGroup;

    let base64: string;
    if (needsReset) {
      base64 = await generateSingleSceneImage(ai, scene, characterBase64, true, gender, signal);
    } else {
      base64 = await generateSingleSceneImage(ai, scene, currentAnchor, false, gender, signal);
    }

    currentAnchor = base64;
    base64Images[i] = base64;
    onProgress?.(i + 1, stories.length);
  }

  // ── Phase 2: 일괄 Cloudinary 업로드 ──
  const imageUrls: string[] = [];

  for (const base64 of base64Images) {
    if (signal?.aborted) throw new DOMException("Image generation aborted", "AbortError");
    const imagePath = await uploadToCloudinary(base64, userId, signal);
    const imageUrl = getCloudinaryUrl(imagePath);
    imageUrls.push(imageUrl);
  }

  return imageUrls;
};
