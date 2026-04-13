/**
 * 색상 선택 UI와 확정 액션을 제공하는 팝오버 컴포넌트.
 * 기본 팔레트, ASD 팔레트, 최근 사용한 색상 3개 섹션을 표시한다.
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, HelpCircle } from "lucide-react";
import { useRecentColorStore } from "@/features/editor/store/recentColorStore";

// 기본 색상 팔레트 — 범용 표준 색상
const BASIC_SWATCHES = [
  "#FF0000",
  "#FF8C00",
  "#FFD700",
  "#00C853",
  "#00BCD4",
  "#2979FF",
  "#7C4DFF",
  "#FF4081",
  "#8D6E63",
  "#808080",
  "#000000",
  "#FFFFFF",
];

// ASD 색상 팔레트 — 감각 과부하 방지용 저자극 색상
const ASD_SWATCHES = [
  "#000000",
  "#77A3A4",
  "#BB9476",
  "#C8826B",
  "#96A47F",
  "#A994A6",
  "#8B7B8C",
  "#B8A3C7",
  "#E0E0E0",
  "#F5F5F5",
  "#F4EBD0",
  "#FFFFFF",
];

const TOOLTIP_DESIRED_WIDTH = 480;
const TOOLTIP_MARGIN = 12;

// 체커보드 CSS — 투명 상태를 시각적으로 표현
const CHECKERBOARD_BG: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(45deg, #ccc 25%, transparent 25%)",
    "linear-gradient(-45deg, #ccc 25%, transparent 25%)",
    "linear-gradient(45deg, transparent 75%, #ccc 75%)",
    "linear-gradient(-45deg, transparent 75%, #ccc 75%)",
  ].join(", "),
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
};

type ColorPickerPopoverProps = {
  value: string;
  onChange: (value: string) => void;
  onChangeAll?: (oldColor: string, newColor: string) => void;
  hasMatchingColors?: (color: string) => boolean;
  swatches?: string[];
  buttonClassName?: string;
  ariaLabel?: string;
  closeSignal?: number;
  allowTransparent?: boolean;
  isMixed?: boolean;
};

const normalizeHex = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(withHash);
  if (shortHexMatch) {
    // 3자리 hex 입력도 6자리로 정규화해 저장/비교 경로를 단일화한다.
    const [r, g, b] = shortHexMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#([0-9a-fA-F]{6})$/.test(withHash)) {
    return withHash.toUpperCase();
  }
  return null;
};

// ASD 팔레트 논문 인용 툴팁 — fixed 포지셔닝으로 팝오버 잘림 방지
const AsdTooltip = () => {
  const iconRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    display: "none",
  });

  const showTooltip = () => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;
    // 화면 폭에 맞게 너비와 좌표를 clamp
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(TOOLTIP_DESIRED_WIDTH, vw - TOOLTIP_MARGIN * 2);
    const left = Math.min(rect.left, vw - maxW - TOOLTIP_MARGIN);
    // 아래 공간이 부족하면 위로 펼침
    const spaceBelow = vh - rect.bottom - 8;
    const useAbove = spaceBelow < 200;
    const base: React.CSSProperties = {
      display: "block",
      position: "fixed",
      left: Math.max(TOOLTIP_MARGIN, left),
      width: maxW,
      zIndex: 9999,
    };
    const pos: React.CSSProperties = useAbove
      ? { ...base, bottom: vh - rect.top + 8 }
      : { ...base, top: rect.bottom + 8 };
    setTooltipStyle(pos);
  };

  const hideTooltip = () => {
    setTooltipStyle({ display: "none" });
  };

  return (
    <>
      <div
        ref={iconRef}
        className="cursor-help"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <HelpCircle className="h-3.5 w-3.5 text-black-50" />
      </div>
      <div
        className="max-h-[40vh] overflow-auto rounded-lg border border-black-25 bg-white-100 p-3 text-12-regular text-black-70 shadow-lg"
        style={{ overscrollBehavior: "contain", ...tooltipStyle }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <div className="text-12-semibold text-black-90">
          ASD 색상 팔레트 논문 인용
        </div>
        <div className="mt-2 text-12-regular text-black-70 whitespace-normal wrap-break-words leading-snug">
          감각 과부하를 유발하는 고채도(노란색·빨간색)를 배제하고 심리적 안정을
          주는 파란색·녹색 계열의 저자극 자연 색상을 선정했습니다. 또한 시각적
          피로도를 낮추기 위해 회색이 섞인 부드러운 톤과 명확한 명도 대비를
          적용하여 학습 집중력을 최적화했습니다.
        </div>
        <div className="mt-2 flex flex-col gap-1 whitespace-normal wrap-break-words leading-snug text-10-regular text-black-70">
          <div>
            - Franklin et al. (2016) - Journal of Autism and Developmental
            Disorders
          </div>
          <div>
            - Frontiers in Psychiatry (2022) - Built environment case study
          </div>
          <div>
            - Nature Scientific Reports (2023, 2025) - Sensory processing &
            color impacts
          </div>
          <div>
            - Frontiers in Psychology (2017) - Color vision discrimination in
            ASD
          </div>
          <div>
            - GA Architects & Kingston University (2010) - Design guidelines
          </div>
        </div>
      </div>
    </>
  );
};

const ColorPickerPopover = ({
  value,
  onChange,
  onChangeAll,
  hasMatchingColors,
  swatches,
  buttonClassName = "h-7 w-7",
  ariaLabel = "색상 선택",
  closeSignal,
  allowTransparent = false,
  isMixed = false,
}: ColorPickerPopoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const isTransparent = value === "transparent";
  const [hexInput, setHexInput] = useState(
    isTransparent ? "" : value.toUpperCase(),
  );
  // 팝오버 열릴 때의 색상을 저장해 "같은 색상 모두 변경" 기준으로 사용
  const [originalColor, setOriginalColor] = useState(value.toUpperCase());

  const recentColors = useRecentColorStore((s) => s.recentColors);
  const addRecentColor = useRecentColorStore((s) => s.addRecentColor);

  useEffect(() => {
    setHexInput(value === "transparent" ? "" : value.toUpperCase());
  }, [value]);

  useEffect(() => {
    if (closeSignal === undefined) return;
    setIsOpen(false);
  }, [closeSignal]);

  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // 버튼 또는 portal 팝오버 내부 클릭이면 무시
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const applyColor = (color: string) => {
    onChange(color);
    if (color !== "transparent") {
      addRecentColor(color);
    }
  };

  const commitHexInput = () => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      setHexInput(value.toUpperCase());
      return;
    }
    if (normalized !== value.toUpperCase()) {
      applyColor(normalized);
    }
    setHexInput(normalized);
    addRecentColor(normalized);
  };

  const handleSwatchClick = (color: string) => {
    applyColor(color);
    setHexInput(color.toUpperCase());
  };

  const renderSwatch = (color: string) => (
    <button
      key={color}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={() => {
        handleSwatchClick(color);
      }}
      className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${
        value.toUpperCase() === color.toUpperCase()
          ? "border-primary ring-2 ring-primary-200 scale-110"
          : "border-black-40"
      }`}
      style={{ backgroundColor: color }}
      aria-label={`색상 ${color}`}
    />
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        ref={buttonRef}
        onClick={() => {
          setIsOpen((prev) => {
            if (!prev) {
              setOriginalColor(value.toUpperCase());
              // 버튼 위치 기준으로 팝오버 좌표 계산
              const rect = buttonRef.current?.getBoundingClientRect();
              if (rect) {
                const POPOVER_W = 256;
                const left = Math.min(rect.left, window.innerWidth - POPOVER_W - 12);
                const top = rect.bottom + 8;
                // 하단 공간 부족 시 위로
                const spaceBelow = window.innerHeight - rect.bottom;
                if (spaceBelow < 400) {
                  setPopoverStyle({ position: "fixed", left, bottom: window.innerHeight - rect.top + 8 });
                } else {
                  setPopoverStyle({ position: "fixed", left, top });
                }
              }
            }
            return !prev;
          });
        }}
        className={`${buttonClassName} flex items-center justify-center rounded-full border border-black-30 bg-white-100 p-0`}
        style={isMixed ? CHECKERBOARD_BG : isTransparent ? CHECKERBOARD_BG : { backgroundColor: value }}
      />
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          data-textbox-toolbar="true"
          className="w-64 rounded-xl border border-black-15 bg-white-100 p-3.5 shadow-lg"
          style={{ ...popoverStyle, zIndex: 9999 }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
        >
          {swatches ? (
            // 커스텀 스와치가 전달되면 단일 그리드로 렌더 (하위 호환)
            <div className="grid grid-cols-6 gap-2">
              {swatches.map((color) => renderSwatch(color))}
            </div>
          ) : (
            <>
              {/* 투명 옵션 */}
              {allowTransparent && (
                <div className="pb-2.5 mb-2.5 border-b border-black-15">
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => {
                      onChange("transparent");
                      setHexInput("");
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-12-semibold transition-colors ${
                      isTransparent
                        ? "bg-primary-100 text-primary"
                        : "text-black-70 hover:bg-black-5"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border ${
                        isTransparent
                          ? "border-primary ring-2 ring-primary-200"
                          : "border-black-40"
                      }`}
                      style={CHECKERBOARD_BG}
                    />
                    투명
                  </button>
                </div>
              )}

              {/* 최근 사용한 색상 — 항상 표시, 모든 요소에서 공유 */}
              <div className="pb-2.5 mb-2.5 border-b border-black-15">
                <div className="mb-2 text-12-semibold text-black-70">
                  최근 사용한 색상
                </div>
                {recentColors.length > 0 ? (
                  <div className="flex gap-2">
                    {recentColors.map((color) => renderSwatch(color))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full border border-dashed border-black-15 bg-black-5"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 기본 색상 */}
              <div className="pb-2.5 mb-2.5 border-b border-black-15">
                <div className="mb-2 text-12-semibold text-black-70">
                  기본 색상
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {BASIC_SWATCHES.map((color) => renderSwatch(color))}
                </div>
              </div>

              {/* ASD 팔레트 */}
              <div className="mb-2.5">
                <div className="mb-2 flex items-center gap-1">
                  <span className="text-12-semibold text-black-70">
                    ASD 팔레트
                  </span>
                  <AsdTooltip />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {ASD_SWATCHES.map((color) => renderSwatch(color))}
                </div>
              </div>
            </>
          )}

          {/* 커스텀 색상 입력 */}
          <div
            className={`pt-2.5 border-t border-black-15 ${isTransparent ? "opacity-40 pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-2">
              <label className="relative inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black-25">
                <input
                  type="color"
                  value={isTransparent ? "#ffffff" : value}
                  onChange={(event) => {
                    const nextColor = event.target.value.toUpperCase();
                    applyColor(nextColor);
                    setHexInput(nextColor);
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="커스텀 색상 선택"
                />
                <span
                  className="h-5 w-5 rounded-full"
                  style={
                    isTransparent ? CHECKERBOARD_BG : { backgroundColor: value }
                  }
                  aria-hidden
                />
              </label>
              <input
                type="text"
                inputMode="text"
                value={hexInput}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
                onChange={(event) => {
                  setHexInput(event.target.value);
                }}
                onBlur={commitHexInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitHexInput();
                    event.currentTarget.blur();
                  }
                }}
                placeholder={isTransparent ? "투명" : "#000000"}
                className="min-w-0 flex-1 rounded-lg border border-black-20 px-2.5 py-1.5 text-12-regular text-black-90 uppercase focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 같은 색상 모두 변경 — 이전/현재 색상 미리보기 + 버튼 */}
          {onChangeAll &&
            hasMatchingColors?.(originalColor) &&
            originalColor !== value.toUpperCase() && (
              <div className="mt-2 flex items-center gap-2 rounded border border-black-25 bg-black-5 px-2.5 py-2">
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black-30"
                  style={{ backgroundColor: originalColor }}
                  aria-label={`이전 색상 ${originalColor}`}
                />
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-black-40" />
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black-30"
                  style={{ backgroundColor: value }}
                  aria-label={`변경 색상 ${value}`}
                />
                <button
                  type="button"
                  className="ml-auto shrink-0 rounded bg-primary px-2 py-1 text-11-semibold text-white-100 hover:bg-primary-700 transition-colors"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    onChangeAll(originalColor, value.toUpperCase());
                  }}
                >
                  같은 색상 변경
                </button>
              </div>
            )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default ColorPickerPopover;
