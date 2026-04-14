/**
 * 이미지 파일을 Cloudinary에 업로드하고 결과 URL을 반환하는 훅.
 */
import { useState, useCallback } from "react";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";
import { useToastStore } from "@/features/editor/store/toastStore";
import { mp } from "@/shared/utils/mixpanel";
import { trackInteraction } from "@/shared/utils/trackInteraction";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

/** 브라우저 Canvas API로 이미지를 WebP data URL로 변환 (SVG 제외) */

const convertToWebpDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/webp", 0.92);
      URL.revokeObjectURL(img.src);
      console.log("[WebP 변환]", dataUrl.substring(0, 30), "길이:", dataUrl.length);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Image load failed"));
    };
    img.src = URL.createObjectURL(file);
  });

/**
 * 이미지 파일을 Cloudinary에 업로드하고 user_uploads_n에 등록합니다.
 * 사이드바 업로드 / 툴바·속성 패널 이미지 삽입 등에서 공통 사용.
 */
export const useImageUploadToCloudinary = () => {
  const [isUploading, setIsUploading] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        showToast("업로드 환경 설정이 필요해요.");
        return null;
      }

      if (!["image/jpeg", "image/png", "image/svg+xml"].includes(file.type)) {
        showToast("JPG, PNG 또는 SVG 파일만 업로드할 수 있어요.");
        return null;
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        showToast("파일 크기는 10MB 이하만 업로드할 수 있어요.");
        return null;
      }

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        showToast("로그인이 필요해요.");
        return null;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        const publicId = crypto.randomUUID();
        const folder = `muru-user-uploads/${user.id}`;
        const isSvg = file.type === "image/svg+xml";
        if (isSvg) {
          formData.append("file", file);
        } else {
          const webpDataUrl = await convertToWebpDataUrl(file);
          formData.append("file", webpDataUrl);
        }
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", folder);
        formData.append("public_id", publicId);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const payload = (await response.json()) as {
          public_id: string;
          format?: string;
        };
        console.log("[Cloudinary 응답] format:", payload.format, "public_id:", payload.public_id);
        const imagePath = payload.format
          ? `${payload.public_id}.${payload.format}`
          : payload.public_id;

        const { error } = await supabase.from("user_uploads_n").insert({
          user_id: user.id,
          image_path: imagePath,
          created_at: new Date().toISOString(),
        });

        if (error) {
          showToast("업로드 정보를 저장하지 못했어요.");
          return null;
        }

        mp.track("이미지 업로드", { file_type: file.type });
        trackInteraction({ category: "editor", action: "image_upload", metadata: { file_type: file.type } });
        return getCloudinaryImageUrl(imagePath);
      } catch (error) {
        captureSentryError(error, "이미지 업로드");
        showToast("업로드에 실패했어요.");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [showToast]
  );

  return { uploadImage, isUploading };
};
