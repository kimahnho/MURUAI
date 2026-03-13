/**
 * 폰트 패널에서 폰트/크기/정렬 옵션을 선택하고 선택 요소에 반영하는 컴포넌트.
 * "사용중인 글꼴" → "최근 사용 글꼴" → "모든 글꼴" 3섹션 구조로 표시한다.
 */
import { Check, ChevronDown, ChevronRight, Star, Clock, Type } from "lucide-react";
import { FONT_OPTIONS, type FontOption } from "@/shared/utils/fontOptions";
import { useFontStore } from "@/features/editor/store/fontStore";
import { useRecentFontStore } from "@/features/editor/store/recentFontStore";
import { useFontContentState } from "../hooks/useFontContentState";

const SAMPLE_TEXT = "가나다 ABC 123";

type FontRowProps = {
  font: FontOption;
  isSelected: boolean;
  isExpanded: boolean;
  panelFontFamily: string;
  panelFontWeight: number;
  onToggleExpand: (fontId: string) => void;
  onSelectFont: (family: string) => void;
  onSelectWeight: (family: string, weight: number) => void;
};

const FontRow = ({
  font,
  isSelected,
  isExpanded,
  panelFontFamily,
  panelFontWeight,
  onToggleExpand,
  onSelectFont,
  onSelectWeight,
}: FontRowProps) => {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
  return (
    <div className={`transition ${isSelected ? "bg-primary/10" : ""}`}>
      <div className="flex items-start gap-2 px-3 py-3 hover:bg-black-20 rounded-lg">
        <button
          type="button"
          onClick={() => { onToggleExpand(font.id); }}
          onMouseDown={(e) => e.preventDefault()}
          className="mt-1 flex h-5 w-5 items-center justify-center text-black-60"
          aria-label={`${font.label} 굵기 펼치기`}
        >
          <ChevronIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { onSelectFont(font.family); }}
          onMouseDown={(e) => e.preventDefault()}
          className="flex flex-1 flex-col items-start gap-1 text-left"
        >
          <span
            className="text-14-semibold text-black-90"
            style={{ fontFamily: font.family, fontWeight: 400 }}
          >
            {font.label}
          </span>
          <span
            className="text-12-regular text-black-60"
            style={{ fontFamily: font.family, fontWeight: 400 }}
          >
            {SAMPLE_TEXT}
          </span>
        </button>
      </div>
      {isExpanded && (
        <div className="pl-3 pr-3 pb-3">
          <div className="flex flex-col gap-2">
            {font.weights.map((weight) => {
              const isActive =
                panelFontFamily === font.family &&
                panelFontWeight === weight.value;
              return (
                <button
                  key={weight.value}
                  type="button"
                  onClick={() => { onSelectWeight(font.family, weight.value); }}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`flex w-full items-center justify-between rounded-md pl-7 pr-3 py-2 text-14-regular transition ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-black-70 hover:bg-black-10"
                  }`}
                >
                  <span className="grid flex-1 min-w-0 grid-cols-2 items-center text-left">
                    <span className="text-left">{weight.label}</span>
                    <span
                      className="text-12-regular text-black-60 text-left"
                      style={{
                        fontFamily: font.family,
                        fontWeight: weight.value,
                      }}
                    >
                      {SAMPLE_TEXT}
                    </span>
                  </span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center ${
                      isActive ? "text-primary" : "text-black-40"
                    }`}
                    aria-hidden
                  >
                    <Check
                      className={`h-3.5 w-3.5 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

type FontSectionProps = {
  icon: typeof Star;
  title: string;
  fonts: FontOption[];
  selectedFontId: string;
  panelFontFamily: string;
  panelFontWeight: number;
  expandedFontIds: string[];
  onToggleExpand: (fontId: string) => void;
  onSelectFont: (family: string) => void;
  onSelectWeight: (family: string, weight: number) => void;
};

const FontSection = ({
  icon: Icon,
  title,
  fonts,
  selectedFontId,
  panelFontFamily,
  panelFontWeight,
  expandedFontIds,
  onToggleExpand,
  onSelectFont,
  onSelectWeight,
}: FontSectionProps) => (
  <div className="mb-1">
    <div className="flex items-center gap-1.5 px-3 py-2 text-12-semibold text-black-60">
      <Icon className="h-3.5 w-3.5" />
      {title}
    </div>
    {fonts.map((font) => (
      <FontRow
        key={font.id}
        font={font}
        isSelected={font.id === selectedFontId}
        isExpanded={expandedFontIds.includes(font.id)}
        panelFontFamily={panelFontFamily}
        panelFontWeight={panelFontWeight}
        onToggleExpand={onToggleExpand}
        onSelectFont={onSelectFont}
        onSelectWeight={onSelectWeight}
      />
    ))}
  </div>
);

const FontContent = () => {
  const {
    selectedFontId,
    panelFontFamily,
    panelFontWeight,
    expandedFontIds,
    onToggleExpand,
    onSelectFont,
    onSelectWeight,
  } = useFontContentState();

  const usedFontFamilies = useFontStore((s) => s.usedFontFamilies);
  const recentFonts = useRecentFontStore((s) => s.recentFonts);

  const usedFontOptions = FONT_OPTIONS.filter((f) =>
    usedFontFamilies.includes(f.family),
  );
  const recentFontOptions = recentFonts
    .map((family) => FONT_OPTIONS.find((f) => f.family === family))
    .filter((f): f is FontOption => f !== undefined);

  const sharedProps = {
    selectedFontId,
    panelFontFamily,
    panelFontWeight,
    expandedFontIds,
    onToggleExpand,
    onSelectFont,
    onSelectWeight,
  };

  return (
    <div className="flex flex-col w-full h-full gap-4" data-text-props-panel>
      <div className="text-14-regular text-black-70">
        글꼴을 선택하면 선택된 텍스트에 적용됩니다.
      </div>
      <div className="flex flex-1 flex-col gap-2 min-h-0">
        <div className="text-14-semibold text-black-90">글꼴</div>
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto rounded-lg bg-white-100">
          {usedFontOptions.length > 0 && (
            <>
              <FontSection
                icon={Star}
                title="사용중인 글꼴"
                fonts={usedFontOptions}
                {...sharedProps}
              />
              <div className="mx-3 border-b border-black-15" />
            </>
          )}
          {recentFontOptions.length > 0 && (
            <>
              <FontSection
                icon={Clock}
                title="최근 사용 글꼴"
                fonts={recentFontOptions}
                {...sharedProps}
              />
              <div className="mx-3 border-b border-black-15" />
            </>
          )}
          <FontSection
            icon={Type}
            title="모든 글꼴"
            fonts={FONT_OPTIONS}
            {...sharedProps}
          />
        </div>
      </div>
    </div>
  );
};

export default FontContent;
