/**
 * 다중 선택 상태에서 사이드바에 표시되는 공통 속성 편집 패널.
 */
import { useEffect, useState } from "react";
import { AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Ban } from "lucide-react";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import InlineFontPicker from "@/features/editor/shared/InlineFontPicker";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

const MultiPropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const multiCallbacks = useElementPanelStore((s) => s.multiCallbacks);
  const changeAllMatchingColors = useElementPanelStore((s) => s.changeAllMatchingColors);
  const hasMatchingColors = useElementPanelStore((s) => s.hasMatchingColors);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);
  const [isBorderPanelOpen, setIsBorderPanelOpen] = useState(false);

  useEffect(() => {
    if (!panelData || panelData.type !== "multi") {
      setSideBarMenu("template");
    }
  }, [panelData, setSideBarMenu]);

  if (!panelData || panelData.type !== "multi" || !multiCallbacks) return null;

  const {
    multiColorValue,
    onMultiColorChange,
    hasMultiFontTargets,
    multiFontFamily,
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
  } = multiCallbacks;

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto">
      {/* 색상 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">색상</div>
        <div className="flex items-center gap-2">
          <ColorPickerPopover value={multiColorValue} onChange={onMultiColorChange} onChangeAll={changeAllMatchingColors ?? undefined} hasMatchingColors={hasMatchingColors ?? undefined} allowTransparent />
          <span className="text-14-regular text-black-70 uppercase">{multiColorValue === "transparent" ? "투명" : multiColorValue}</span>
        </div>
      </div>

      {/* 글꼴 */}
      {hasMultiFontTargets && (
        <>
          <InlineFontPicker fontFamily={multiFontFamily} />

          {/* 텍스트 크기 */}
          <div className="flex flex-col gap-2">
            <div className="text-14-semibold text-black-90">텍스트 크기</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => multiFontSizeInput.step(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">-</button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={multiFontSizeInput.displayValue}
                onChange={(e) => multiFontSizeInput.handleChange(e.target.value)}
                onFocus={multiFontSizeInput.handleFocus}
                onBlur={multiFontSizeInput.handleBlur}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); multiFontSizeInput.commit(); e.currentTarget.blur(); } }}
                className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
              />
              <button type="button" onClick={() => multiFontSizeInput.step(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">+</button>
            </div>
          </div>
        </>
      )}

      {/* 테두리 */}
      {hasMultiBorderTargets && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-14-semibold text-black-90">테두리</div>
            <button
              type="button"
              onClick={() => setIsBorderPanelOpen((prev) => !prev)}
              className={`text-12-medium px-2 py-1 rounded ${isBorderPanelOpen || multiBorderEnabled ? "text-primary" : "text-black-60"}`}
            >
              {isBorderPanelOpen ? "접기" : "펼치기"}
            </button>
          </div>
          {isBorderPanelOpen && (
            <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
              <div className="flex items-center gap-2">
                {borderStyleOptions.map((styleOption) => {
                  const isActive = activeBorderStyle === styleOption;
                  const cls = `flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${isActive ? "border-primary bg-primary/10 text-primary" : "border-black-30 text-black-70 hover:border-black-50"}`;
                  if (styleOption === "none") {
                    return <button key={styleOption} type="button" onClick={() => applyMultiBorderPatch({ enabled: false })} className={cls}><Ban className="h-4 w-4" /></button>;
                  }
                  return (
                    <button key={styleOption} type="button" onClick={() => applyMultiBorderPatch({ enabled: true, style: styleOption as BorderStyle })} className={cls}>
                      <span className="block w-5" style={{ borderTopWidth: 2, borderTopStyle: styleOption as BorderStyle, borderTopColor: "currentColor" }} />
                    </button>
                  );
                })}
              </div>
              {multiBorderEnabled && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-12-regular text-black-60">굵기</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={1} max={20} value={multiBorderWidth} onChange={(e) => applyMultiBorderPatch({ width: clampBorderWidth(Number(e.target.value)) })} className="flex-1" />
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={String(multiBorderWidth)} onChange={(e) => { const d = e.target.value.replace(/[^0-9]/g, ""); if (d) applyMultiBorderPatch({ width: clampBorderWidth(Number(d)) }); }} className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-12-regular text-black-60">색상</span>
                    <input type="color" value={multiBorderColor} onChange={(e) => applyMultiBorderPatch({ color: e.target.value })} className="color-input h-7 w-7 cursor-pointer rounded border border-black-30 bg-white-100 p-0" style={{ WebkitAppearance: "none", appearance: "none" }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 분배 */}
      {canDistribute && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">간격 분배</div>
          <div className="flex gap-2">
            <button type="button" onClick={onDistributeHorizontal} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-70 hover:border-primary hover:text-primary">
              <AlignHorizontalSpaceAround className="h-4 w-4" />
              가로
            </button>
            <button type="button" onClick={onDistributeVertical} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-70 hover:border-primary hover:text-primary">
              <AlignVerticalSpaceAround className="h-4 w-4" />
              세로
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiPropsContent;
