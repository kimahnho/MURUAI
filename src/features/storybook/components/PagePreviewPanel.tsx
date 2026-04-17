/**
 * 설정 단계 우측 A4 비율 프리뷰 패널.
 * 6종 레이아웃 모두에 맞게 이미지/텍스트 배치를 시각화한다.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

import { useStorybookWizardStore } from "../store/useStorybookWizardStore";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";
import { isLandscapeLayout, STORYBOOK_PAGE_COUNT } from "../model/storybookTypes";
import type { PageLayout } from "../model/storybookTypes";

const PagePreviewPanel = () => {
  const layout = useStorybookWizardStore((s) => s.formData.layout);
  const fontFamily = useStorybookWizardStore((s) => s.formData.fontFamily);
  const artStyle = useStorybookWizardStore((s) => s.formData.artStyle);
  const editedProposal = useStorybookWizardStore((s) => s.formData.editedProposal);
  const pageCount = useStorybookWizardStore((s) => s.formData.pageCount);

  const [currentPage, setCurrentPage] = useState(0);

  const selectedPreset = ART_STYLE_PRESETS.find((p) => p.id === artStyle);
  const pages = editedProposal?.pages ?? [];
  const totalPages = Math.max(pages.length, pageCount ?? STORYBOOK_PAGE_COUNT);
  const page = pages[currentPage];

  const goToPrev = () => { setCurrentPage((p) => Math.max(0, p - 1)); };
  const goToNext = () => { setCurrentPage((p) => Math.min(totalPages - 1, p + 1)); };

  const landscape = isLandscapeLayout(layout);
  const aspectRatio = landscape ? "297 / 210" : "210 / 297";
  const textContent = page?.textContent || "텍스트가 여기에 표시됩니다.";

  return (
    <div className="flex flex-col h-full w-full gap-2">
      <span className="text-12-semibold text-black-50 px-1">미리보기</span>

      {/* A4 비율 카드 — 가용 공간 최대 사용 */}
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
        <div
          className="bg-white-100 rounded shadow-lg overflow-hidden border border-black-15 relative"
          style={{
            aspectRatio,
            height: "100%",
            width: "auto",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <LayoutPreviewContent
            layout={layout}
            fontFamily={fontFamily}
            text={textContent}
            previewImage={selectedPreset?.previewImage}
            styleLabel={selectedPreset?.label}
          />
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

// ─── 레이아웃별 내부 렌더링 ───

interface LayoutPreviewContentProps {
  layout: PageLayout;
  fontFamily: string;
  text: string;
  previewImage: string | undefined;
  styleLabel: string | undefined;
}

const LayoutPreviewContent = ({
  layout,
  fontFamily,
  text,
  previewImage,
  styleLabel,
}: LayoutPreviewContentProps) => {
  const imagePane = (
    <div className="relative flex items-center justify-center bg-black-5 overflow-hidden w-full h-full">
      {previewImage ? (
        <img src={previewImage} alt={styleLabel ?? ""} className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-black-25">
          <ImageIcon className="h-10 w-10" />
          <span className="text-12-regular">그림체를 선택하세요</span>
        </div>
      )}
    </div>
  );

  const textPane = (
    <div className="flex flex-col justify-center px-5 py-4 w-full h-full">
      <p
        className="text-14-regular text-black-80 leading-relaxed"
        style={{ fontFamily, wordBreak: "keep-all" }}
      >
        {text}
      </p>
    </div>
  );

  const textOverlay = (position: "top" | "bottom") => (
    <div
      className="absolute left-0 right-0 flex flex-col justify-center px-5 py-3"
      style={{
        [position]: 0,
        height: "25%",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
      }}
    >
      <p
        className="text-13-regular text-black-80 leading-relaxed"
        style={{ fontFamily, wordBreak: "keep-all" }}
      >
        {text}
      </p>
    </div>
  );

  switch (layout) {
    case "vertical":
      return (
        <div className="flex flex-col h-full">
          <div className="flex-[1.5_1_0%] min-h-0">{imagePane}</div>
          <div className="flex-[1_1_0%] min-h-0">{textPane}</div>
        </div>
      );
    case "horizontal":
      return (
        <div className="flex h-full">
          <div className="flex-[1.5_1_0%] min-w-0">{imagePane}</div>
          <div className="flex-[1_1_0%] min-w-0">{textPane}</div>
        </div>
      );
    case "text-top":
      return (
        <div className="flex flex-col h-full">
          <div className="flex-[1_1_0%] min-h-0">{textPane}</div>
          <div className="flex-[1.5_1_0%] min-h-0">{imagePane}</div>
        </div>
      );
    case "text-left":
      return (
        <div className="flex h-full">
          <div className="flex-[1_1_0%] min-w-0">{textPane}</div>
          <div className="flex-[1.5_1_0%] min-w-0">{imagePane}</div>
        </div>
      );
    case "fullscreen-bottom":
      return (
        <div className="relative h-full w-full">
          <div className="absolute inset-0">{imagePane}</div>
          {textOverlay("bottom")}
        </div>
      );
    case "fullscreen-top":
      return (
        <div className="relative h-full w-full">
          <div className="absolute inset-0">{imagePane}</div>
          {textOverlay("top")}
        </div>
      );
    default:
      return (
        <div className="flex flex-col h-full">
          <div className="flex-[1.5_1_0%] min-h-0">{imagePane}</div>
          <div className="flex-[1_1_0%] min-h-0">{textPane}</div>
        </div>
      );
  }
};

export default PagePreviewPanel;
