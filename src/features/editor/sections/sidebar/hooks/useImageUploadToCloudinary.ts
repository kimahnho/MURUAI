/**
 * 이미지 파일을 Cloudinary에 업로드하고 결과 URL을 반환하는 훅.
 */
import { useState, useCallback } from "react";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
import { useToastStore } from "@/features/editor/store/toastStore";
import { mp } from "@/shared/utils/mixpanel";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const getImageUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
};

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
        formData.append("file", file);
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
        return getImageUrl(imagePath);
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
