/**
 * 선 요소 선택 시 사이드바에 표시되는 속성 편집 패널.
 */
import { useEffect } from "react";
import { useElementPanelStore, type LinePanelData } from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import { useNumberInput } from "@/features/editor/shared/hooks/useNumberInput";
import { clamp } from "@/features/editor/utils/domUtils";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import LayerPanel from "./LayerPanel";

const LinePropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const updateLines = useElementPanelStore((s) => s.updateLines);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  useEffect(() => {
    if (!panelData || panelData.type !== "line") {
      setSideBarMenu("template");
    }
  }, [panelData, setSideBarMenu]);

  if (!panelData || panelData.type !== "line" || !updateElement || !updateLines) return null;

  const data = panelData as LinePanelData;
  const { element, stroke, length, angle } = data;
  const minWidth = 1;
  const maxWidth = 20;

  return (
    <LineArrowPanelUI
      element={element}
      stroke={stroke}
      length={length}
      angle={angle}
      minWidth={minWidth}
      maxWidth={maxWidth}
      updateLines={updateLines}
      updateElement={updateElement}
      moveLayer={moveLayer}
    />
  );
};

// 선/화살표 공통 UI
export const LineArrowPanelUI = ({
  element,
  stroke,
  length,
  angle,
  minWidth,
  maxWidth,
  updateLines,
  updateElement,
  moveLayer,
}: {
  element: LinePanelData["element"];
  stroke: LinePanelData["stroke"];
  length: number;
  angle: number;
  minWidth: number;
  maxWidth: number;
  updateLines: (updater: (el: typeof element) => Partial<typeof element>) => void;
  updateElement: (id: string, patch: Record<string, unknown>) => void;
  moveLayer: ((elementId: string, direction: import("@/features/editor/utils/layerUtils").LayerDirection) => void) | null;
}) => {
  const changeAllMatchingColors = useElementPanelStore((s) => s.changeAllMatchingColors);
  const hasMatchingColors = useElementPanelStore((s) => s.hasMatchingColors);
  const style = element.stroke.style ?? "solid";

  const widthInput = useNumberInput({ value: stroke.width, min: minWidth, max: maxWidth, onChange: (v) => updateLines((el) => ({ stroke: { ...el.stroke, width: v } })) });
  const lengthInput = useNumberInput({ value: length, min: 1, max: 9999, onChange: (newLen) => {
    const angleRad = (angle * Math.PI) / 180;
    updateElement(element.id, { end: { x: element.start.x + newLen * Math.cos(angleRad), y: element.start.y + newLen * Math.sin(angleRad) } });
  }});
  const angleInput = useNumberInput({ value: angle, min: 0, max: 359, onChange: (newAngle) => {
    const angleRad = (newAngle * Math.PI) / 180;
    updateElement(element.id, { end: { x: element.start.x + length * Math.cos(angleRad), y: element.start.y + length * Math.sin(angleRad) } });
  }, immediate: true });

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto">
      {/* 선 종류 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">선 종류</div>
        <div className="flex gap-1">
          {(["solid", "dashed", "dotted"] as const).map((s) => (
            <button key={s} type="button" onClick={() => updateLines((el) => ({ stroke: { ...el.stroke, style: s } }))} className={`flex h-10 flex-1 items-center justify-center rounded-lg border ${style === s ? "border-blue-500 bg-blue-50" : "border-black-30 bg-white hover:bg-black-5"}`} title={s === "solid" ? "실선" : s === "dashed" ? "긴 점선" : "점선"}>
              <svg width="32" height="2" viewBox="0 0 32 2">
                <line x1="0" y1="1" x2="32" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray={s === "solid" ? undefined : s === "dashed" ? "6 3" : "2 3"} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* 선 굵기 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">선 굵기</div>
        <div className="flex items-center gap-2">
          <input type="range" min={minWidth} max={maxWidth} value={stroke.width} onChange={(e) => updateLines((el) => ({ stroke: { ...el.stroke, width: clamp(Number(e.target.value), minWidth, maxWidth) } }))} className="flex-1" />
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={widthInput.displayValue} onChange={(e) => widthInput.handleChange(e.target.value)} onBlur={widthInput.handleBlur} onFocus={widthInput.handleFocus} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); widthInput.commit(); e.currentTarget.blur(); } }} className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90" />
        </div>
      </div>

      {/* 색상 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">색상</div>
        <div className="flex items-center gap-2">
          <ColorPickerPopover value={stroke.color} onChange={(color) => updateLines((el) => ({ stroke: { ...el.stroke, color } }))} onChangeAll={changeAllMatchingColors ?? undefined} hasMatchingColors={hasMatchingColors ?? undefined} />
          <span className="text-14-regular text-black-70 uppercase">{stroke.color}</span>
        </div>
      </div>

      {/* 길이 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">길이</div>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={lengthInput.displayValue} onChange={(e) => lengthInput.handleChange(e.target.value)} onBlur={lengthInput.handleBlur} onFocus={lengthInput.handleFocus} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lengthInput.commit(); e.currentTarget.blur(); } }} className="no-spinner w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90" />
      </div>

      {/* 각도 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">각도</div>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={359} step={1} value={angleInput.displayValue} onChange={(e) => angleInput.handleChange(e.target.value)} onBlur={angleInput.handleBlur} onFocus={angleInput.handleFocus} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); angleInput.commit(); e.currentTarget.blur(); } }} className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90" />
          <span className="text-14-regular text-black-60">°</span>
        </div>
      </div>

      {/* 레이어 */}
      {moveLayer && <LayerPanel onMoveLayer={(dir) => moveLayer(element.id, dir)} />}
    </div>
  );
};

export default LinePropsContent;
