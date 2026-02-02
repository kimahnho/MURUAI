import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/supabase/supabase";

export type ImageLibraryItem = {
  id: string;
  cloudinary_url: string;
  name_ko: string;
  style: string | null;
  hashtags_ko: string[] | null;
  taxonomy_leaf_slug?: string | null;
};

type ImageLibraryFilters = {
  style: string;
  hashtags: string[];
  keyword: string;
};

const IMAGE_LIBRARY_LIMIT = 48;
const MIN_KEYWORD_LENGTH = 2;

const fetchImageLibraryPage = async ({
  pageParam,
  filters,
}: {
  pageParam: number;
  filters: ImageLibraryFilters;
}) => {
  const offset = pageParam;
  const fromQuery = supabase
    .from("images")
    .select("id,cloudinary_url,name_ko,style,hashtags_ko,taxonomy_leaf_slug")
    .order("id", { ascending: true })
    .range(offset, offset + IMAGE_LIBRARY_LIMIT - 1);

  const withStyle =
    filters.style.length > 0
      ? fromQuery.eq("style", filters.style)
      : fromQuery;
  const withTags =
    filters.hashtags.length === 1
      ? withStyle.contains("hashtags_ko", [filters.hashtags[0]])
      : filters.hashtags.length > 1
        ? withStyle.overlaps("hashtags_ko", filters.hashtags)
        : withStyle;
  const keyword = filters.keyword.trim();
  const canSearch = keyword.length >= MIN_KEYWORD_LENGTH;
  const withKeyword =
    canSearch
      ? withTags.ilike("search_text_ko", `%${keyword}%`)
      : withTags;

  const { data, error } = await withKeyword;
  if (error) {
    throw error;
  }

  return (data as ImageLibraryItem[]) ?? [];
};

export const useImageLibrary = (filters: ImageLibraryFilters) => {
  return useInfiniteQuery({
    queryKey: ["image-library", filters],
    queryFn: ({ pageParam }) =>
      fetchImageLibraryPage({
        pageParam: pageParam as number,
        filters,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < IMAGE_LIBRARY_LIMIT) return undefined;
      return allPages.length * IMAGE_LIBRARY_LIMIT;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export { IMAGE_LIBRARY_LIMIT };
