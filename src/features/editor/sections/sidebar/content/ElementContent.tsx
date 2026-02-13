import {
  ArrowRight,
  Circle,
  Minus,
  RectangleHorizontal,
  Square,
} from "lucide-react";
import { useElementStore } from "@/features/editor/store/elementStore";
import type { ElementType } from "@/features/editor/model/canvasTypes";

type ShapeItem = {
  id: number;
  name: string;
  icon: typeof Square;
  type: ElementType;
};

const SHAPES: ShapeItem[] = [
  { id: 1, name: "사각형", icon: Square, type: "rect" },
  { id: 2, name: "둥근 사각형", icon: RectangleHorizontal, type: "roundRect" },
  { id: 3, name: "원", icon: Circle, type: "ellipse" },
  { id: 5, name: "선", icon: Minus, type: "line" },
  { id: 6, name: "화살표", icon: ArrowRight, type: "arrow" },
];

type ElementContentViewProps = {
  shapes: ShapeItem[];
  onSelectShape: (type: ElementType) => void;
};

const ElementContentView = ({
  shapes,
  onSelectShape,
}: ElementContentViewProps) => {
  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex items-center text-start">
        <span className="flex text-14-regular text-black-70">
          다양한 요소를 클릭하여 우측 캔버스에 추가해보세요.
        </span>
      </div>

      <div className="flex flex-col w-full gap-3">
        <div className="flex items-center">
          <span className="flex text-title-16-semibold items-center">
            도형 & 선
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            return (
              <button
                key={shape.id}
                onClick={() => { onSelectShape(shape.type); }}
                className="flex flex-col items-center justify-center gap-2 p-4 border border-black-25 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <Icon className="icon-m text-black-70 group-hover:text-primary transition-colors" />
                <span className="text-12-semibold text-black-90 group-hover:text-primary transition-colors">
                  {shape.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ElementContent = () => {
  const onSelectShape = useElementStore((s) => s.requestElement);

  return (
    <ElementContentView shapes={SHAPES} onSelectShape={onSelectShape} />
  );
};

export default ElementContent;
