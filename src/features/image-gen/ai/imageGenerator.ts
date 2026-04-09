/**
 * Gemini 이미지 생성 래퍼
 *
 * Gemini 2.5 Flash로 이미지 생성 + 텍스트 응답 반환.
 */
import { getGenAI } from "@/shared/api/genai";
import { convertToWebP } from "@/shared/utils/imageConvert";

const IMAGE_MODEL = "gemini-2.5-flash-image";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET;

export interface GenerateImageResult {
  base64: string;
  text: string | null;
}

/**
 * 프롬프트 → 이미지 생성 → base64 + 텍스트 응답 반환
 * referenceImageBase64가 있으면 inlineData part로 함께 전송
 */
export async function generateImage(
  prompt: string,
  referenceImageBase64?: string,
): Promise<GenerateImageResult> {
  const genai = getGenAI();

  const inputParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (referenceImageBase64) {
    inputParts.push({ inlineData: { mimeType: "image/webp", data: referenceImageBase64 } });
  }
  inputParts.push({ text: prompt });

  const response = await genai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: inputParts }],
    config: {
      responseModalities: ["Text", "Image"],
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts;
  if (!responseParts) throw new Error("이미지 생성에 실패했어요. 다시 시도해주세요.");

  const imagePart = responseParts.find((p) => p.inlineData);
  if (!imagePart?.inlineData?.data) {
    throw new Error("이미지가 생성되지 않았어요. 프롬프트를 수정해보세요.");
  }

  // 텍스트 파트 수집 (AI의 설명/코멘트)
  const textParts = responseParts.filter((p) => p.text).map((p) => p.text!);
  const text = textParts.length > 0 ? textParts.join("\n") : null;

  return { base64: imagePart.inlineData.data, text };
}

/**
 * base64 → Cloudinary 업로드 → URL 반환
 * Cloudinary 미설정 시 data URL fallback
 */
export async function uploadImage(base64: string, userId: string): Promise<string> {
  const { data: webpData, mimeType } = await convertToWebP(base64);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return `data:${mimeType};base64,${webpData}`;
  }

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  const folder = `muru_therapy_gen/${userId}`;

  formData.append("file", `data:${mimeType};base64,${webpData}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    return `data:${mimeType};base64,${webpData}`;
  }

  const payload = (await response.json()) as { public_id: string; format?: string };
  const path = payload.format ? `${payload.public_id}.${payload.format}` : payload.public_id;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
}

export interface GenerateAndUploadResult {
  imageUrl: string;
  text: string | null;
}

/**
 * 전체 파이프라인: 프롬프트 → 이미지 생성 → 업로드 → URL + 텍스트
 */
export async function generateAndUpload(
  prompt: string,
  userId: string,
  referenceImageBase64?: string,
): Promise<GenerateAndUploadResult> {
  const result = await generateImage(prompt, referenceImageBase64);
  const imageUrl = await uploadImage(result.base64, userId);
  return { imageUrl, text: result.text };
}
