/**
 * 자유형 요소 속성 편집 패널.
 * 열린 경로: 선 색상/두께/스타일
 * 닫힌 경로: + 채우기 색상, 테두리
 */
import { useEffect } from "react";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";
import type { FreeformPanelData } from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import LayerPanel from "./LayerPanel";

const STROKE_STYLES = [
  { value: "solid" as const, label: "실선" },
  { value: "dashed" as const, label: "점선" },
  { value: "dotted" as const, label: "점" },
];

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

  const handleStrokeColorChange = (color: string) => {
    updateElement?.(element.id, {
      stroke: { ...element.stroke, color },
    });
  };

  const handleStrokeWidthChange = (width: number) => {
    updateElement?.(element.id, {
      stroke: { ...element.stroke, width: Math.max(1, Math.min(20, width)) },
    });
  };

  const handleStrokeStyleChange = (style: "solid" | "dashed" | "dotted") => {
    updateElement?.(element.id, {
      stroke: { ...element.stroke, style },
    });
  };

  const handleFillChange = (color: string) => {
    updateElement?.(element.id, { fill: color });
  };

  const handleBorderToggle = (enabled: boolean) => {
    updateElement?.(element.id, {
      border: {
        enabled,
        color: element.border?.color ?? "#000000",
        width: element.border?.width ?? 2,
        style: element.border?.style ?? "solid",
      },
    });
  };

  const handleBorderColorChange = (color: string) => {
    if (!element.border) return;
    updateElement?.(element.id, {
      border: { ...element.border, color },
    });
  };

  const handleBorderWidthChange = (width: number) => {
    if (!element.border) return;
    updateElement?.(element.id, {
      border: { ...element.border, width: Math.max(1, Math.min(20, width)) },
    });
  };

  const handleMoveLayer = moveLayer
    ? (direction: import("@/features/editor/store/elementPanelStore").LayerDirection) => {
        moveLayer(element.id, direction);
      }
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* 크기 */}
      <div className="flex flex-col gap-2">
        <span className="text-13-bold text-black-70">크기</span>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-12-semibold text-black-50">W</span>
            <span className="text-13-regular text-black-90">{Math.round(element.w)}px</span>
          </div>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-12-semibold text-black-50">H</span>
            <span className="text-13-regular text-black-90">{Math.round(element.h)}px</span>
          </div>
        </div>
      </div>

      {/* 선 스타일 */}
      <div className="flex flex-col gap-2">
        <span className="text-13-bold text-black-70">선</span>
        <div className="flex items-center gap-2">
          <ColorPickerPopover
            value={element.stroke.color}
            onChange={handleStrokeColorChange}
          />
          <input
            type="number"
            value={element.stroke.width}
            onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
            min={1}
            max={20}
            className="w-14 rounded border border-black-25 px-2 py-1 text-center text-13-regular text-black-90"
          />
          <span className="text-12-semibold text-black-50">px</span>
        </div>
        <div className="flex gap-1">
          {STROKE_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStrokeStyleChange(s.value)}
              className={`flex-1 rounded border px-2 py-1.5 text-12-semibold transition ${
                (element.stroke.style ?? "solid") === s.value
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-black-25 text-black-70 hover:border-primary-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 채우기 (닫힌 도형만) */}
      {closed && (
        <div className="flex flex-col gap-2">
          <span className="text-13-bold text-black-70">채우기</span>
          <div className="flex items-center gap-2">
            <ColorPickerPopover
              value={element.fill}
              onChange={handleFillChange}
            />
            <span className="text-13-regular text-black-90 min-w-0 truncate">{element.fill}</span>
          </div>
        </div>
      )}

      {/* 테두리 (닫힌 도형만) */}
      {closed && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-13-bold text-black-70">테두리</span>
            <button
              onClick={() => handleBorderToggle(!element.border?.enabled)}
              className={`rounded px-2 py-0.5 text-12-semibold transition ${
                element.border?.enabled
                  ? "bg-primary-100 text-primary"
                  : "bg-black-5 text-black-50"
              }`}
            >
              {element.border?.enabled ? "ON" : "OFF"}
            </button>
          </div>
          {element.border?.enabled && (
            <div className="flex items-center gap-2">
              <ColorPickerPopover
                value={element.border.color}
                onChange={handleBorderColorChange}
              />
              <input
                type="number"
                value={element.border.width}
                onChange={(e) => handleBorderWidthChange(Number(e.target.value))}
                min={1}
                max={20}
                className="w-14 rounded border border-black-25 px-2 py-1 text-center text-13-regular text-black-90"
              />
              <span className="text-12-semibold text-black-50">px</span>
            </div>
          )}
        </div>
      )}

      {/* 레이어 */}
      {handleMoveLayer && (
        <LayerPanel onMoveLayer={handleMoveLayer} />
      )}
    </div>
  );
};

export default FreeformPropsContent;
