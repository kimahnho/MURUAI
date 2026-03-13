/**
 * 4단계 우측 패널 — 선택한 레이아웃/폰트/그림체로 A4 비율 페이지 미리보기를 표시한다.
 * 페이지를 넘기면서 최종 결과물의 배치를 사전 확인할 수 있다.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

import { useStorybookWizardStore } from "../store/useStorybookWizardStore";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";
import { STORYBOOK_PAGE_COUNT } from "../model/storybookTypes";

const PagePreviewPanel = () => {
  const layout = useStorybookWizardStore((s) => s.formData.layout);
  const fontFamily = useStorybookWizardStore((s) => s.formData.fontFamily);
  const artStyle = useStorybookWizardStore((s) => s.formData.artStyle);
  const editedProposal = useStorybookWizardStore((s) => s.formData.editedProposal);

  const [currentPage, setCurrentPage] = useState(0);

  const selectedPreset = ART_STYLE_PRESETS.find((p) => p.id === artStyle);
  const pages = editedProposal?.pages ?? [];
  const totalPages = Math.max(pages.length, STORYBOOK_PAGE_COUNT);
  const page = pages[currentPage];

  const goToPrev = () => { setCurrentPage((p) => Math.max(0, p - 1)); };
  const goToNext = () => { setCurrentPage((p) => Math.min(totalPages - 1, p + 1)); };

  const isVertical = layout === "vertical";

  return (
    <div className="flex flex-col h-full gap-4">
      <span className="text-14-semibold text-black-60">미리보기</span>

      {/* A4 비율 페이지 프리뷰 — 세로형은 세로 A4, 가로형은 가로 A4 */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          className="bg-white-100 rounded shadow-lg overflow-hidden border border-black-15"
          style={{
            aspectRatio: isVertical ? "210 / 297" : "297 / 210",
            height: isVertical ? "100%" : "auto",
            width: isVertical ? "auto" : "100%",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <div className={`flex h-full ${isVertical ? "flex-col" : "flex-row"}`}>
            {/* 이미지 영역 */}
            <div
              className="relative flex items-center justify-center bg-black-5 overflow-hidden"
              style={{ flex: "1 1 0%", minWidth: 0, minHeight: 0 }}
            >
              {selectedPreset ? (
                <img
                  src={selectedPreset.previewImage}
                  alt={selectedPreset.label}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-black-25">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-12-regular">그림체를 선택하세요</span>
                </div>
              )}
            </div>

            {/* 텍스트 영역 */}
            <div
              className="flex overflow-hidden"
              style={{ flex: "1 1 0%", minWidth: 0, minHeight: 0 }}
            >
              <div className="flex flex-1 flex-col justify-center px-5 py-4">
                <p
                  className="text-14-regular text-black-80 leading-relaxed"
                  style={{ fontFamily }}
                >
                  {page?.textContent || "텍스트가 여기에 표시됩니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 페이지 네비게이션 */}
      <div className="flex items-center justify-center gap-4 shrink-0">
        <button
          type="button"
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="rounded-full p-1.5 text-black-50 hover:bg-black-15 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-13-semibold text-black-60 min-w-14 text-center tabular-nums">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className="rounded-full p-1.5 text-black-50 hover:bg-black-15 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default PagePreviewPanel;
