/**
 * 감정 라벨 → 이미지 URL 매핑을 DB에서 조회하는 유틸.
 * AI 스토리라인 생성 시 감정 카드에 이미지를 자동 삽입하기 위해 사용한다.
 */
import { supabase } from "@/shared/api/supabase";
import type { EmotionImageStyle } from "../sections/sidebar/content/EmotionInferenceChoiceModal";

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

export const fetchEmotionImageMap = async (
  style: EmotionImageStyle,
): Promise<Map<string, string>> => {
  const map = new Map<string, string>();

  if (style === "emoji") {
    const { data, error } = await supabase
      .from("emotion_sticker")
      .select("label,image_path");

    if (error) {
      console.warn("emotion_sticker 조회 실패", error);
      return map;
    }

    for (const row of data ?? []) {
      if (!map.has(row.label)) {
        map.set(row.label, getImageUrl(row.image_path));
      }
    }

    return map;
  }

  const category = style === "photo-boy" ? "boy" : "girl";

  const { data, error } = await supabase
    .from("emotion_photo")
    .select("label,image_path")
    .eq("category", category);

  if (error) {
    console.warn("emotion_photo 조회 실패", error);
    return map;
  }

  for (const row of data ?? []) {
    if (!map.has(row.label)) {
      map.set(row.label, getImageUrl(row.image_path));
    }
  }

  return map;
};
