/**
 * AAC 카드 목록 조회와 선택/필터 상태를 관리하는 훅.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase";

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

const fetchAllAacCards = async (): Promise<AacCard[]> => {
  const { data, error } = await supabase
    .from("aac_cards")
    .select("id,label,category,emoji,image_path");

  if (error) {
    throw error;
  }

  return (data as AacCardRow[]).map((item) => ({
    id: item.id,
    url: getImageUrl(item.image_path),
    alt: item.label,
    emoji: item.emoji ?? "",
    category: item.category,
  }));
};

export const useAacCards = () => {
  return useQuery({
    queryKey: ["aac-cards"],
    queryFn: fetchAllAacCards,
    staleTime: Infinity, // 정적 리소스 성격이라 세션 내 재검증을 생략한다.
    gcTime: Infinity, // 사이드바 재진입 시 즉시 재사용하도록 캐시를 유지한다.
  });
};
