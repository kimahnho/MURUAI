/**
 * 이미지 라이브러리 목록 조회와 캔버스 삽입을 제공하는 패널 컴포넌트.
 */
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
} from "react";
import { Search, X, MessageSquarePlus } from "lucide-react";
import { useImageFillStore } from "@/features/editor/store/imageFillStore";
import { useRecentImageSearchStore } from "@/features/editor/store/recentImageSearchStore";
import { useImageLibrary } from "../hooks/useImageLibrary";
import { getThumbnailUrl } from "@/shared/api/getThumbnailUrl";
import ImageRequestModal from "./ImageRequestModal";

const STYLE_OPTIONS = [
  { label: "전체", value: "" },
  { label: "실사", value: "photorealistic" },
  { label: "3D", value: "3d-illust" },
  { label: "사실적 일러스트", value: "realistic-illust" },
  { label: "심플 일러스트", value: "simple-illust" },
  { label: "컬러 아이콘", value: "colored-icon" },
  { label: "선그림", value: "outline" },
  { label: "클레이", value: "clay-style" },
  { label: "펠트", value: "felt-style" },
] as const;

const HASHTAGS = [
  "캐릭터",
  "동물",
  "겨울",
  "봄",
  "여름",
  "음식",
  "말풍선",
  "화살표",
] as const;
const SEARCH_DEBOUNCE_MS = 400;
const INSERT_SIZE = { width: 256, height: 256 };

const setDragImageData = (
  event: ReactDragEvent<HTMLElement>,
  imageUrl: string,
) => {
  event.dataTransfer.setData("application/x-muru-image", imageUrl);
  event.dataTransfer.setData("text/plain", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
};

const ImageLibraryContent = () => {
  const requestImageFill = useImageFillStore((state) => state.requestImageFill);
  const recentSearches = useRecentImageSearchStore((s) => s.recentSearches);
  const addRecentSearch = useRecentImageSearchStore((s) => s.addRecentSearch);
  const removeRecentSearch = useRecentImageSearchStore((s) => s.removeRecentSearch);
  const searchInput = useRecentImageSearchStore((s) => s.searchInput);
  const setSearchInput = useRecentImageSearchStore((s) => s.setSearchInput);
  const selectedStyle = useRecentImageSearchStore((s) => s.selectedStyle);
  const setSelectedStyle = useRecentImageSearchStore((s) => s.setSelectedStyle);
  const selectedTags = useRecentImageSearchStore((s) => s.selectedTags);
  const setSelectedTags = useRecentImageSearchStore((s) => s.setSelectedTags);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    // 검색 입력은 디바운스로 묶어 연속 입력 시 쿼리 폭주를 방지한다.
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      style: selectedStyle,
      hashtags: selectedTags,
      keyword: debouncedSearch,
    }),
    [selectedStyle, selectedTags, debouncedSearch],
  );

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useImageLibrary(filters);

  const items = data?.pages.flat() ?? [];

  const toggleTag = (tag: string) => {
    setSelectedTags(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag],
    );
  };

  const handleSelectImage = (url: string, name: string) => {
    // 이미지 클릭 시에만 검색어를 최근 검색에 저장한다.
    if (debouncedSearch) addRecentSearch(debouncedSearch);
    requestImageFill(url, name, INSERT_SIZE, {
      forceInsert: true,
      source: "library",
    });
  };

  return (
    <div className="flex flex-col w-full h-full gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-13-semibold text-black-80">스타일</label>
        <select
          value={selectedStyle}
          onChange={(event) => {
            setSelectedStyle(event.target.value);
          }}
          className="w-full rounded-lg border border-black-25 px-3 py-2.5 text-14-regular text-black-90 focus:outline-none focus:border-primary transition-colors"
        >
          {STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-13-semibold text-black-80">해시태그</label>
        <div className="flex flex-wrap gap-2">
          {HASHTAGS.map((tag) => {
            const isActive = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  toggleTag(tag);
                }}
                className={`rounded-full border px-3 py-1.5 text-12-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary-100 text-primary"
                    : "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-xs text-black-50" />
          <input
            type="text"
            placeholder="이름/검색어로 검색 (예: 사과, 남자아이, 꽃)"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            className="w-full pl-9 pr-4 py-2.5 border border-black-25 rounded-lg text-14-regular text-black-90 placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        {isFetching && !isFetchingNextPage && (
          <span className="text-12-regular text-black-50">검색 중...</span>
        )}
        {recentSearches.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-11-regular text-black-40">최근</span>
            {recentSearches.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-0.5 rounded-full border border-black-20 pl-2.5 pr-1 py-0.5 text-12-regular text-black-60 hover:border-black-40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => { setSearchInput(keyword); }}
                  className="hover:text-black-80"
                >
                  {keyword}
                </button>
                <button
                  type="button"
                  onClick={() => { removeRecentSearch(keyword); }}
                  className="p-0.5 rounded-full hover:bg-black-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-14-regular text-black-50">
            불러오는 중입니다
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-14-regular text-black-50">
            이미지를 불러오지 못했어요.
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                draggable
                onDragStart={(event) => {
                  // 캔버스 드롭 경로와 동일 포맷으로 MIME 데이터를 세팅한다.
                  setDragImageData(event, item.cloudinary_url);
                }}
                onClick={() => {
                  handleSelectImage(item.cloudinary_url, item.name_ko);
                }}
                className="flex flex-col items-center justify-center rounded-lg border border-black-25 p-3 text-left hover:border-primary hover:bg-primary-50 transition-all"
              >
                <img
                  src={getThumbnailUrl(item.cloudinary_url)}
                  alt={item.name_ko}
                  loading="lazy"
                  className="w-full h-24 object-contain rounded-md bg-white"
                />
                <span className="mt-2 w-full truncate text-center text-12-semibold text-black-80">
                  {item.name_ko}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <span className="text-14-regular text-black-50">
              검색 결과가 없어요
            </span>
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-13-semibold text-indigo-600 transition hover:bg-indigo-100"
            >
              <MessageSquarePlus className="h-4 w-4" />
              이미지 요청하기
            </button>
          </div>
        )}

        {hasNextPage && (
          <div className="flex items-center justify-center py-4">
            <button
              type="button"
              onClick={() => {
                fetchNextPage();
              }}
              disabled={isFetchingNextPage}
              className="rounded-lg border border-black-25 px-4 py-2 text-13-semibold text-black-70 hover:border-black-40 hover:bg-black-5 transition-colors disabled:opacity-60"
            >
              {isFetchingNextPage ? "불러오는 중..." : "더보기"}
            </button>
          </div>
        )}

      </div>

      <ImageRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        defaultKeyword={searchInput}
      />
    </div>
  );
};

export default ImageLibraryContent;
