import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { FONT_OPTIONS } from "../../utils/fontOptions";
import { useFontContentState } from "../../hooks/useFontContentState";

const SAMPLE_TEXT = "가나다 ABC 123";

type FontContentViewProps = {
  selectedFontId: string;
  panelFontFamily: string;
  panelFontWeight: number;
  expandedFontIds: string[];
  onToggleExpand: (fontId: string) => void;
  onSelectFont: (family: string) => void;
  onSelectWeight: (family: string, weight: number) => void;
};

const FontContentView = ({
  selectedFontId,
  panelFontFamily,
  panelFontWeight,
  expandedFontIds,
  onToggleExpand,
  onSelectFont,
  onSelectWeight,
}: FontContentViewProps) => (
  <div className="flex flex-col w-full h-full gap-4">
    <div className="text-14-regular text-black-70">
      글꼴을 선택하면 선택된 텍스트에 적용됩니다.
    </div>
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      <div className="text-14-semibold text-black-90">글꼴</div>
      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto rounded-lg bg-white-100">
        {FONT_OPTIONS.map((font) => {
          const isSelected = font.id === selectedFontId;
          const isExpanded = expandedFontIds.includes(font.id);
          const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
          return (
            <div
              key={font.id}
              className={`transition ${isSelected ? "bg-primary/10" : ""}`}
            >
              <div className="flex items-start gap-2 px-3 py-3 hover:bg-black-20 rounded-lg">
                <button
                  type="button"
                  onClick={() => { onToggleExpand(font.id); }}
                  className="mt-1 flex h-5 w-5 items-center justify-center text-black-60"
                  aria-label={`${font.label} 굵기 펼치기`}
                >
                  <ChevronIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { onSelectFont(font.family); }}
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
        })}
      </div>
    </div>
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

  return (
    <FontContentView
      selectedFontId={selectedFontId}
      panelFontFamily={panelFontFamily}
      panelFontWeight={panelFontWeight}
      expandedFontIds={expandedFontIds}
      onToggleExpand={onToggleExpand}
      onSelectFont={onSelectFont}
      onSelectWeight={onSelectWeight}
    />
  );
};

export default FontContent;
