/**
 * Gemini를 사용해 이미지를 AI로 편집하는 모듈.
 * 올가미 선택 영역이 있으면 오버레이된 이미지 전달, 없으면 원본 전달.
 * 결과는 WebP로 변환 후 Cloudinary에 업로드.
 */
import { getGenAI } from "@/shared/api/genai";
import { convertToWebP } from "@/shared/utils/imageConvert";
import { supabase } from "@/shared/api/supabase";
import { captureSentryError } from "@/shared/utils/sentryUtils";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

/** 이미지를 maxDim 이하로 리사이즈 + WebP 무손실 통일. 작아도 WebP로 변환. */
const toWebpLossless = (base64: string, maxDim: number): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const needsResize = img.width > maxDim || img.height > maxDim;
      const scale = needsResize ? Math.min(maxDim / img.width, maxDim / img.height) : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(base64); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // WebP quality 1.0 = 무손실. 원본 포맷(JPEG/PNG 등)을 WebP로 통일.
      resolve(canvas.toDataURL("image/webp", 1.0).split(",")[1]);
    };
    img.onerror = () => {
      console.warn("toWebpLossless: 이미지 로드 실패, 원본 사용");
      resolve(base64);
    };
    // data URL prefix가 없을 수 있으므로 범용 처리
    img.src = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  });

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/** Cloudinary에 WebP 이미지를 업로드하고 URL을 반환한다. */
const uploadToCloudinary = async (base64Data: string, userId: string): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }

  const { data: webpData, mimeType } = await convertToWebP(base64Data);
  const formData = new FormData();
  formData.append("file", `data:${mimeType};base64,${webpData}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `muru_ai_edit/${userId}`);
  formData.append("public_id", crypto.randomUUID());

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) throw new Error("Cloudinary 업로드 실패");

  const payload = (await response.json()) as { public_id: string; format?: string };
  const path = payload.format ? `${payload.public_id}.${payload.format}` : payload.public_id;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
};

/**
 * AI로 이미지를 편집한다.
 * @param imageBase64 원본 또는 오버레이된 이미지 (base64)
 * @param prompt 사용자 편집 프롬프트
 * @param hasSelection 영역 선택 여부 (오버레이 존재 시 true)
 * @returns Cloudinary URL
 */
export const editImageWithAi = async (
  imageBase64: string,
  prompt: string,
  hasSelection: boolean,
): Promise<string> => {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("로그인이 필요합니다.");

  const ai = getGenAI();
  // Gemini 입력은 WebP 무손실(quality 1.0) — 품질 유지 + 용량 절감
  const inputBase64 = await toWebpLossless(imageBase64, 2048);

  // 시스템 지시와 유저 프롬프트를 별도 파트로 분리 — 프롬프트 인젝션 방지
  const systemPart = hasSelection
    ? "Generate an image: The user has marked a specific area in this image with a semi-transparent RED overlay. Edit ONLY the red area according to the user's request below. Keep everything outside the red area exactly the same. Remove the red overlay from the result. Blend naturally. Do NOT add text unless asked."
    : "Generate an image: Edit this image according to the user's request below. Maintain the original style and quality. Do NOT add text unless asked.";

  const userPart = prompt;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          { text: systemPart },
          { inlineData: { mimeType: "image/webp" as const, data: inputBase64 } },
          { text: `User request: ${userPart}` },
        ],
        config: {
          responseModalities: ["Text", "Image"],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find((part) => part.inlineData);
      if (imagePart?.inlineData?.data) {
        const url = await uploadToCloudinary(imagePart.inlineData.data, authData.user.id);
        return url;
      }
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        captureSentryError(error, "AI 이미지 편집");
        throw error;
      }
    }
  }

  // retry 전부 실패 (이미지 파트 없음)
  captureSentryError(new Error("Gemini returned no image after retries"), "AI 이미지 편집 retry 실패");
  throw new Error("이미지 편집에 실패했습니다.");
};
