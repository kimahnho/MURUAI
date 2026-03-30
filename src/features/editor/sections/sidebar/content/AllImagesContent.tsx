/**
 * "전체" 탭 — 최근 사용한 이미지 + 모든 소스의 이미지를 통합 그리드로 표시하는 컴포넌트.
 */
import { useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { useImageFillStore } from "@/features/editor/store/imageFillStore";
import {
  useRecentImageUsageStore,
  type RecentImage,
} from "@/features/editor/store/recentImageUsageStore";
import { useEmotionPhotos } from "../hooks/useEmotionPhotos";
import { useEmotionEmojis } from "../hooks/useEmotionEmojis";
import { useEmotionStickers } from "../hooks/useEmotionStickers";
import { useAacCards } from "../hooks/useAacCards";
import { useImageLibrary } from "../hooks/useImageLibrary";
import { getThumbnailUrl } from "@/shared/api/getThumbnailUrl";

type UnifiedImage = {
  id: string;
  url: string;
  label: string;
  source: "emotion" | "aac" | "library";
  thumbnailUrl?: string;
};

const MAX_INSERT_SIZE = 256;
const DEFAULT_VISIBLE_RECENT = 4;

const normalizeQuery = (value: string) => value.trim().toLowerCase();

const setDragImageData = (
  event: ReactDragEvent<HTMLElement>,
  imageUrl: string,
) => {
  event.dataTransfer.setData("application/x-muru-image", imageUrl);
  event.dataTransfer.setData("text/plain", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
};

const AllImagesContent = ({
  externalSearch,
}: {
  externalSearch?: string;
}) => {
  const requestImageFill = useImageFillStore((s) => s.requestImageFill);
  const recentImages = useRecentImageUsageStore((s) => s.recentImages);
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);

  // 모든 소스에서 이미지 fetch
  const { data: emotionPhotos } = useEmotionPhotos();
  const { data: emotionEmojis } = useEmotionEmojis();
  const { data: emotionStickers } = useEmotionStickers();
  const { data: aacCards } = useAacCards();

  const filters = useMemo(
    () => ({ style: "", hashtags: [] as string[], keyword: externalSearch?.trim() ?? "" }),
    [externalSearch],
  );
  const {
    data: libraryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useImageLibrary(filters);

  // 통합 이미지 목록 구성
  const allImages = useMemo(() => {
    const images: UnifiedImage[] = [];

    for (const photo of emotionPhotos ?? []) {
      images.push({ id: `ep-${photo.id}`, url: photo.url, label: photo.label, source: "emotion" });
    }
    for (const emoji of emotionEmojis ?? []) {
      images.push({ id: `ee-${emoji.id}`, url: emoji.url, label: emoji.label, source: "emotion" });
    }
    for (const sticker of emotionStickers ?? []) {
      images.push({ id: `es-${sticker.id}`, url: sticker.url, label: sticker.label, source: "emotion" });
    }
    for (const card of aacCards ?? []) {
      images.push({ id: `aac-${card.id}`, url: card.url, label: card.alt, source: "aac" });
    }
    for (const page of libraryData?.pages ?? []) {
      for (const item of page) {
        images.push({
          id: `lib-${item.id}`,
          url: item.cloudinary_url,
          label: item.name_ko,
          source: "library",
          thumbnailUrl: getThumbnailUrl(item.cloudinary_url),
        });
      }
    }

    return images;
  }, [emotionPhotos, emotionEmojis, emotionStickers, aacCards, libraryData]);

  // 검색 필터 (감정/AAC 이미지만 — 라이브러리는 서버 필터링)
  const query = normalizeQuery(externalSearch ?? "");
  const filteredImages = useMemo(() => {
    if (query.length === 0) return allImages;
    return allImages.filter((img) => img.label.toLowerCase().includes(query));
  }, [allImages, query]);

  const visibleRecent = isRecentExpanded
    ? recentImages
    : recentImages.slice(0, DEFAULT_VISIBLE_RECENT);

  // 무한 스크롤
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      void fetchNextPage();
    }
  };

  const handleImageClick = (img: UnifiedImage | RecentImage) => {
    const url = img.url;
    const label = img.label;
    const source = img.source;

    if (source === "library") {
      const imgEl = new window.Image();
      imgEl.onload = () => {
        const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
        const width = ratio >= 1 ? MAX_INSERT_SIZE : Math.round(MAX_INSERT_SIZE * ratio);
        const height = ratio >= 1 ? Math.round(MAX_INSERT_SIZE / ratio) : MAX_INSERT_SIZE;
        requestImageFill(url, label, { width, height }, { forceInsert: true, source: "library" });
      };
      imgEl.onerror = () => {
        requestImageFill(url, label, { width: MAX_INSERT_SIZE, height: MAX_INSERT_SIZE }, { forceInsert: true, source: "library" });
      };
      imgEl.src = url;
    } else if (source === "emotion") {
      requestImageFill(url, label, { width: 200, height: 260 }, { forceInsert: true, source });
    } else {
      requestImageFill(url, label, { width: 200, height: 200 }, { forceInsert: true, source });
    }
  };

  const renderImageCard = (img: UnifiedImage | RecentImage, key: string) => (
    <button
      key={key}
      type="button"
      draggable
      onDragStart={(event) => { setDragImageData(event, img.url); }}
      onClick={() => { handleImageClick(img); }}
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-black-25 hover:border-primary hover:bg-primary-50 transition-all cursor-pointer group"
    >
      <div className="w-full aspect-square rounded-md flex items-center justify-center overflow-hidden bg-black-5">
        <img
          src={"thumbnailUrl" in img && img.thumbnailUrl ? img.thumbnailUrl : img.url}
          alt={img.label}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
      <span className="text-12-medium text-black-70 truncate w-full text-center group-hover:text-primary transition-colors">
        {img.label}
      </span>
    </button>
  );

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-hide"
    >
      {/* 최근 사용한 이미지 — 검색 중에는 숨김 */}
      {query.length === 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { setIsRecentExpanded((prev) => !prev); }}
            className="flex items-center justify-between w-full"
          >
            <span className="text-13-bold text-black-80">최근 사용한 이미지</span>
            {recentImages.length > DEFAULT_VISIBLE_RECENT && (
              isRecentExpanded
                ? <ChevronUp className="h-4 w-4 text-black-50" />
                : <ChevronDown className="h-4 w-4 text-black-50" />
            )}
          </button>

          {recentImages.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-13-regular text-black-40">
              최근 사용한 이미지가 없어요.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {visibleRecent.map((img, idx) =>
                renderImageCard(img, `recent-${idx}-${img.url}`),
              )}
            </div>
          )}
        </div>
      )}

      {/* 전체 이미지 */}
      <div className="flex flex-col gap-2">
        {query.length === 0 && <span className="text-13-bold text-black-80">전체</span>}
        {filteredImages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-14-regular text-black-50">
            검색 결과가 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredImages.map((img) => renderImageCard(img, img.id))}
          </div>
        )}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4 text-12-regular text-black-50">
            불러오는 중...
          </div>
        )}
      </div>
    </div>
  );
};

export default AllImagesContent;
