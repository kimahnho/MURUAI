import { FlipHorizontal, FlipVertical, RotateCcw, RotateCw } from "lucide-react";

type TransformToolbarProps = {
  onFlipX: () => void;
  onFlipY: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
};

const TransformToolbar = ({
  onFlipX,
  onFlipY,
  onRotateCW,
  onRotateCCW,
}: TransformToolbarProps) => {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white-100 border border-black-25 rounded-lg shadow-lg px-2 py-1"
      style={{ bottom: "calc(100% + 8px)" }}
      onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onPointerDown={(event) => { event.stopPropagation(); }}
    >
      <button
        type="button"
        onClick={onFlipX}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
        aria-label="좌우 반전"
        title="좌우 반전"
      >
        <FlipHorizontal className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onFlipY}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
        aria-label="상하 반전"
        title="상하 반전"
      >
        <FlipVertical className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-black-25 mx-1" />
      <button
        type="button"
        onClick={onRotateCCW}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
        aria-label="반시계 방향 90도 회전"
        title="반시계 방향 90도 회전"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRotateCW}
        className="flex items-center justify-center w-7 h-7 rounded hover:bg-black-10 text-black-70 hover:text-black-90"
        aria-label="시계 방향 90도 회전"
        title="시계 방향 90도 회전"
      >
        <RotateCw className="w-4 h-4" />
      </button>
    </div>
  );
};

export default TransformToolbar;
