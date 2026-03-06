/**
 * 사이드바 속성 패널 내에서 펼쳐지는 인라인 폰트 선택 리스트.
 * 폰트 클릭 시 사이드바 전환 없이 리스트가 열리고,
 * 같은 폰트를 사용하는 요소가 있으면 하단에 일괄 변경 버튼이 표시된다.
 */
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { FONT_OPTIONS, getFontLabel } from "@/features/editor/utils/fontOptions";
import { useFontStore } from "@/features/editor/store/fontStore";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";

const SAMPLE_TEXT = "가나다 ABC 123";

interface InlineFontPickerProps {
  /** 현재 폰트 패밀리 */
  fontFamily: string;
  /** contentEditable 포커스 보존이 필요한 경우 true */
  preventFocus?: boolean;
}

const InlineFontPicker = ({ fontFamily, preventFocus }: InlineFontPickerProps) => {
  const applyFont = useFontStore((s) => s.applyFont);
  const fontWeight = useFontStore((s) => s.panelFontWeight);
  const changeAllMatchingFonts = useElementPanelStore((s) => s.changeAllMatchingFonts);
  const hasMatchingFonts = useElementPanelStore((s) => s.hasMatchingFonts);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedFontIds, setExpandedFontIds] = useState<string[]>([]);
  // 리스트를 처음 열었을 때의 폰트를 기록해 일괄 변경 대상을 결정한다.
  const [originalFont] = useState(fontFamily);

  const fontLabel = getFontLabel(fontFamily);
  const originalFontLabel = getFontLabel(originalFont);

  const selectedFont = FONT_OPTIONS.find((f) => f.family === fontFamily) ?? FONT_OPTIONS[0];

  const showBatchChange =
    isOpen &&
    changeAllMatchingFonts &&
    originalFont !== fontFamily &&
    hasMatchingFonts?.(originalFont);

  const handleSelectFont = (family: string) => {
    const font = FONT_OPTIONS.find((item) => item.family === family);
    if (!font) return;
    const availableWeights = font.weights.map((w) => w.value);
    const nextWeight = availableWeights.includes(fontWeight)
      ? fontWeight
      : (font.weights[0]?.value ?? 400);
    applyFont({ fontFamily: font.family, fontWeight: nextWeight });
  };

  const handleSelectWeight = (family: string, weight: number) => {
    applyFont({ fontFamily: family, fontWeight: weight });
  };

  const toggleExpand = (fontId: string) => {
    setExpandedFontIds((prev) =>
      prev.includes(fontId) ? prev.filter((id) => id !== fontId) : [...prev, fontId],
    );
  };

  // 리스트를 열 때 현재 선택된 폰트를 자동 확장한다.
  const effectiveExpandedFontIds = expandedFontIds.includes(selectedFont.id)
    ? expandedFontIds
    : [selectedFont.id, ...expandedFontIds];

  const mouseDownHandler = preventFocus ? (e: React.MouseEvent) => e.preventDefault() : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-14-semibold text-black-90">글꼴</div>
      {/* 글꼴 선택 토글 버튼 */}
      <button
        type="button"
        onMouseDown={mouseDownHandler}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between gap-2 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90 hover:border-primary"
      >
        <span style={{ fontFamily }}>{fontLabel}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-black-50" /> : <ChevronDown className="h-4 w-4 text-black-50" />}
      </button>

      {/* 인라인 폰트 리스트 */}
      {isOpen && (
        <div className="relative flex flex-col">
          <div className="max-h-60 overflow-y-auto rounded-lg border border-black-25 bg-white-100">
            {FONT_OPTIONS.map((font) => {
              const isSelected = font.id === selectedFont.id;
              const isExpanded = effectiveExpandedFontIds.includes(font.id);
              const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
              return (
                <div key={font.id} className={`transition ${isSelected ? "bg-primary/10" : ""}`}>
                  <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-black-20">
                    <button
                      type="button"
                      onMouseDown={mouseDownHandler}
                      onClick={() => toggleExpand(font.id)}
                      className="mt-0.5 flex h-5 w-5 items-center justify-center text-black-60"
                    >
                      <ChevronIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={mouseDownHandler}
                      onClick={() => handleSelectFont(font.family)}
                      className="flex flex-1 flex-col items-start gap-0.5 text-left"
                    >
                      <span className="text-13-semibold text-black-90" style={{ fontFamily: font.family, fontWeight: 400 }}>
                        {font.label}
                      </span>
                      <span className="text-11-regular text-black-60" style={{ fontFamily: font.family, fontWeight: 400 }}>
                        {SAMPLE_TEXT}
                      </span>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-2">
                      <div className="flex flex-col gap-1">
                        {font.weights.map((weight) => {
                          const isActive = fontFamily === font.family && fontWeight === weight.value;
                          return (
                            <button
                              key={weight.value}
                              type="button"
                              onMouseDown={mouseDownHandler}
                              onClick={() => handleSelectWeight(font.family, weight.value)}
                              className={`flex w-full items-center justify-between rounded-md pl-7 pr-3 py-1.5 text-13-regular transition ${
                                isActive ? "bg-primary/10 text-primary" : "text-black-70 hover:bg-black-10"
                              }`}
                            >
                              <span className="grid flex-1 min-w-0 grid-cols-2 items-center text-left">
                                <span className="text-left">{weight.label}</span>
                                <span className="text-11-regular text-black-60 text-left" style={{ fontFamily: font.family, fontWeight: weight.value }}>
                                  {SAMPLE_TEXT}
                                </span>
                              </span>
                              <Check className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-0"}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 하단 고정: 같은 글꼴 일괄 변경 */}
          {showBatchChange && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2">
              <span className="shrink-0 text-12-regular text-black-70 truncate max-w-16" style={{ fontFamily: originalFont }}>{originalFontLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-black-40" />
              <span className="shrink-0 text-12-regular text-black-70 truncate max-w-16" style={{ fontFamily }}>{fontLabel}</span>
              <button
                type="button"
                onMouseDown={mouseDownHandler}
                className="ml-auto shrink-0 rounded bg-primary px-2 py-1 text-11-semibold text-white-100 hover:bg-primary/90 transition-colors"
                onClick={() => changeAllMatchingFonts!(originalFont, fontFamily)}
              >
                같은 글꼴 변경
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineFontPicker;
