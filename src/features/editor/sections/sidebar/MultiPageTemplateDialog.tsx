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
  const [selectedPages, setSelectedPages] = useState<Set<number>>(
    () => new Set(pages.map((_, i) => i))
  );
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
    const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
    if (sortedIndices.length === 0) return;
    onApplySelected(sortedIndices);
  };

  const previewScale = 0.35;
  const scaledWidth = PAGE_WIDTH_PX * previewScale;
  const scaledHeight = PAGE_HEIGHT_PX * previewScale;

  const thumbnailScale = 0.12;
  const thumbnailWidth = PAGE_WIDTH_PX * thumbnailScale;
  const thumbnailHeight = PAGE_HEIGHT_PX * thumbnailScale;

  const canPrev = currentPreviewIndex > 0;
  const canNext = currentPreviewIndex < pages.length - 1;

  const allSelected = selectedPages.size === pages.length;
  const noneSelected = selectedPages.size === 0;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black-90/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg p-1 text-black-60 transition hover:bg-black-10 hover:text-black-100"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-title-20-semibold text-black-100">
            {templateLabel}
          </h2>
          <p className="text-14-regular text-black-60 mt-1">
            총 {pages.length}페이지 구성 · 적용할 페이지를 선택하세요
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-14-semibold text-black-90">
                페이지 {currentPreviewIndex + 1} / {pages.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canPrev && setCurrentPreviewIndex((prev) => prev - 1)}
                  disabled={!canPrev}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                    canPrev
                      ? "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
                      : "border-black-10 text-black-30 cursor-not-allowed"
                  }`}
                  aria-label="이전 페이지"
                >
                  <ChevronLeft className="icon-s" />
                </button>
                <button
                  type="button"
                  onClick={() => canNext && setCurrentPreviewIndex((prev) => prev + 1)}
                  disabled={!canNext}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                    canNext
                      ? "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
                      : "border-black-10 text-black-30 cursor-not-allowed"
                  }`}
                  aria-label="다음 페이지"
                >
                  <ChevronRight className="icon-s" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-xl border border-black-25 bg-black-5 p-4">
              <div
                className="relative overflow-hidden rounded-lg border border-black-25 bg-white-100 shadow-sm"
                style={{
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                }}
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
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-14-semibold text-black-90">페이지 선택</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allSelected}
                  className={`px-3 py-1 text-12-medium rounded-lg transition ${
                    allSelected
                      ? "text-black-30 cursor-not-allowed"
                      : "text-primary hover:bg-primary/5"
                  }`}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={noneSelected}
                  className={`px-3 py-1 text-12-medium rounded-lg transition ${
                    noneSelected
                      ? "text-black-30 cursor-not-allowed"
                      : "text-black-60 hover:bg-black-5"
                  }`}
                >
                  선택 해제
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {pages.map((page, index) => {
                const isSelected = selectedPages.has(index);
                const isViewing = currentPreviewIndex === index;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        togglePage(index);
                        setCurrentPreviewIndex(index);
                      }}
                      className={`relative overflow-hidden rounded-lg border-2 transition ${
                        isViewing
                          ? "border-primary shadow-md"
                          : isSelected
                          ? "border-primary/50"
                          : "border-black-25 hover:border-black-40"
                      }`}
                      style={{
                        width: `${thumbnailWidth}px`,
                        height: `${thumbnailHeight}px`,
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

                      <div
                        className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-white-100 border border-black-25"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                    <span
                      className={`text-12-medium ${
                        isViewing ? "text-primary" : "text-black-60"
                      }`}
                    >
                      {index + 1}페이지
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onApplyAll}
              className="flex-1 rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary/90"
            >
              전체 페이지 적용 ({pages.length}페이지)
            </button>
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={noneSelected}
              className={`flex-1 rounded-lg border py-3 text-14-semibold transition ${
                noneSelected
                  ? "border-black-10 text-black-30 cursor-not-allowed"
                  : "border-primary text-primary hover:bg-primary/5"
              }`}
            >
              선택한 페이지만 적용 ({selectedPages.size}페이지)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiPageTemplateDialog;
