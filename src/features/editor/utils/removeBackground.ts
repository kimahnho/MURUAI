/**
 * @imgly/background-removal을 사용한 이미지 배경 제거 유틸리티.
 * 결과를 Cloudinary에 업로드하여 URL로 반환.
 */
import { removeBackground } from "@imgly/background-removal";
import { supabase } from "@/shared/api/supabase";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

/**
 * fill 문자열에서 이미지 소스 URL/base64를 추출한다.
 * "url(https://...)" → "https://..."
 * "data:image/png;base64,..." → "data:image/png;base64,..."
 */
export const extractImageSrc = (fill: string): string | null => {
  if (fill.startsWith("url(")) {
    return fill.slice(4, -1).replace(/(^['"]|['"]$)/g, "");
  }
  if (fill.startsWith("data:")) {
    return fill;
  }
  return null;
};

/**
 * 이미지 fill인지 판별한다.
 */
export const isImageFill = (fill: string | undefined): boolean => {
  if (!fill) return false;
  return fill.startsWith("url(") || fill.startsWith("data:");
};

/**
 * 이미지 소스에서 배경을 제거하고, Cloudinary에 업로드하여 fill 포맷 URL을 반환한다.
 * @param imageSrc - 이미지 URL 또는 data URL
 * @returns "url(https://res.cloudinary.com/...)" 형태의 fill 문자열
 */
export const removeImageBackground = async (
  imageSrc: string,
): Promise<string> => {
  // 1. 이미지를 Blob으로 변환
  let blob: Blob;
  if (imageSrc.startsWith("data:")) {
    const res = await fetch(imageSrc);
    blob = await res.blob();
  } else {
    const res = await fetch(imageSrc);
    if (!res.ok) throw new Error("이미지를 불러올 수 없어요.");
    blob = await res.blob();
  }

  // 2. 배경 제거
  const resultBlob = await removeBackground(blob);

  // 3. Cloudinary 업로드
  const cloudinaryUrl = await uploadBgRemovedToCloudinary(resultBlob);

  return `url(${cloudinaryUrl})`;
};

// ─── Cloudinary 업로드 ───

const uploadBgRemovedToCloudinary = async (
  blob: Blob,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    // Cloudinary 미설정 시 base64 폴백
    return blobToDataUrl(blob);
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "anonymous";

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  formData.append("file", blob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `muru-bg-removed/${userId}`);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    // 업로드 실패 시 base64 폴백
    return blobToDataUrl(blob);
  }

  const payload = (await response.json()) as {
    public_id: string;
    format?: string;
  };
  const imagePath = payload.format
    ? `${payload.public_id}.${payload.format}`
    : payload.public_id;

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${imagePath}`;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
