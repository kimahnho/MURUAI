/**
 * 감정 이모지 목록 상태와 선택 동작을 관리하는 훅.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";

type EmotionEmojiRow = {
  id: string;
  label: string;
  image_path: string;
};

export type EmotionEmoji = {
  id: string;
  label: string;
  url: string;
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

const fetchAllEmotionEmojis = async (): Promise<EmotionEmoji[]> => {
  const { data, error } = await supabase
    .from("emotion_emoji")
    .select("id,label,image_path");

  if (error) {
    throw error;
  }

  return (data as EmotionEmojiRow[]).map((item) => ({
    id: item.id,
    label: item.label,
    url: getImageUrl(item.image_path),
  }));
};

export const useEmotionEmojis = () => {
  return useQuery({
    queryKey: ["emotion-emojis"],
    queryFn: fetchAllEmotionEmojis,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
