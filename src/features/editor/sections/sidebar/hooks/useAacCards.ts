/**
 * AAC 카드 목록 조회와 선택/필터 상태를 관리하는 훅.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";
import { getCloudinaryImageUrl } from "@/shared/api/cloudinaryUrl";

type AacCardRow = {
  id: string;
  label: string;
  category: string;
  emoji: string | null;
  image_path: string;
};

export type AacCard = {
  id: string;
  url: string;
  alt: string;
  emoji: string;
  category: string;
};

const fetchAllAacCards = async (): Promise<AacCard[]> => {
  const { data, error } = await supabase
    .from("aac_cards")
    .select("id,label,category,emoji,image_path");

  if (error) {
    throw error;
  }

  return (data as AacCardRow[]).map((item) => ({
    id: item.id,
    url: getCloudinaryImageUrl(item.image_path),
    alt: item.label,
    emoji: item.emoji ?? "",
    category: item.category,
  }));
};

export const useAacCards = (enabled = true) => {
  return useQuery({
    queryKey: ["aac-cards"],
    queryFn: fetchAllAacCards,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
};
