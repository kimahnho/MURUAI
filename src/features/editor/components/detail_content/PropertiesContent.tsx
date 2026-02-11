import type { CanvasElement } from "../../model/canvasTypes";
import ShapeProperties from "./ShapeProperties";
import TextProperties from "./TextProperties";

interface PropertiesContentProps {
  selectedElements: CanvasElement[];
  onUpdateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
}

const PropertiesContent = ({
  selectedElements,
  onUpdateElement,
}: PropertiesContentProps) => {
  if (selectedElements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <div className="text-16-semibold text-black-90">
          요소를 선택해주세요
        </div>
        <div className="text-14-regular text-black-60">
          캔버스에서 요소를 선택하면
          <br />
          속성을 편집할 수 있어요
        </div>
      </div>
    );
  }

  if (selectedElements.length === 1) {
    const element = selectedElements[0];

    if (element.type === "rect" || element.type === "ellipse") {
      return (
        <ShapeProperties element={element} onUpdateElement={onUpdateElement} />
      );
    }

    if (element.type === "text") {
      return (
        <TextProperties element={element} onUpdateElement={onUpdateElement} />
      );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
      <div className="text-16-semibold text-black-90">
        {selectedElements.length}개 선택됨
      </div>
      <div className="text-14-regular text-black-60">
        여러 요소가 선택되었어요
      </div>
    </div>
  );
};

export default PropertiesContent;
