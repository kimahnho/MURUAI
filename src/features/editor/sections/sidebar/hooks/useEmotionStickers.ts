/**
 * 감정 이모지(스티커) 목록을 조회하는 훅.
 * emotion_sticker 테이블 기반, 정적 리소스이므로 세션 내 재검증 없음.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";

type EmotionStickerRow = {
  id: string;
  slug: string;
  label: string;
  image_path: string;
};

export type EmotionSticker = {
  id: string;
  label: string;
  url: string;
};

const fetchAllEmotionStickers = async (): Promise<EmotionSticker[]> => {
  const { data, error } = await supabase
    .from("emotion_sticker")
    .select("id,slug,label,image_path");

  if (error) throw error;

  return (data as EmotionStickerRow[]).map((item) => ({
    id: item.id,
    label: item.label,
    url: getCloudinaryImageUrl(item.image_path),
  }));
};

export const useEmotionStickers = (enabled = true) => {
  return useQuery({
    queryKey: ["emotion-stickers"],
    queryFn: fetchAllEmotionStickers,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
};
