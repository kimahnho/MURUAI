/**
 * AAC 요소 선택 시 사이드바에 표시되는 속성 편집 패널.
 */
import { useEffect, type MouseEvent } from "react";
import {
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  EyeOff,
} from "lucide-react";
import { useElementPanelStore, type AacPanelData } from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import type { AacLabelPosition } from "@/features/editor/utils/aacBoardUtils";
import LayerPanel from "./LayerPanel";

const POSITION_OPTIONS: Array<{ id: AacLabelPosition; icon: typeof AlignVerticalJustifyStart; label: string }> = [
  { id: "top", icon: AlignVerticalJustifyStart, label: "상단" },
  { id: "bottom", icon: AlignVerticalJustifyEnd, label: "하단" },
  { id: "none", icon: EyeOff, label: "없음" },
];

const AacPropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  useEffect(() => {
    if (!panelData || panelData.type !== "aac") {
      setSideBarMenu(null);
    }
  }, [panelData, setSideBarMenu]);

  if (!panelData || panelData.type !== "aac" || !updateElement) return null;

  const data = panelData as AacPanelData;
  const { labelPosition, cardCount, elementId } = data;

  const handleOptionClick = (event: MouseEvent<HTMLButtonElement>) => {
    const nextPosition = event.currentTarget.dataset.position as AacLabelPosition | undefined;
    if (!nextPosition) return;
    updateElement(elementId, { labelPosition: nextPosition });
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto">
      {/* 텍스트 위치 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 위치</div>
        <div className="flex gap-1">
          {POSITION_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = labelPosition === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-position={option.id}
                onClick={handleOptionClick}
                className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-primary"
                    : "border-black-30 bg-white text-black-60 hover:bg-black-5"
                }`}
                title={option.label}
                aria-pressed={isActive}
              >
                <Icon className="w-4 h-4" />
                <span className="text-12-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 카드 수 표시 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">카드 수</div>
        <div className="text-14-regular text-black-70">{cardCount}개</div>
      </div>

      {/* 레이어 */}
      {moveLayer && elementId && (
        <LayerPanel onMoveLayer={(dir) => moveLayer(elementId, dir)} />
      )}
    </div>
  );
};

export default AacPropsContent;
