/**
 * 사이드바 속성 패널 내에서 펼쳐지는 인라인 폰트 선택 리스트.
 * 폰트 클릭 시 사이드바 전환 없이 리스트가 열리고,
 * "사용중인 글꼴" → "최근 사용 글꼴" → "모든 글꼴" 3섹션 구조로 표시한다.
 * 같은 폰트를 사용하는 요소가 있으면 하단에 일괄 변경 버튼이 표시된다.
 */
import { useState, useRef, useEffect } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, ChevronUp, Star, Clock, Type, Search } from "lucide-react";
import { FONT_OPTIONS, getFontLabel, type FontOption } from "@/shared/utils/fontOptions";
import { useFontStore } from "@/features/editor/store/fontStore";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";
import { useRecentFontStore } from "@/features/editor/store/recentFontStore";
import { loadCdnFont, isFontLoaded } from "@/shared/utils/cdnFontLoader";

const SAMPLE_TEXT = "가나다 ABC 123";
const BUILTIN_FONTS = FONT_OPTIONS.filter((f) => f.source !== "cdn");
const CDN_FONTS = FONT_OPTIONS.filter((f) => f.source === "cdn");

interface InlineFontPickerProps {
  /** 현재 폰트 패밀리 */
  fontFamily: string;
  /** contentEditable 포커스 보존이 필요한 경우 true */
  preventFocus?: boolean;
  /** 선택 범위에 혼합 폰트가 있으면 true */
  isMixed?: boolean;
}

const InlineFontPicker = ({ fontFamily, preventFocus, isMixed }: InlineFontPickerProps) => {
  const applyFont = useFontStore((s) => s.applyFont);
  const fontWeight = useFontStore((s) => s.panelFontWeight);
  const usedFontFamilies = useFontStore((s) => s.usedFontFamilies);
  const changeAllMatchingFonts = useElementPanelStore((s) => s.changeAllMatchingFonts);
  const hasMatchingFonts = useElementPanelStore((s) => s.hasMatchingFonts);
  const textEditingCallbacks = useElementPanelStore((s) => s.textEditingCallbacks);
  const recentFonts = useRecentFontStore((s) => s.recentFonts);
  const addRecentFont = useRecentFontStore((s) => s.addRecentFont);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedFontIds, setExpandedFontIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

    const apply = () => {
      if (textEditingCallbacks) {
        textEditingCallbacks.onFontFamilyChange(font.family, nextWeight);
        useFontStore.getState().setPanelFont({ fontFamily: font.family, fontWeight: nextWeight });
      } else {
        applyFont({ fontFamily: font.family, fontWeight: nextWeight });
      }
      addRecentFont(font.family);
    };

    if (font.source === "cdn") {
      void loadCdnFont(font.family).then(apply);
    } else {
      apply();
    }
  };

  const handleSelectWeight = (family: string, weight: number) => {
    const apply = () => {
      if (textEditingCallbacks) {
        textEditingCallbacks.onFontFamilyChange(family, weight);
        useFontStore.getState().setPanelFont({ fontFamily: family, fontWeight: weight });
      } else {
        applyFont({ fontFamily: family, fontWeight: weight });
      }
      addRecentFont(family);
    };

    const font = FONT_OPTIONS.find((item) => item.family === family);
    if (font?.source === "cdn") {
      void loadCdnFont(family, weight).then(apply);
    } else {
      apply();
    }
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

  const usedFontOptions = FONT_OPTIONS.filter((f) =>
    usedFontFamilies.includes(f.family),
  );
  const recentFontOptions = recentFonts
    .map((family) => FONT_OPTIONS.find((f) => f.family === family))
    .filter((f): f is FontOption => f !== undefined);

  const renderFontRow = (font: FontOption) => (
    <InlineFontRow
      key={font.id}
      font={font}
      isSelected={font.id === selectedFont.id}
      isExpanded={effectiveExpandedFontIds.includes(font.id)}
      currentFontFamily={fontFamily}
      currentFontWeight={fontWeight}
      mouseDownHandler={mouseDownHandler}
      onToggleExpand={toggleExpand}
      onSelectFont={handleSelectFont}
      onSelectWeight={handleSelectWeight}
    />
  );

  const isSearching = searchQuery.trim().length > 0;
  const filteredFonts = isSearching
    ? FONT_OPTIONS.filter(
        (f) =>
          f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.family.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : null;

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
        <span style={isMixed ? undefined : { fontFamily }}>{isMixed ? "--" : fontLabel}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-black-50" /> : <ChevronDown className="h-4 w-4 text-black-50" />}
      </button>

      {/* 인라인 폰트 리스트 */}
      {isOpen && (
        <div className="relative flex flex-col">
          {/* 검색 입력 */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black-40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onMouseDown={mouseDownHandler}
              onFocus={(e) => e.target.removeAttribute("readonly")}
              placeholder="글꼴 검색"
              className="w-full rounded-lg border border-black-15 bg-white-100 py-1.5 pl-7 pr-3 text-12-regular text-black-90 placeholder:text-black-40 focus:border-primary focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-black-25 bg-white-100">
            {isSearching ? (
              filteredFonts!.length > 0 ? (
                <div className="mb-0.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-11-semibold text-black-60">
                    <Search className="h-3 w-3" />
                    검색 결과 ({filteredFonts!.length})
                  </div>
                  {filteredFonts!.map(renderFontRow)}
                </div>
              ) : (
                <div className="px-3 py-6 text-center text-12-regular text-black-50">
                  검색 결과가 없습니다.
                </div>
              )
            ) : (
              <>
                {usedFontOptions.length > 0 && (
                  <>
                    <div className="mb-0.5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-11-semibold text-black-60">
                        <Star className="h-3 w-3" />
                        사용중인 글꼴
                      </div>
                      {usedFontOptions.map(renderFontRow)}
                    </div>
                    <div className="mx-3 border-b border-black-15" />
                  </>
                )}
                {recentFontOptions.length > 0 && (
                  <>
                    <div className="mb-0.5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-11-semibold text-black-60">
                        <Clock className="h-3 w-3" />
                        최근 사용 글꼴
                      </div>
                      {recentFontOptions.map(renderFontRow)}
                    </div>
                    <div className="mx-3 border-b border-black-15" />
                  </>
                )}
                <div className="mb-0.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-11-semibold text-black-60">
                    <Type className="h-3 w-3" />
                    기본 글꼴
                  </div>
                  {BUILTIN_FONTS.map(renderFontRow)}
                </div>
                {CDN_FONTS.length > 0 && (
                  <>
                    <div className="mx-3 border-b border-black-15" />
                    <div className="mb-0.5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-11-semibold text-black-60">
                        <Type className="h-3 w-3" />
                        추가 글꼴
                      </div>
                      {CDN_FONTS.map(renderFontRow)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* 하단 고정: 같은 글꼴 일괄 변경 */}
          {showBatchChange && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-2">
              <span className="shrink-0 text-12-regular text-black-70 truncate max-w-16" style={{ fontFamily: originalFont }}>{originalFontLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-black-40" />
              <span className="shrink-0 text-12-regular text-black-70 truncate max-w-16" style={{ fontFamily }}>{fontLabel}</span>
              <button
                type="button"
                onMouseDown={mouseDownHandler}
                className="ml-auto shrink-0 rounded bg-primary px-2 py-1 text-11-semibold text-white-100 hover:bg-primary-700 transition-colors"
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

// CDN 폰트 지연 로딩을 지원하는 인라인 폰트 행
const InlineFontRow = ({
  font,
  isSelected,
  isExpanded,
  currentFontFamily,
  currentFontWeight,
  mouseDownHandler,
  onToggleExpand,
  onSelectFont,
  onSelectWeight,
}: {
  font: FontOption;
  isSelected: boolean;
  isExpanded: boolean;
  currentFontFamily: string;
  currentFontWeight: number;
  mouseDownHandler: ((e: React.MouseEvent) => void) | undefined;
  onToggleExpand: (fontId: string) => void;
  onSelectFont: (family: string) => void;
  onSelectWeight: (family: string, weight: number) => void;
}) => {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  const rowRef = useRef<HTMLDivElement>(null);
  const [isFontReady, setIsFontReady] = useState(font.source !== "cdn" || isFontLoaded(font.family));

  useEffect(() => {
    if (font.source !== "cdn" || isFontReady) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadCdnFont(font.family, 400).then(() => setIsFontReady(true));
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    if (rowRef.current) observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [font.family, font.source, isFontReady]);

  return (
    <div ref={rowRef} className={`transition ${isSelected ? "bg-primary-100" : ""}`}>
      <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-black-20">
        <button
          type="button"
          onMouseDown={mouseDownHandler}
          onClick={() => onToggleExpand(font.id)}
          className="mt-0.5 flex h-5 w-5 items-center justify-center text-black-60"
        >
          <ChevronIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={mouseDownHandler}
          onClick={() => onSelectFont(font.family)}
          className="flex flex-1 flex-col items-start gap-0.5 text-left"
        >
          <span className="text-13-semibold text-black-90" style={{ fontFamily: isFontReady ? font.family : "inherit", fontWeight: 400 }}>
            {font.label}
          </span>
          <span className="text-11-regular text-black-60" style={{ fontFamily: isFontReady ? font.family : "inherit", fontWeight: 400, opacity: isFontReady ? 1 : 0.5 }}>
            {SAMPLE_TEXT}
          </span>
        </button>
      </div>
      {isExpanded && (
        <div className="px-3 pb-2">
          <div className="flex flex-col gap-1">
            {font.weights.map((weight) => {
              const isActive = currentFontFamily === font.family && currentFontWeight === weight.value;
              return (
                <button
                  key={weight.value}
                  type="button"
                  onMouseDown={mouseDownHandler}
                  onClick={() => onSelectWeight(font.family, weight.value)}
                  className={`flex w-full items-center justify-between rounded-md pl-7 pr-3 py-1.5 text-13-regular transition ${
                    isActive ? "bg-primary-100 text-primary" : "text-black-70 hover:bg-black-10"
                  }`}
                >
                  <span className="grid flex-1 min-w-0 grid-cols-2 items-center text-left">
                    <span className="text-left">{weight.label}</span>
                    <span className="text-11-regular text-black-60 text-left" style={{ fontFamily: isFontReady ? font.family : "inherit", fontWeight: weight.value }}>
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
};

export default InlineFontPicker;
