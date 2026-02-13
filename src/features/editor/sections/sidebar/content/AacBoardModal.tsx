import { X } from "lucide-react";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import type { AacLabelPosition } from "@/features/editor/utils/aacBoardUtils";
import PreviewCanvas from "./PreviewCanvas";
import type { PreviewMetrics } from "./previewMetrics";

interface AacBoardModalProps {
  isOpen: boolean;
  rows: number;
  columns: number;
  orientation: "vertical" | "horizontal";
  labelPosition: AacLabelPosition;
  preview: {
    elements: CanvasElement[];
    metrics: PreviewMetrics;
  };
  onClose: () => void;
  onChangeRows: (value: string) => void;
  onChangeColumns: (value: string) => void;
  onSelectOrientation: (value: "vertical" | "horizontal") => void;
  onSelectLabelPosition: (value: AacLabelPosition) => void;
  onApply: () => void;
}

const AacBoardModal = ({
  isOpen,
  rows,
  columns,
  orientation,
  labelPosition,
  preview,
  onClose,
  onChangeRows,
  onChangeColumns,
  onSelectOrientation,
  onSelectLabelPosition,
  onApply,
}: AacBoardModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black-90/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white-100 p-6 shadow-xl">
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
            AAC 의사소통 판 설정
          </h2>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">판 개수</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={rows}
                onChange={(event) => {
                  onChangeRows(event.target.value);
                }}
                className="w-16 rounded-lg border border-black-25 px-3 py-2 text-center text-14-regular text-black-90"
                min={1}
                max={5}
              />
              <span className="text-14-regular text-black-70">X</span>
              <input
                type="number"
                value={columns}
                onChange={(event) => {
                  onChangeColumns(event.target.value);
                }}
                className="w-16 rounded-lg border border-black-25 px-3 py-2 text-center text-14-regular text-black-90"
                min={1}
                max={5}
              />
              <span className="text-12-regular text-black-50">
                최대 5 X 5
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">용지 방향</span>
            <div className="flex gap-2">
              {(["vertical", "horizontal"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    onSelectOrientation(value);
                  }}
                  className={`flex-1 rounded-lg border px-4 py-2 text-14-semibold transition ${
                    orientation === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-black-25 text-black-70 hover:border-black-40"
                  }`}
                >
                  {value === "vertical" ? "세로" : "가로"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">
              텍스트 위치
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "top", label: "상징 위" },
                  { value: "bottom", label: "상징 아래" },
                  { value: "none", label: "없음" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSelectLabelPosition(option.value);
                  }}
                  className={`rounded-lg border px-3 py-2 text-14-semibold transition ${
                    labelPosition === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-black-25 text-black-70 hover:border-black-40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-14-semibold text-black-90">미리보기</span>
            <PreviewCanvas
              pageId="aac-preview"
              orientation={orientation}
              elements={preview.elements}
              metrics={preview.metrics}
            />
          </div>

          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary/90"
          >
            캔버스에 추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default AacBoardModal;
