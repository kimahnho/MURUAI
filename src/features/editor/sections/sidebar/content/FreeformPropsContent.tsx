/**
 * 자유형 요소 속성 편집 패널.
 * 테두리 UI는 ShapePropsContent와 동일한 패턴(없음/실선/점선/이중선/점).
 * 닫힌 경로: 채우기 색상 추가.
 */
import { useEffect } from "react";
import { Ban } from "lucide-react";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";
import type { FreeformPanelData } from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import LayerPanel from "./LayerPanel";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

const clampBorderWidth = (v: number) => Math.min(20, Math.max(1, v));

const FreeformPropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  useEffect(() => {
    if (!panelData || panelData.type !== "freeform") {
      setSideBarMenu("template");
    }
  }, [panelData, setSideBarMenu]);

  if (!panelData || panelData.type !== "freeform") return null;

  const data = panelData as FreeformPanelData;
  const { element, closed } = data;

  const strokeEnabled = element.stroke.width > 0;
  const strokeStyle = element.stroke.style ?? "solid";
  const strokeColor = element.stroke.color;
  const strokeWidth = element.stroke.width;

  // 테두리(stroke) 스타일 옵션 — ShapePropsContent와 동일
  const borderStyleOptions: Array<BorderStyle | "none"> = ["none", "solid", "dashed", "double", "dotted"];
  const activeStyle = strokeEnabled ? strokeStyle : "none";

  const handleStrokeStyleSelect = (style: BorderStyle | "none") => {
    if (style === "none") {
      updateElement?.(element.id, {
        stroke: { ...element.stroke, width: 0 },
      });
      return;
    }
    updateElement?.(element.id, {
      stroke: { color: strokeColor, width: strokeWidth || 2, style },
    });
  };

  const handleFillChange = (color: string) => {
    updateElement?.(element.id, { fill: color });
  };

  const handleMoveLayer = moveLayer
    ? (direction: import("@/features/editor/store/elementPanelStore").LayerDirection) => {
        moveLayer(element.id, direction);
      }
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* 매끈하게 토글 */}
      <div className="flex items-center justify-between">
        <span className="text-14-semibold text-black-90">매끈하게</span>
        <button
          type="button"
          onClick={() => updateElement?.(element.id, { smooth: !element.smooth })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            element.smooth ? "bg-primary" : "bg-black-25"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white-100 shadow transition-transform ${
              element.smooth ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 채우기 (닫힌 도형만) */}
      {closed && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">채우기</div>
          <div className="flex items-center gap-2">
            <ColorPickerPopover
              value={element.fill}
              onChange={handleFillChange}
              allowTransparent
            />
            <span className="text-14-regular text-black-70 uppercase">
              {element.fill === "transparent" ? "투명" : element.fill}
            </span>
          </div>
        </div>
      )}

      {/* 테두리 — ShapePropsContent와 동일 UI */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">테두리</div>
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
          <div className="flex items-center gap-2">
            {borderStyleOptions.map((styleOption) => {
              const isActive = activeStyle === styleOption;
              const cls = `flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${isActive ? "border-primary bg-primary-100 text-primary" : "border-black-30 text-black-70 hover:border-black-50"}`;
              if (styleOption === "none") {
                return <button key={styleOption} type="button" onClick={() => handleStrokeStyleSelect(styleOption)} className={cls}><Ban className="h-4 w-4" /></button>;
              }
              return (
                <button key={styleOption} type="button" onClick={() => handleStrokeStyleSelect(styleOption)} className={cls}>
                  <span className="block w-5" style={{ borderTopWidth: 2, borderTopStyle: styleOption, borderTopColor: "currentColor" }} />
                </button>
              );
            })}
          </div>
          {strokeEnabled && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-12-regular text-black-60">굵기</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={strokeWidth}
                    onChange={(e) => updateElement?.(element.id, { stroke: { ...element.stroke, width: clampBorderWidth(Number(e.target.value)) } })}
                    className="flex-1"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(strokeWidth)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/[^0-9]/g, "");
                      if (d) updateElement?.(element.id, { stroke: { ...element.stroke, width: clampBorderWidth(Number(d)) } });
                    }}
                    className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-12-regular text-black-60">색상</span>
                <ColorPickerPopover
                  value={strokeColor}
                  onChange={(color) => updateElement?.(element.id, { stroke: { ...element.stroke, color } })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 레이어 */}
      {handleMoveLayer && (
        <LayerPanel onMoveLayer={handleMoveLayer} />
      )}
    </div>
  );
};

export default FreeformPropsContent;
