/**
 * 다중 페이지 템플릿 미리보기/적용 다이얼로그.
 * 템플릿 페이지를 탐색하고 적용 대상을 선택해 편집 문서에 반영한다.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import type { Template, CanvasElement, TemplateElement } from "@/features/editor/model/canvasTypes";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import { fitTemplateTextElement } from "@/features/editor/utils/templateTextFit";

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;

type MultiPageTemplateDialogProps = {
  open: boolean;
  templateLabel: string;
  pages: Template[];
  onClose: () => void;
  onApplyAll: () => void;
  onApplySelected: (selectedIndices: number[]) => void;
};

const addElementId = (element: TemplateElement, id: string): CanvasElement => ({
  ...(element as CanvasElement),
  id,
});

const toPreviewElements = (template: Template, pageIndex: number): CanvasElement[] =>
  template.elements.map((element, index) =>
    addElementId(fitTemplateTextElement(element), `preview-${pageIndex}-${index}`)
  );

const MultiPageTemplateDialog = ({
  open,
  templateLabel,
  pages,
  onClose,
  onApplyAll,
  onApplySelected,
}: MultiPageTemplateDialogProps) => {
  // 기본값을 "전체 선택"으로 시작해 다중 페이지 템플릿 적용 시 누락 페이지가 생기지 않게 한다.
  const [selectedPages, setSelectedPages] = useState<Set<number>>(
    () => new Set(pages.map((_, i) => i))
  );
  // 좌측 큰 미리보기와 우측 썸네일 포커스를 같은 인덱스로 유지한다.
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  if (!open) return null;

  const togglePage = (index: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(new Set(pages.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const handleApplySelected = () => {
    // 적용 순서는 페이지 인덱스 오름차순으로 고정해 문서 삽입 순서가 사용자 선택 순서에 흔들리지 않게 한다.
    const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
    if (sortedIndices.length === 0) return;
    onApplySelected(sortedIndices);
  };

  const thumbnailScale = 0.13;
  const thumbnailWidth = PAGE_WIDTH_PX * thumbnailScale;
  const thumbnailHeight = PAGE_HEIGHT_PX * thumbnailScale;

  const previewScale = 0.32;
  const scaledWidth = PAGE_WIDTH_PX * previewScale;
  const scaledHeight = PAGE_HEIGHT_PX * previewScale;

  const canPrev = currentPreviewIndex > 0;
  const canNext = currentPreviewIndex < pages.length - 1;

  const allSelected = selectedPages.size === pages.length;
  const noneSelected = selectedPages.size === 0;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black-90/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white-100 shadow-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
        {/* 헤더 */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-black-10 shrink-0">
          <div>
            <h2 className="text-title-20-semibold text-black-100">{templateLabel}</h2>
            <p className="text-13-regular text-black-50 mt-0.5">
              총 {pages.length}페이지 · 적용할 페이지를 선택하세요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-black-50 transition hover:bg-black-10 hover:text-black-90"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문: 좌우 2컬럼 */}
        <div className="flex flex-1 min-h-0">
          {/* 좌측: 큰 미리보기 + 페이지 네비게이션 */}
          <div className="flex flex-col items-center justify-between px-6 py-4 bg-black-5 border-r border-black-10 shrink-0">
            <div
              className="relative overflow-hidden rounded-xl border border-black-25 bg-white-100 shadow-sm"
              style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
            >
              <div
                style={{
                  width: `${PAGE_WIDTH_PX}px`,
                  height: `${PAGE_HEIGHT_PX}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              >
                <DesignPaper
                  pageId={`main-preview-${currentPreviewIndex}`}
                  orientation="vertical"
                  elements={toPreviewElements(pages[currentPreviewIndex], currentPreviewIndex)}
                  selectedIds={[]}
                  editingTextId={null}
                  readOnly
                />
              </div>
            </div>

            {/* 페이지 네비게이션 */}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => canPrev && setCurrentPreviewIndex((prev) => prev - 1)}
                disabled={!canPrev}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  canPrev
                    ? "border-black-25 text-black-70 hover:border-black-40 hover:bg-white-100"
                    : "border-black-10 text-black-25 cursor-not-allowed"
                }`}
                aria-label="이전 페이지"
              >
                <ChevronLeft className="icon-s" />
              </button>
              <span className="text-13-medium text-black-60 min-w-12 text-center">
                {currentPreviewIndex + 1} / {pages.length}
              </span>
              <button
                type="button"
                onClick={() => canNext && setCurrentPreviewIndex((prev) => prev + 1)}
                disabled={!canNext}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                  canNext
                    ? "border-black-25 text-black-70 hover:border-black-40 hover:bg-white-100"
                    : "border-black-10 text-black-25 cursor-not-allowed"
                }`}
                aria-label="다음 페이지"
              >
                <ChevronRight className="icon-s" />
              </button>
            </div>
          </div>

          {/* 우측: 페이지 선택 + 액션 버튼 */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 px-6 py-4">
            {/* 페이지 선택 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-14-semibold text-black-90">페이지 선택</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className={`px-2 py-1 text-12-medium rounded transition ${
                    allSelected ? "text-black-25 cursor-not-allowed" : "text-primary hover:bg-primary-50"
                  }`}
                >
                  전체 선택
                </button>
                <span className="text-black-25 text-12-regular">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={noneSelected}
                  className={`px-2 py-1 text-12-medium rounded transition ${
                    noneSelected ? "text-black-25 cursor-not-allowed" : "text-black-50 hover:bg-black-5"
                  }`}
                >
                  선택 해제
                </button>
              </div>
            </div>

            {/* 썸네일 그리드: 4페이지 이하는 스크롤 없이, 그 이상은 스크롤 */}
            <div className="grid grid-cols-2 gap-3 content-start flex-1 min-h-0 overflow-y-auto">
              {pages.map((page, index) => {
                const isSelected = selectedPages.has(index);

                return (
                  <div key={index} className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        // 썸네일 클릭으로 "미리보기 전환"과 "선택 토글"을 동시에 수행한다.
                        setCurrentPreviewIndex(index);
                        togglePage(index);
                      }}
                      className="relative overflow-hidden rounded-lg border-2 outline-none transition"
                      style={{
                        width: `${thumbnailWidth}px`,
                        height: `${thumbnailHeight}px`,
                        borderColor: isSelected ? "var(--primary)" : "transparent",
                      }}
                    >
                      <div
                        style={{
                          width: `${PAGE_WIDTH_PX}px`,
                          height: `${PAGE_HEIGHT_PX}px`,
                          transform: `scale(${thumbnailScale})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        <DesignPaper
                          pageId={`thumbnail-${index}`}
                          orientation="vertical"
                          elements={toPreviewElements(page, index)}
                          selectedIds={[]}
                          editingTextId={null}
                          readOnly
                        />
                      </div>
                      {/* 선택 상태 체크 오버레이 */}
                      <div
                        className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition ${
                          isSelected
                            ? "bg-primary text-white-100"
                            : "bg-white-100/80 border border-black-25"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                    <span className={`text-12-medium ${isSelected ? "text-primary" : "text-black-50"}`}>
                      {index + 1}페이지
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-black-10">
              <button
                type="button"
                onClick={onApplyAll}
                className="w-full rounded-xl bg-primary py-2.5 text-14-semibold text-white-100 transition hover:bg-primary-700"
              >
                전체 적용 ({pages.length}페이지)
              </button>
              <button
                type="button"
                onClick={handleApplySelected}
                disabled={noneSelected}
                className={`w-full rounded-xl border py-2.5 text-14-semibold transition ${
                  noneSelected
                    ? "border-black-10 text-black-25 cursor-not-allowed"
                    : "border-primary text-primary hover:bg-primary-50"
                }`}
              >
                선택 적용 ({selectedPages.size}페이지)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiPageTemplateDialog;
