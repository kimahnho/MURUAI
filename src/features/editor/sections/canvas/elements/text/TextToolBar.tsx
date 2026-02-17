/**
 * 텍스트 요소의 글꼴/정렬/강조 스타일 편집 액션을 제공하는 툴바 컴포넌트.
 */
import { useState } from "react";
import {
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignStartHorizontal,
  Italic,
  Strikethrough,
  TextAlignCenter,
  TextAlignStart,
  TextAlignEnd,
  Underline,
} from "lucide-react";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";

interface TextToolBarProps {
  isVisible: boolean;
  minFontSize: number;
  maxFontSize: number;
  fontSize: number;
  fontSizeDisplay: string;
  isFontSizeMixed: boolean;
  fontFamily: string;
  fontLabel: string;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  isBold: boolean;
  isUnderline: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  align: "left" | "center" | "right";
  alignY: "top" | "middle" | "bottom";
  onFontSizeStep: (delta: number) => void;
  fontSizeInputValue: string;
  isFontSizeInputDirty: boolean;
  onFontSizeInputChange: (value: string) => void;
  onFontSizeInputCommit: () => void;
  onFontSizeInputCancel: () => void;
  onFontSizeInputFocus: () => void;
  onFontSizeInputBlur: () => void;
  onToolbarInputFocus: () => void;
  onToolbarInputBlur: () => void;
  onLineHeightChange: (value: number) => void;
  onLetterSpacingChange: (value: number) => void;
  onColorChange: (value: string) => void;
  onFontFamilyClick: () => void;
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onToggleItalic: () => void;
  onToggleStrikethrough: () => void;
  onAlignChange: (value: "left" | "center" | "right") => void;
  onAlignYChange: (value: "top" | "middle" | "bottom") => void;
}

const TextToolBar = ({
  isVisible,
  minFontSize,
  maxFontSize,
  fontSize,
  fontSizeDisplay,
  isFontSizeMixed,
  fontFamily,
  fontLabel,
  lineHeight,
  letterSpacing,
  color,
  isBold,
  isUnderline,
  isItalic,
  isStrikethrough,
  align,
  alignY,
  onFontSizeStep,
  fontSizeInputValue,
  isFontSizeInputDirty,
  onFontSizeInputChange,
  onFontSizeInputCommit,
  onFontSizeInputCancel,
  onFontSizeInputFocus,
  onFontSizeInputBlur,
  onToolbarInputFocus,
  onToolbarInputBlur,
  onLineHeightChange,
  onLetterSpacingChange,
  onColorChange,
  onFontFamilyClick,
  onToggleBold,
  onToggleUnderline,
  onToggleItalic,
  onToggleStrikethrough,
  onAlignChange,
  onAlignYChange,
}: TextToolBarProps) => {
  const clampLineHeight = (value: number) => Math.min(5, Math.max(0.5, value));
  const clampLetterSpacing = (value: number) =>
    Math.min(20, Math.max(-10, value));
  const formatNumber = (value: number) => String(Math.round(value * 100) / 100);
  const [lineHeightInput, setLineHeightInput] = useState(() =>
    formatNumber(lineHeight),
  );
  const [isLineHeightEditing, setIsLineHeightEditing] = useState(false);
  const [letterSpacingInput, setLetterSpacingInput] = useState(() =>
    formatNumber(letterSpacing),
  );
  const [isLetterSpacingEditing, setIsLetterSpacingEditing] = useState(false);

  if (!isVisible) return null;

  const commitLineHeightInput = () => {
    const trimmed = lineHeightInput.trim();
    if (!trimmed) {
      setLineHeightInput(formatNumber(lineHeight));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setLineHeightInput(formatNumber(lineHeight));
      return;
    }
    const clamped = clampLineHeight(nextValue);
    onLineHeightChange(clamped);
    setLineHeightInput(formatNumber(clamped));
  };

  const commitLetterSpacingInput = () => {
    const trimmed = letterSpacingInput.trim();
    if (!trimmed) {
      setLetterSpacingInput(formatNumber(letterSpacing));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue)) {
      setLetterSpacingInput(formatNumber(letterSpacing));
      return;
    }
    const clamped = clampLetterSpacing(nextValue);
    onLetterSpacingChange(clamped);
    setLetterSpacingInput(formatNumber(clamped));
  };

  return (
    <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onFontFamilyClick}
        className="flex items-center gap-2 rounded border border-black-30 px-2 py-1 text-14-regular text-black-70 hover:border-primary hover:text-primary"
      >
        <span className="text-black-60">글꼴</span>
        <span className="text-black-90" style={{ fontFamily }}>
          {fontLabel}
        </span>
      </button>
      <div className="flex items-center text-14-regular text-black-60">
        텍스트 크기
      </div>
      <div className="flex items-center gap-1 rounded border border-black-30 px-1">
        <button
          type="button"
          onClick={() => {
            onFontSizeStep(-1);
          }}
          className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
          aria-label="Decrease font size"
        >
          -
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          role="spinbutton"
          aria-label="Font size input"
          aria-valuemin={minFontSize}
          aria-valuemax={maxFontSize}
          aria-valuenow={fontSize}
          value={fontSizeInputValue}
          onChange={(event) => {
            onFontSizeInputChange(event.target.value);
          }}
          onFocus={(event) => {
            onFontSizeInputFocus();
            event.target.select();
          }}
          onBlur={() => {
            onFontSizeInputCommit();
            onFontSizeInputBlur();
            onToolbarInputBlur();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            const input = event.currentTarget;
            requestAnimationFrame(() => {
              input.focus();
            });
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onFontSizeInputCommit();
              event.currentTarget.blur();
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onFontSizeInputCancel();
              event.currentTarget.blur();
            }
          }}
          className="no-spinner w-12 appearance-none border-x border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
          style={{
            textAlign: "center",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "textfield",
          }}
        />
        <span className="sr-only" aria-live="polite">
          {`Font size ${fontSizeDisplay} ${isFontSizeMixed ? "mixed" : "single"}${isFontSizeInputDirty ? " editing" : ""}`}
        </span>
        <button
          type="button"
          onClick={() => {
            onFontSizeStep(1);
          }}
          className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
          aria-label="Increase font size"
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-14-regular text-black-60">자간</span>
        <input
          type="text"
          inputMode="decimal"
          value={
            isLetterSpacingEditing
              ? letterSpacingInput
              : formatNumber(letterSpacing)
          }
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^0-9.-]/g, "");
            setLetterSpacingInput(nextValue);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitLetterSpacingInput();
            setIsLetterSpacingEditing(false);
            event.currentTarget.blur();
          }}
          onBlur={() => {
            if (isLetterSpacingEditing) {
              setIsLetterSpacingEditing(false);
              commitLetterSpacingInput();
            }
            onToolbarInputBlur();
          }}
          onFocus={(event) => {
            onToolbarInputFocus();
            setLetterSpacingInput(formatNumber(letterSpacing));
            setIsLetterSpacingEditing(true);
            event.target.select();
          }}
          className="no-spinner w-12 rounded border border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
          style={{
            textAlign: "center",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "textfield",
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-14-regular text-black-60">행간</span>
        <input
          type="text"
          inputMode="decimal"
          value={
            isLineHeightEditing ? lineHeightInput : formatNumber(lineHeight)
          }
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^0-9.-]/g, "");
            setLineHeightInput(nextValue);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitLineHeightInput();
            setIsLineHeightEditing(false);
            event.currentTarget.blur();
          }}
          onBlur={() => {
            if (isLineHeightEditing) {
              setIsLineHeightEditing(false);
              // blur 시점에만 커밋해 입력 중 잦은 재렌더/측정 비용을 줄인다.
              commitLineHeightInput();
            }
            onToolbarInputBlur();
          }}
          onFocus={(event) => {
            onToolbarInputFocus();
            setLineHeightInput(formatNumber(lineHeight));
            setIsLineHeightEditing(true);
            event.target.select();
          }}
          className="no-spinner w-12 rounded border border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
          style={{
            textAlign: "center",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "textfield",
          }}
        />
      </div>
      <label className="flex items-center gap-2">
        <span className="text-14-regular text-black-60">텍스트 색상</span>
        <ColorPickerPopover value={color} onChange={onColorChange} />
      </label>
      <button
        type="button"
        onClick={onToggleBold}
        className={`group relative flex h-7 w-7 items-center justify-center rounded border text-14-semibold ${
          isBold
            ? "border-primary text-primary"
            : "border-black-30 text-black-70"
        }`}
        aria-label="굵게"
      >
        B
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
          굵게
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleUnderline}
        className={`group relative flex h-7 w-7 items-center justify-center rounded ${
          isUnderline
            ? "border border-primary text-primary"
            : "border border-black-30 text-black-70"
        }`}
        aria-label="밑줄"
      >
        <Underline className="h-4 w-4" />
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
          밑줄
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleItalic}
        className={`group relative flex h-7 w-7 items-center justify-center rounded ${
          isItalic
            ? "border border-primary text-primary"
            : "border border-black-30 text-black-70"
        }`}
        aria-label="기울임꼴"
      >
        <Italic className="h-4 w-4" />
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
          기울임꼴
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleStrikethrough}
        className={`group relative flex h-7 w-7 items-center justify-center rounded ${
          isStrikethrough
            ? "border border-primary text-primary"
            : "border border-black-30 text-black-70"
        }`}
        aria-label="취소선"
      >
        <Strikethrough className="h-4 w-4" />
        <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
          취소선
        </span>
      </button>
      <div className="flex items-center gap-1">
        {(
          [
            { key: "left", Icon: TextAlignStart, label: "좌측 정렬" },
            { key: "center", Icon: TextAlignCenter, label: "가운데 정렬" },
            { key: "right", Icon: TextAlignEnd, label: "우측 정렬" },
          ] as const
        ).map(({ key, Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              onAlignChange(key);
            }}
            className={`group relative flex h-7 w-7 items-center justify-center rounded border ${
              align === key
                ? "border-primary text-primary"
                : "border-black-30 text-black-70"
            }`}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
              {label}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {(
          [
            { key: "top", label: "상단 정렬", Icon: AlignStartHorizontal },
            {
              key: "middle",
              label: "중앙 정렬",
              Icon: AlignCenterVertical,
            },
            { key: "bottom", label: "하단 정렬", Icon: AlignEndHorizontal },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              onAlignYChange(key);
            }}
            className={`group relative flex h-7 w-7 items-center justify-center rounded border text-12-medium ${
              alignY === key
                ? "border-primary text-primary"
                : "border-black-30 text-black-70"
            }`}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TextToolBar;
