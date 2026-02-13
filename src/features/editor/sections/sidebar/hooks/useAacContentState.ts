/**
 * AAC 패널의 카테고리/검색/선택 상태를 관리하는 훅.
 */
import { useState } from "react";
import { useImageFillStore } from "@/features/editor/store/imageFillStore";
import { useAacCards } from "./useAacCards";

const normalizeQuery = (value: string) => value.trim().toLowerCase();
const matchesQuery = (label: string, query: string) =>
  query.length === 0 || label.toLowerCase().includes(query);

type CardSize = { width: number; height: number };

export const useAacContentState = <Category extends string>({
  initialCategory,
  categoryValueMap,
  cardSize,
}: {
  initialCategory: Category;
  categoryValueMap: Record<Category, string[]>;
  cardSize: CardSize;
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    initialCategory
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { data: allCards, isLoading } = useAacCards();
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );

  const categoryValues = categoryValueMap[selectedCategory];
  const categoryImages = (allCards ?? []).filter((card) =>
    categoryValues.includes(card.category)
  );
  const query = normalizeQuery(searchQuery);
  const filteredImages = categoryImages.filter((image) =>
    matchesQuery(image.alt, query)
  );

  const handleSelectImage = (url: string, alt: string) => {
    requestImageFill(url, alt, cardSize, { forceInsert: true, source: "aac" });
  };

  return {
    selectedCategory,
    searchQuery,
    filteredImages,
    isLoading,
    onSelectCategory: setSelectedCategory,
    onSearchChange: setSearchQuery,
    onSelectImage: handleSelectImage,
  };
};
