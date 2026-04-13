/**
 * 스토리 시퀀스 생성 옵션 입력과 생성 실행을 담당하는 모달 컴포넌트.
 */
import { X } from "lucide-react";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import type {
  StoryDirection,
  StoryCardRatio,
} from "@/features/editor/utils/storySequenceUtils";
import PreviewCanvas from "./PreviewCanvas";
import type { PreviewMetrics } from "./previewMetrics";

interface StorySequenceModalProps {
  isOpen: boolean;
  count: number;
  direction: StoryDirection;
  orientation: "vertical" | "horizontal";
  ratio: StoryCardRatio;
  preview: {
    elements: CanvasElement[];
    metrics: PreviewMetrics;
  };
  onClose: () => void;
  onChangeCount: (value: string) => void;
  onSelectDirection: (value: StoryDirection) => void;
  onSelectRatio: (value: StoryCardRatio) => void;
  onSelectOrientation: (value: "vertical" | "horizontal") => void;
  onApply: () => void;
}

const StorySequenceModal = ({
  isOpen,
  count,
  direction,
  orientation,
  ratio,
  preview,
  onClose,
  onChangeCount,
  onSelectDirection,
  onSelectRatio,
  onSelectOrientation,
  onApply,
}: StorySequenceModalProps) => {
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
            이야기 장면 순서 맞추기 설정
          </h2>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">카드 개수</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={count}
                onChange={(event) => {
                  // 입력값 검증/보정은 상위 상태 훅에서 수행하고, 모달은 원본 문자열만 전달한다.
                  onChangeCount(event.target.value);
                }}
                className="w-16 rounded-lg border border-black-25 px-3 py-2 text-center text-14-regular text-black-90"
                min={4}
                max={8}
              />
              <span className="text-12-regular text-black-50">4~8개</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">
              카드 순서 방향
            </span>
            {/* 방향 선택은 화살표 요소 생성 방향과 카드 배치 순서 계산에 동시에 반영된다. */}
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "left-to-right", label: "왼쪽 → 오른쪽" },
                  { value: "top-to-bottom", label: "위 → 아래" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSelectDirection(option.value);
                  }}
                  className={`rounded-lg border px-3 py-2 text-14-semibold transition ${
                    direction === option.value
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-black-25 text-black-70 hover:border-black-40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">카드 비율</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "4:3", label: "4:3" },
                  { value: "16:9", label: "16:9" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onSelectRatio(option.value);
                  }}
                  className={`rounded-lg border px-3 py-2 text-14-semibold transition ${
                    ratio === option.value
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-black-25 text-black-70 hover:border-black-40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">용지 방향</span>
            {/* 용지 방향 전환은 미리보기 캔버스 크기와 실제 생성 페이지 orientation을 함께 바꾼다. */}
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
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-black-25 text-black-70 hover:border-black-40"
                  }`}
                >
                  {value === "vertical" ? "세로" : "가로"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-14-semibold text-black-90">미리보기</span>
            {/* 카드 개수/비율/방향 조합을 적용 결과와 동일한 레이아웃으로 사전 확인한다. */}
            <PreviewCanvas
              pageId="story-preview"
              orientation={orientation}
              elements={preview.elements}
              metrics={preview.metrics}
            />
          </div>

          <button
            type="button"
            onClick={onApply}
            // 적용 버튼은 현재 옵션 스냅샷으로 템플릿 요소를 생성해 캔버스에 일괄 삽입한다.
            className="w-full rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary-700"
          >
            캔버스에 추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorySequenceModal;
