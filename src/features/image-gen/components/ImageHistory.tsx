/**
 * 이미지 생성 이력 — 우측 하단 썸네일 그리드
 */
import type { GeneratedImage } from "../model/types";
import { useImageGenStore } from "../store/useImageGenStore";

export function ImageHistory() {
  const history = useImageGenStore((s) => s.history);
  const setCurrentImage = useImageGenStore((s) => s.setCurrentImage);

  if (history.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-gray-400">아직 생성한 이미지가 없어요</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h3 className="mb-2 text-sm font-bold text-gray-900">최근 생성</h3>
      <div className="grid grid-cols-3 gap-2">
        {history.slice(0, 9).map((img) => (
          <button
            key={img.id}
            onClick={() => setCurrentImage(img)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition hover:border-violet-300"
          >
            <img
              src={img.imageUrl}
              alt={img.prompt}
              className="h-full w-full object-cover"
            />
            {img.feedback === "liked" && (
              <span className="absolute bottom-1 right-1 text-xs">👍</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
