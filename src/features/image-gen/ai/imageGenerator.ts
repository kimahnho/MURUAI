/**
 * Gemini 이미지 생성 래퍼
 *
 * Gemini 3.1 Flash Image Preview로 실제 이미지 생성.
 * 기존 에디터의 useAiImageGeneration 패턴 재사용.
 */
import { getGenAI } from "@/shared/api/genai";

const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET;

/**
 * 프롬프트 → 이미지 생성 → base64 반환
 */
export async function generateImage(prompt: string): Promise<string> {
  const genai = getGenAI();

  const response = await genai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["Text", "Image"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("이미지 생성에 실패했어요. 다시 시도해주세요.");

  const imagePart = parts.find((p) => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error("이미지가 생성되지 않았어요. 프롬프트를 수정해보세요.");
  }

  return imagePart.inlineData.data; // base64
}

/**
 * base64 → Cloudinary 업로드 → URL 반환
 * Cloudinary 미설정 시 data URL fallback
 */
export async function uploadImage(base64: string, userId: string): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return `data:image/png;base64,${base64}`;
  }

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  const folder = `muru_therapy_gen/${userId}`;

  formData.append("file", `data:image/png;base64,${base64}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    return `data:image/png;base64,${base64}`;
  }

  const payload = (await response.json()) as { public_id: string; format?: string };
  const path = payload.format ? `${payload.public_id}.${payload.format}` : payload.public_id;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
}

/**
 * 전체 파이프라인: 프롬프트 → 이미지 생성 → 업로드 → URL
 */
export async function generateAndUpload(
  prompt: string,
  userId: string,
): Promise<string> {
  const base64 = await generateImage(prompt);
  return uploadImage(base64, userId);
}
