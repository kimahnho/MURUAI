/**
 * 화살표 요소 선택 시 사이드바에 표시되는 속성 편집 패널.
 * 선 요소와 동일한 UI를 공유한다 (LineArrowPanelUI).
 */
import { useEffect } from "react";
import { useElementPanelStore, type LinePanelData } from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import { LineArrowPanelUI } from "./LinePropsContent";

const ArrowPropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const updateLines = useElementPanelStore((s) => s.updateLines);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  useEffect(() => {
    if (!panelData || panelData.type !== "arrow") {
      setSideBarMenu(null);
    }
  }, [panelData, setSideBarMenu]);

  if (!panelData || panelData.type !== "arrow" || !updateElement || !updateLines) return null;

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

export default ArrowPropsContent;
