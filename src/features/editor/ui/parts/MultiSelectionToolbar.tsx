import { useState, type FocusEvent } from "react";
import { AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Ban } from "lucide-react";
import ColorPickerPopover from "./ColorPickerPopover";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type MultiFontSizeInput = {
  displayValue: string;
  handleChange: (value: string) => void;
  handleFocus: (event?: FocusEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
  commit: () => void;
  step: (delta: number) => void;
};

type BorderPatch = Partial<{
  enabled: boolean;
  color: string;
  width: number;
  style: BorderStyle;
}>;

type MultiSelectionToolbarProps = {
  isVisible: boolean;
  multiColorValue: string;
  onMultiColorChange: (color: string) => void;
  hasMultiFontTargets: boolean;
  onOpenFontPanel: () => void;
  multiFontFamily: string;
  multiFontLabel: string;
  multiFontSizeInput: MultiFontSizeInput;
  hasMultiBorderTargets: boolean;
  multiBorderEnabled: boolean;
  multiBorderColor: string;
  multiBorderWidth: number;
  activeBorderStyle: BorderStyle | "none";
  borderStyleOptions: Array<BorderStyle | "none">;
  clampBorderWidth: (value: number) => number;
  applyMultiBorderPatch: (patch: BorderPatch) => void;
  canDistribute?: boolean;
  onDistributeHorizontal?: () => void;
  onDistributeVertical?: () => void;
};

const MultiSelectionToolbar = ({
  isVisible,
  multiColorValue,
  onMultiColorChange,
  hasMultiFontTargets,
  onOpenFontPanel,
  multiFontFamily,
  multiFontLabel,
  multiFontSizeInput,
  hasMultiBorderTargets,
  multiBorderEnabled,
  multiBorderColor,
  multiBorderWidth,
  activeBorderStyle,
  borderStyleOptions,
  clampBorderWidth,
  applyMultiBorderPatch,
  canDistribute,
  onDistributeHorizontal,
  onDistributeVertical,
}: MultiSelectionToolbarProps) => {
  const [isMultiBorderPanelOpen, setIsMultiBorderPanelOpen] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
      <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
        <div
          className="flex flex-wrap items-center gap-3 whitespace-nowrap"
          onPointerDown={(event) => { event.stopPropagation(); }}
        >
          <div className="flex items-center gap-2">
            <span className="text-14-regular text-black-60">색상</span>
            <ColorPickerPopover
              value={multiColorValue}
              onChange={onMultiColorChange}
            />
            <span className="text-12-regular text-black-70 uppercase">
              {multiColorValue}
            </span>
          </div>
          {hasMultiFontTargets && (
            <>
              <button
                type="button"
                onClick={onOpenFontPanel}
                className="flex items-center gap-2 rounded border border-black-30 px-2 py-1 text-14-regular text-black-70 hover:border-primary hover:text-primary"
              >
                <span className="text-black-60">글꼴</span>
                <span
                  className="text-black-90"
                  style={{ fontFamily: multiFontFamily }}
                >
                  {multiFontLabel}
                </span>
              </button>
              <div className="flex items-center text-14-regular text-black-60">
                텍스트 크기
              </div>
              <div className="flex items-center gap-1 rounded border border-black-30 px-1">
                <button
                  type="button"
                  onClick={() => { multiFontSizeInput.step(-1); }}
                  className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
                  aria-label="Decrease font size"
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={multiFontSizeInput.displayValue}
                  onChange={(event) =>
                    { multiFontSizeInput.handleChange(event.target.value); }
                  }
                  onFocus={multiFontSizeInput.handleFocus}
                  onBlur={multiFontSizeInput.handleBlur}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    multiFontSizeInput.commit();
                    event.currentTarget.blur();
                  }}
                  className="no-spinner w-12 appearance-none border-x border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
                  style={{
                    textAlign: "center",
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                    appearance: "textfield",
                  }}
                />
                <button
                  type="button"
                  onClick={() => { multiFontSizeInput.step(1); }}
                  className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
                  aria-label="Increase font size"
                >
                  +
                </button>
              </div>
            </>
          )}
          {hasMultiBorderTargets && (
            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsMultiBorderPanelOpen((prev) => !prev); }}
                className={`flex h-7 items-center justify-center rounded border px-2 text-14-regular ${
                  multiBorderEnabled || isMultiBorderPanelOpen
                    ? "border-primary text-primary"
                    : "border-black-30 text-black-70"
                }`}
                aria-label="Border settings"
              >
                테두리
              </button>
              {isMultiBorderPanelOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-black-25 bg-white-100 p-3 shadow-lg"
                  onPointerDown={(event) => { event.stopPropagation(); }}
                >
                  <div className="flex items-center gap-2">
                    {borderStyleOptions.map((styleOption) => {
                      const isActive = activeBorderStyle === styleOption;
                      const buttonClass = `flex h-12 w-12 items-center justify-center rounded-lg border ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-black-30 text-black-70"
                      }`;
                      if (styleOption === "none") {
                        return (
                          <button
                            key={styleOption}
                            type="button"
                            onClick={() =>
                              { applyMultiBorderPatch({ enabled: false }); }
                            }
                            className={buttonClass}
                            aria-label="No border"
                          >
                            <Ban className="h-5 w-5" />
                          </button>
                        );
                      }
                      return (
                        <button
                          key={styleOption}
                          type="button"
                          onClick={() =>
                            { applyMultiBorderPatch({
                              enabled: true,
                              style: styleOption,
                            }); }
                          }
                          className={buttonClass}
                          aria-label={`${styleOption} border`}
                        >
                          <span
                            className="block w-6"
                            style={{
                              borderTopWidth: 2,
                              borderTopStyle: styleOption,
                              borderTopColor: "currentColor",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-14-regular text-black-70">
                    스트로크 굵기
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={multiBorderWidth}
                      disabled={!multiBorderEnabled}
                      onChange={(event) =>
                        { applyMultiBorderPatch({
                          width: clampBorderWidth(
                            Number(event.target.value)
                          ),
                        }); }
                      }
                      className="flex-1"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={String(multiBorderWidth)}
                      onChange={(event) => {
                        const digits =
                          event.target.value.replace(/[^0-9]/g, "");
                        if (!digits) return;
                        applyMultiBorderPatch({
                          width: clampBorderWidth(Number(digits)),
                        });
                      }}
                      disabled={!multiBorderEnabled}
                      className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90 disabled:bg-black-10"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-14-regular text-black-60">색상</span>
                    <input
                      type="color"
                      value={multiBorderColor}
                      onChange={(event) =>
                        { applyMultiBorderPatch({
                          color: event.target.value,
                        }); }
                      }
                      disabled={!multiBorderEnabled}
                      className="color-input h-7 w-7 cursor-pointer rounded border border-black-30 bg-white-100 p-0 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        WebkitAppearance: "none",
                        appearance: "none",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {canDistribute && onDistributeHorizontal && onDistributeVertical && (
            <>
              <div className="w-px h-5 bg-black-25" />
              <button
                type="button"
                onClick={onDistributeHorizontal}
                className="group relative flex h-7 w-7 items-center justify-center rounded hover:bg-black-10 text-black-70 hover:text-black-90"
                aria-label="가로 간격 균등"
              >
                <AlignHorizontalSpaceAround className="h-4 w-4" />
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
                  가로 간격 균등
                </span>
              </button>
              <button
                type="button"
                onClick={onDistributeVertical}
                className="group relative flex h-7 w-7 items-center justify-center rounded hover:bg-black-10 text-black-70 hover:text-black-90"
                aria-label="세로 간격 균등"
              >
                <AlignVerticalSpaceAround className="h-4 w-4" />
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-0.5 text-12-medium text-white-100 opacity-0 group-hover:opacity-100">
                  세로 간격 균등
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiSelectionToolbar;
