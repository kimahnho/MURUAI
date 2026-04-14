/**
 * 감정 사진 데이터 조회와 선택 상태를 관리하는 훅.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";

type EmotionPhotoRow = {
  id: string;
  label: string;
  category: string;
  image_path: string;
};

export type EmotionPhoto = {
  id: string;
  label: string;
  url: string;
  category: "boy" | "girl";
};

const fetchAllEmotionPhotos = async (): Promise<EmotionPhoto[]> => {
  const { data, error } = await supabase
    .from("emotion_photo")
    .select("id,label,category,image_path");

  if (error) {
    throw error;
  }

  return (data as EmotionPhotoRow[]).map((item) => ({
    id: item.id,
    label: item.label,
    url: getCloudinaryImageUrl(item.image_path),
    category: item.category as "boy" | "girl",
  }));
};

export const useEmotionPhotos = (enabled = true) => {
  return useQuery({
    queryKey: ["emotion-photos"],
    queryFn: fetchAllEmotionPhotos,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
};
