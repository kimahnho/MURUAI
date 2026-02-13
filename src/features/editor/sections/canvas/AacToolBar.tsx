/**
 * AAC 카드 선택 시 노출되는 전용 편집 액션(레이블/이미지/삭제 등)을 제공하는 툴바 컴포넌트.
 */
import { type MouseEvent, type PointerEvent } from "react";
import {
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  EyeOff,
} from "lucide-react";
import type { AacLabelPosition } from "../../utils/aacBoardUtils";

type AacToolBarProps = {
  isVisible: boolean;
  labelPosition: AacLabelPosition;
  onLabelPositionChange: (position: AacLabelPosition) => void;
  onPointerDown?: (event: PointerEvent) => void;
};

const POSITION_OPTIONS: Array<{ id: AacLabelPosition; icon: typeof AlignVerticalJustifyStart; label: string }> = [
  { id: "top", icon: AlignVerticalJustifyStart, label: "상단" },
  { id: "bottom", icon: AlignVerticalJustifyEnd, label: "하단" },
  { id: "none", icon: EyeOff, label: "없음" },
];

const AacToolBar = ({
  isVisible,
  labelPosition,
  onLabelPositionChange,
  onPointerDown,
}: AacToolBarProps) => {
  const handleOptionClick = (event: MouseEvent<HTMLButtonElement>) => {
    // data-position으로 옵션 id를 읽어 공통 클릭 핸들러 하나로 처리한다.
    const nextPosition = event.currentTarget.dataset
      .position as AacLabelPosition | undefined;
    if (!nextPosition) return;
    onLabelPositionChange(nextPosition);
  };

  if (!isVisible) return null;

  return (
    <div
      className="flex items-center gap-2"
      onPointerDown={onPointerDown}
    >
      {/* 라벨 위치 토글은 선택된 AAC 카드의 텍스트-이미지 배치 규칙을 즉시 갱신한다. */}
      <span className="text-12-medium text-black-60">텍스트 위치</span>
      <div className="flex items-center gap-1">
        {POSITION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = labelPosition === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-position={option.id}
              onClick={handleOptionClick}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-black-60 hover:bg-black-10"
              }`}
              title={option.label}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4" />
              <span className="text-12-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AacToolBar;
