/**
 * 선택 요소의 변형 액션을 상단에서 빠르게 실행하는 공통 툴바 컴포넌트.
 */
import {
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from "lucide-react";

type TransformToolbarProps = {
  onFlipX: () => void;
  onFlipY: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  position?: "top" | "bottom";
  showFlipX?: boolean;
  showFlipY?: boolean;
  showRotateCW?: boolean;
  showRotateCCW?: boolean;
};

const TransformToolbar = ({
  onFlipX,
  onFlipY,
  onRotateCW,
  onRotateCCW,
  position = "top",
  showFlipX = true,
  showFlipY = true,
  showRotateCW = true,
  showRotateCCW = true,
}: TransformToolbarProps) => {
  // 요소 유형별로 노출 액션이 달라지므로 상위에서 전달한 visibility 플래그를 그룹 단위로 계산한다.
  const positionStyle =
    position === "bottom"
      ? { top: "calc(100% + 28px)" }
      : { bottom: "calc(100% + 8px)" };
  const showFlipGroup = showFlipX || showFlipY;
  const showRotateGroup = showRotateCW || showRotateCCW;
  if (!showFlipGroup && !showRotateGroup) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white-100 border border-black-25 rounded-lg shadow-lg px-2 py-1 z-50"
      style={positionStyle}
      onMouseDown={(event) => {
        // 툴바 클릭이 캔버스 드래그 시작으로 해석되지 않도록 mouse/pointer 이벤트를 모두 차단한다.
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      {showFlipX && (
        <button
          type="button"
          onClick={onFlipX}
          className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
          aria-label="좌우 반전"
        >
          <FlipHorizontal className="w-4 h-4" />
          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
            좌우 반전
          </span>
        </button>
      )}
      {showFlipY && (
        <button
          type="button"
          onClick={onFlipY}
          className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
          aria-label="상하 반전"
        >
          <FlipVertical className="w-4 h-4" />
          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
            상하 반전
          </span>
        </button>
      )}
      {showFlipGroup && showRotateGroup && (
        <div className="w-px h-4 bg-black-25 mx-1" />
      )}
      {showRotateCCW && (
        <button
          type="button"
          onClick={onRotateCCW}
          className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
          aria-label="왼쪽으로 회전"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
            왼쪽으로 회전
          </span>
        </button>
      )}
      {showRotateCW && (
        <button
          type="button"
          onClick={onRotateCW}
          className="group relative flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
          aria-label="오른쪽으로 회전"
        >
          <RotateCw className="w-4 h-4" />
          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
            오른쪽으로 회전
          </span>
        </button>
      )}
    </div>
  );
};

export default TransformToolbar;
