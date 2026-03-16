/**
 * 감정 추론 활동의 히어로 박스 장면 이미지를 AI로 생성하는 모듈.
 * 2단계 파이프라인: Phase 1에서 10장 base64를 모두 수집한 뒤,
 * Phase 2에서 일괄 Cloudinary 업로드하여 불필요한 저장을 방지한다.
 */
import { GoogleGenAI } from "@google/genai";

import { supabase } from "@/shared/api/supabase";
import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { characterBoy, characterGirl } from "@/shared/assets";

import type { StoryItem } from "./generateEmotionStory";
import type { EmotionImageStyle } from "../sections/sidebar/content/EmotionInferenceChoiceModal";

const GOOGLE_API_KEY = sanitizeEnvKey(
  import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
);

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

// ─── 단일 장면 이미지 생성 ───

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

// 그룹 첫 장면: 캐릭터 레퍼런스 사용
const FIRST_IN_GROUP_SUFFIX = `Use the attached character reference photo as the main character in this scene.
The character must look like a real person matching the reference photo — same realistic style, NOT cartoon or illustrated.
The character should show the appropriate emotion for the situation described with a natural facial expression.`;

// 그룹 후속 장면: 첫 장면 이미지를 레퍼런스로 일관성 유지
const SUBSEQUENT_SUFFIX = `Maintain the same character appearance, art style, and background setting as the reference image.
Only change the character's pose and emotion to match the new scene description.
The character must look like a real person — same realistic style, NOT cartoon or illustrated.`;

const generateSingleSceneImage = async (
  ai: GoogleGenAI,
  sceneDescription: string,
  referenceBase64: string,
  isGroupFirst: boolean,
): Promise<string> => {
  const suffix = isGroupFirst ? FIRST_IN_GROUP_SUFFIX : SUBSEQUENT_SUFFIX;
  const fullPrompt = `${SCENE_STYLE_PROMPT}\n\nScene: ${sceneDescription}\n\n${suffix}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

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
): Promise<string[]> => {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key is not configured");
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

  // 캐릭터 참조 이미지 로드
  const characterSrc = imageStyle === "photo-boy" ? characterBoy : characterGirl;
  const characterBase64 = await loadImageAsBase64(characterSrc);

  // 10개 장면을 한 번에 영문 번역
  const koreanScenes = stories.map((s) => `${s.title} ${s.sentence}`);
  let englishScenes: string[];
  try {
    englishScenes = await translateScenesToEnglish(ai, koreanScenes);
  } catch (error) {
    console.error("Scene translation failed, using Korean descriptions:", error);
    englishScenes = koreanScenes;
  }

  // ── Phase 1: 그룹별 순차 생성으로 base64 수집 (모두 성공해야 진행) ──
  // sceneGroup별로 그룹핑하여 첫 장면 이미지를 후속 장면의 레퍼런스로 재활용
  const base64Images: string[] = new Array(stories.length);
  const groupFirstImages = new Map<number, string>();
  let completedCount = 0;

  // sceneGroup → 원본 인덱스 배열로 그룹핑
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < stories.length; i++) {
    const group = stories[i].sceneGroup;
    const indices = groupMap.get(group) ?? [];
    indices.push(i);
    groupMap.set(group, indices);
  }

  // 각 그룹 순차 처리
  for (const indices of groupMap.values()) {
    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const scene = englishScenes[idx] ?? koreanScenes[idx];
      const isGroupFirst = j === 0;
      const reference = isGroupFirst
        ? characterBase64
        : groupFirstImages.get(stories[idx].sceneGroup)!;

      const base64 = await generateSingleSceneImage(ai, scene, reference, isGroupFirst);
      base64Images[idx] = base64;

      if (isGroupFirst) {
        groupFirstImages.set(stories[idx].sceneGroup, base64);
      }

      completedCount++;
      onProgress?.(completedCount, stories.length);
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
