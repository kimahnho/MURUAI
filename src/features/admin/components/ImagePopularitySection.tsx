/**
 * 기간 내 가장 많이 사용된 이미지를 랭킹 형태로 보여주는 관리자 대시보드 섹션.
 */
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import Badge from "@/shared/ui/Badge";
import Spinner from "@/shared/ui/Spinner";
import { fetchTopImages } from "../api/adminMetrics";
import type { TopImageItem, AdminDateRange } from "../api/adminMetrics";

const SOURCE_LABELS: Record<string, string> = {
  emotion: "감정",
  aac: "AAC",
  library: "라이브러리",
  upload: "업로드",
  ai: "AI 생성",
};

const SOURCE_VARIANTS: Record<
  string,
  "default" | "primary" | "success" | "warning" | "error"
> = {
  emotion: "primary",
  aac: "success",
  library: "default",
  upload: "warning",
  ai: "error",
};

const ImagePopularitySection = ({
  range,
  isLoading: parentLoading,
}: {
  range: AdminDateRange;
  isLoading: boolean;
}) => {
  const [items, setItems] = useState<TopImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const result = await fetchTopImages(range, 20);
      if (!cancelled) {
        setItems(result);
        setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end]);

  const loading = parentLoading || isLoading;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-black-50" />
        <span className="text-14-semibold text-black-90">
          인기 이미지 (사용 빈도)
        </span>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
          이미지 사용 데이터가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item, index) => (
            <div
              key={item.image_url}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 p-2 transition hover:border-primary-200 hover:bg-primary-50"
            >
              {/* 순위 + 사용 횟수 */}
              <div className="flex items-center justify-between">
                <span className="text-12-semibold text-black-50">
                  #{index + 1}
                </span>
                <span className="text-13-bold text-primary">
                  {item.usage_count}회
                </span>
              </div>

              {/* 이미지 썸네일 */}
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black-5">
                <img
                  src={item.image_url}
                  alt={item.label ?? "이미지"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              {/* 소스 뱃지 + 라벨 */}
              <div className="flex flex-col gap-1">
                <Badge
                  variant={SOURCE_VARIANTS[item.source] ?? "default"}
                >
                  {SOURCE_LABELS[item.source] ?? item.source}
                </Badge>
                {item.label && (
                  <span className="min-w-0 truncate text-12-regular text-black-70">
                    {item.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImagePopularitySection;
