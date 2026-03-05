/**
 * 색상 선택 UI와 확정 액션을 제공하는 팝오버 컴포넌트.
 * 기본 팔레트, ASD 팔레트, 최근 사용한 색상 3개 섹션을 표시한다.
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
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

const TOOLTIP_WIDTH_CLASS = "w-80";

type ColorPickerPopoverProps = {
  value: string;
  onChange: (value: string) => void;
  swatches?: string[];
  buttonClassName?: string;
  ariaLabel?: string;
  closeSignal?: number;
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
    // 아이콘 아래, 왼쪽 정렬 (오른쪽으로 펼침)
    const top = rect.bottom + 8;
    const left = rect.left;
    setTooltipStyle({ display: "block", position: "fixed", top, left, zIndex: 9999 });
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
        className={`${TOOLTIP_WIDTH_CLASS} max-h-[40vh] overflow-auto rounded-lg border border-black-25 bg-white-100 p-3 text-12-regular text-black-70 shadow-lg`}
        style={{ overscrollBehavior: "contain", ...tooltipStyle }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <div className="text-12-semibold text-black-90">
          ASD 색상 팔레트 논문 인용
        </div>
        <div className="mt-2 text-12-regular text-black-70 whitespace-normal wrap-break-words leading-snug">
          감각 과부하를 유발하는 고채도(노란색·빨간색)를 배제하고 심리적
          안정을 주는 파란색·녹색 계열의 저자극 자연 색상을
          선정했습니다. 또한 시각적 피로도를 낮추기 위해 회색이 섞인
          부드러운 톤과 명확한 명도 대비를 적용하여 학습 집중력을
          최적화했습니다.
        </div>
        <div className="mt-2 flex flex-col gap-1 whitespace-normal wrap-break-words leading-snug text-10-regular text-black-70">
          <div>
            - Franklin et al. (2016) - Journal of Autism and
            Developmental Disorders
          </div>
          <div>
            - Frontiers in Psychiatry (2022) - Built environment case
            study
          </div>
          <div>
            - Nature Scientific Reports (2023, 2025) - Sensory
            processing & color impacts
          </div>
          <div>
            - Frontiers in Psychology (2017) - Color vision
            discrimination in ASD
          </div>
          <div>
            - GA Architects & Kingston University (2010) - Design
            guidelines
          </div>
        </div>
      </div>
    </>
  );
};

const ColorPickerPopover = ({
  value,
  onChange,
  swatches,
  buttonClassName = "h-7 w-7",
  ariaLabel = "색상 선택",
  closeSignal,
}: ColorPickerPopoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  const recentColors = useRecentColorStore((s) => s.recentColors);
  const addRecentColor = useRecentColorStore((s) => s.addRecentColor);

  useEffect(() => {
    setHexInput(value.toUpperCase());
  }, [value]);

  useEffect(() => {
    if (closeSignal === undefined) return;
    setIsOpen(false);
  }, [closeSignal]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const commitHexInput = () => {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      setHexInput(value.toUpperCase());
      return;
    }
    if (normalized !== value.toUpperCase()) {
      onChange(normalized);
    }
    setHexInput(normalized);
    addRecentColor(normalized);
  };

  const handleSwatchClick = (color: string) => {
    onChange(color);
    setHexInput(color.toUpperCase());
    addRecentColor(color);
  };

  const renderSwatch = (color: string) => (
    <button
      key={color}
      type="button"
      onMouseDown={(event) => { event.preventDefault(); }}
      onClick={() => { handleSwatchClick(color); }}
      className={`h-7 w-7 rounded-full border ${
        value.toUpperCase() === color.toUpperCase()
          ? "border-primary ring-2 ring-primary/40"
          : "border-black-30"
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
        onMouseDown={(event) => { event.preventDefault(); }}
        onClick={() => { setIsOpen((prev) => !prev); }}
        className={`${buttonClassName} flex items-center justify-center rounded-full border border-black-30 bg-white-100 p-0`}
        style={{ backgroundColor: value }}
      />
      {isOpen && (
        <div
          data-textbox-toolbar="true"
          className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-black-25 bg-white-100 p-3 shadow-lg z-50"
          onPointerDown={(event) => { event.stopPropagation(); }}
          onMouseDown={(event) => { event.preventDefault(); }}
        >
          {swatches ? (
            // 커스텀 스와치가 전달되면 단일 그리드로 렌더 (하위 호환)
            <div className="grid grid-cols-6 gap-2">
              {swatches.map((color) => renderSwatch(color))}
            </div>
          ) : (
            <>
              {/* 최근 사용한 색상 — 항상 표시, 모든 요소에서 공유 */}
              <div className="mb-3">
                <div className="mb-1.5 text-11-semibold text-black-50">최근 사용한 색상</div>
                {recentColors.length > 0 ? (
                  <div className="flex gap-2">
                    {recentColors.map((color) => renderSwatch(color))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full border border-dashed border-black-20"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 기본 색상 */}
              <div className="mb-3">
                <div className="mb-1.5 text-11-semibold text-black-50">기본 색상</div>
                <div className="grid grid-cols-6 gap-2">
                  {BASIC_SWATCHES.map((color) => renderSwatch(color))}
                </div>
              </div>

              {/* ASD 팔레트 */}
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="text-11-semibold text-black-50">ASD 팔레트</span>
                  <AsdTooltip />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {ASD_SWATCHES.map((color) => renderSwatch(color))}
                </div>
              </div>
            </>
          )}

          {/* 커스텀 색상 입력 */}
          <div className="flex items-center gap-2">
            <label className="relative inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded border border-black-30">
              <input
                type="color"
                value={value}
                onChange={(event) => {
                  const nextColor = event.target.value.toUpperCase();
                  onChange(nextColor);
                  setHexInput(nextColor);
                  addRecentColor(nextColor);
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="커스텀 색상 선택"
              />
              <span
                className="h-6 w-6 rounded"
                style={{ backgroundColor: value }}
                aria-hidden
              />
            </label>
            <input
              type="text"
              inputMode="text"
              value={hexInput}
              onMouseDown={(event) => { event.stopPropagation(); }}
              onChange={(event) => { setHexInput(event.target.value); }}
              onBlur={commitHexInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitHexInput();
                  event.currentTarget.blur();
                }
              }}
              placeholder="#000000"
              className="min-w-0 flex-1 rounded border border-black-30 px-2 py-1 text-12-regular text-black-90 uppercase"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPickerPopover;
