import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";

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

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;

const getImageUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
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
    url: getImageUrl(item.image_path),
    category: item.category as "boy" | "girl",
  }));
};

export const useEmotionPhotos = () => {
  return useQuery({
    queryKey: ["emotion-photos"],
    queryFn: fetchAllEmotionPhotos,
    staleTime: Infinity, // 데이터가 절대 stale하지 않음 (재배포 전까지)
    gcTime: Infinity, // 캐시를 영원히 보관
  });
};
