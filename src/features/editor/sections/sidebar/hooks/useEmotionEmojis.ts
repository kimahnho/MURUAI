/**
 * 감정 이모지 목록 상태와 선택 동작을 관리하는 훅.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";

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
    url: getCloudinaryImageUrl(item.image_path),
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
