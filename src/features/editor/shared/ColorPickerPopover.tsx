/**
 * 색상 선택 UI와 확정 액션을 제공하는 팝오버 컴포넌트.
 */
import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

const DEFAULT_SWATCHES = [
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

const ColorPickerPopover = ({
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  buttonClassName = "h-7 w-7",
  ariaLabel = "색상 선택",
}: ColorPickerPopoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value.toUpperCase());

  useEffect(() => {
    setHexInput(value.toUpperCase());
  }, [value]);

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
  };

  const handleSwatchClick = (color: string) => {
    onChange(color);
    setHexInput(color.toUpperCase());
  };

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
          className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-black-25 bg-white-100 p-3 shadow-lg z-50"
          onPointerDown={(event) => { event.stopPropagation(); }}
          onMouseDown={(event) => { event.preventDefault(); }}
        >
          <div className="grid grid-cols-5 gap-2">
            {swatches.map((color) => (
              <button
                key={color}
                type="button"
                onMouseDown={(event) => { event.preventDefault(); }}
                onClick={() => { handleSwatchClick(color); }}
                className="h-8 w-8 rounded-full border border-black-30"
                style={{ backgroundColor: color }}
                aria-label={`색상 ${color}`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onMouseDown={(event) => { event.preventDefault(); }}
                onChange={(event) => { onChange(event.target.value.toUpperCase()); }}
                className="color-input h-8 w-8 cursor-pointer rounded border border-black-30 bg-white-100 p-0 overflow-hidden"
                style={{ WebkitAppearance: "none", appearance: "none" }}
              />
              <input
                type="text"
                inputMode="text"
                value={hexInput}
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
                className="w-24 rounded border border-black-30 px-2 py-1 text-12-regular text-black-90 uppercase"
              />
            </div>
            <div className="relative group">
              <HelpCircle className="h-4 w-4 text-black-50" />
              <div
                className={`absolute right-0 top-full mt-2 hidden ${TOOLTIP_WIDTH_CLASS} max-h-[40vh] w-100 overflow-auto rounded-lg border border-black-25 bg-white-100 p-3 text-12-regular text-black-70 shadow-lg group-hover:block`}
                style={{ overscrollBehavior: "contain" }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPickerPopover;
