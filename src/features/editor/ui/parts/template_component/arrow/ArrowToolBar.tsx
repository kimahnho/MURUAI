import { RotateCw } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ColorPickerPopover from "../../ColorPickerPopover";
import { useNumberInput } from "../../../../model/useNumberInput";
import { clamp } from "../../../../utils/domUtils";

interface ArrowToolBarProps {
  isVisible: boolean;
  color: string;
  width: number;
  style?: "solid" | "dashed" | "dotted";
  minWidth?: number;
  maxWidth?: number;
  length?: number;
  angle?: number;
  onColorChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onStyleChange?: (value: "solid" | "dashed" | "dotted") => void;
  onLengthChange?: (value: number) => void;
  onAngleChange?: (value: number) => void;
  onRotatePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const ArrowToolBar = ({
  isVisible,
  color,
  width,
  style = "solid",
  minWidth = 1,
  maxWidth = 20,
  length,
  angle,
  onColorChange,
  onWidthChange,
  onStyleChange,
  onLengthChange,
  onAngleChange,
  onRotatePointerDown,
  onPointerDown,
}: ArrowToolBarProps) => {
  const widthInput = useNumberInput({
    value: width,
    min: minWidth,
    max: maxWidth,
    onChange: onWidthChange,
  });

  const lengthInput = useNumberInput({
    value: length ?? 0,
    min: 1,
    max: 9999,
    onChange: onLengthChange ?? (() => {}),
  });

  const angleInput = useNumberInput({
    value: angle ?? 0,
    min: 0,
    max: 359,
    onChange: onAngleChange ?? (() => {}),
  });

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3" onPointerDown={onPointerDown}>
      <button
        type="button"
        onPointerDown={onRotatePointerDown}
        className="flex h-7 items-center gap-1 rounded border border-black-30 px-2 text-14-regular text-black-70 hover:border-primary hover:text-primary transition-colors"
        aria-label="Rotate arrow"
      >
        <RotateCw className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-14-regular text-black-60">선 종류</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onStyleChange?.("solid")}
            className={`flex h-8 w-12 items-center justify-center rounded border ${
              style === "solid"
                ? "border-blue-500 bg-blue-50"
                : "border-black-30 bg-white hover:bg-black-5"
            }`}
            title="실선"
          >
            <svg width="32" height="2" viewBox="0 0 32 2">
              <line
                x1="0"
                y1="1"
                x2="32"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onStyleChange?.("dashed")}
            className={`flex h-8 w-12 items-center justify-center rounded border ${
              style === "dashed"
                ? "border-blue-500 bg-blue-50"
                : "border-black-30 bg-white hover:bg-black-5"
            }`}
            title="긴 점선"
          >
            <svg width="32" height="2" viewBox="0 0 32 2">
              <line
                x1="0"
                y1="1"
                x2="32"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onStyleChange?.("dotted")}
            className={`flex h-8 w-12 items-center justify-center rounded border ${
              style === "dotted"
                ? "border-blue-500 bg-blue-50"
                : "border-black-30 bg-white hover:bg-black-5"
            }`}
            title="점선"
          >
            <svg width="32" height="2" viewBox="0 0 32 2">
              <line
                x1="0"
                y1="1"
                x2="32"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="2 3"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-center text-14-regular text-black-60">
        굵기
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={minWidth}
          max={maxWidth}
          value={width}
          onChange={(event) => {
            onWidthChange(
              clamp(Number(event.target.value), minWidth, maxWidth),
            );
          }}
          className="w-28"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={widthInput.displayValue}
          onChange={(event) => {
            widthInput.handleChange(event.target.value);
          }}
          onBlur={widthInput.handleBlur}
          onFocus={widthInput.handleFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              widthInput.commit();
              event.currentTarget.blur();
            }
          }}
          className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-14-regular text-black-60">색상</span>
        <ColorPickerPopover value={color} onChange={onColorChange} />
      </div>

      {length !== undefined && onLengthChange && (
        <div className="flex items-center gap-2">
          <span className="text-14-regular text-black-60">길이</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={lengthInput.displayValue}
            onChange={(event) => {
              lengthInput.handleChange(event.target.value);
            }}
            onBlur={lengthInput.handleBlur}
            onFocus={lengthInput.handleFocus}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                lengthInput.commit();
                event.currentTarget.blur();
              }
            }}
            className="no-spinner w-14 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
          />
        </div>
      )}

      {angle !== undefined && onAngleChange && (
        <div className="flex items-center gap-2">
          <span className="text-14-regular text-black-60">각도</span>
          <input
            type="number"
            min={0}
            max={359}
            step={1}
            value={angleInput.displayValue}
            onChange={(event) => {
              angleInput.handleChange(event.target.value);
            }}
            onBlur={angleInput.handleBlur}
            onFocus={angleInput.handleFocus}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                angleInput.commit();
                event.currentTarget.blur();
              }
            }}
            className="no-spinner w-14 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
          />
          <span className="text-14-regular text-black-60">°</span>
        </div>
      )}
    </div>
  );
};

export default ArrowToolBar;
