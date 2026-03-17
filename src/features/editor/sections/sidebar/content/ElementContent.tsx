/**
 * 사이드바 현재 메뉴에 맞는 요소 패널을 라우팅해 표시하는 컨테이너 컴포넌트.
 */
import { useState } from "react";
import {
  ArrowRight,
  Circle,
  CircleDashed,
  Grid3x3,
  Minus,
  RectangleHorizontal,
  SmilePlus,
  Square,
  SquareUser,
  Table2,
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
  { id: 4, name: "모자이크", icon: Grid3x3, type: "mosaic" },
  { id: 5, name: "원형모자이크", icon: CircleDashed, type: "circleMosaic" },
  { id: 6, name: "선", icon: Minus, type: "line" },
  { id: 7, name: "화살표", icon: ArrowRight, type: "arrow" },
  { id: 8, name: "AAC 카드", icon: SquareUser, type: "aacCard" },
  { id: 9, name: "감정카드", icon: SmilePlus, type: "emotionCard" },
];

const MIN_TABLE_SIZE = 1;
const MAX_TABLE_SIZE = 20;
const DEFAULT_TABLE_SIZE = 3;

const clampSize = (value: number) =>
  Math.min(MAX_TABLE_SIZE, Math.max(MIN_TABLE_SIZE, value));

const ElementContent = () => {
  // 요소 생성 요청은 전역 element store로 보내 캔버스/히스토리 경로를 동일하게 유지한다.
  const onSelectShape = useElementStore((s) => s.requestElement);
  const requestTableElement = useElementStore((s) => s.requestTableElement);

  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableRows, setTableRows] = useState(DEFAULT_TABLE_SIZE);
  const [tableCols, setTableCols] = useState(DEFAULT_TABLE_SIZE);

  const handleTableConfirm = () => {
    requestTableElement(tableRows, tableCols);
    setShowTablePopup(false);
    setTableRows(DEFAULT_TABLE_SIZE);
    setTableCols(DEFAULT_TABLE_SIZE);
  };

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
          {SHAPES.map((shape) => {
            const Icon = shape.icon;
            return (
              <button
                key={shape.id}
                // 도형 선택 이벤트는 type만 전달하고, 기본 크기/위치는 스토어 생성 규칙으로 일관 처리한다.
                onClick={() => { onSelectShape(shape.type); }}
                className="flex flex-col items-center justify-center gap-2 px-2 py-4 border border-black-25 rounded-lg hover:border-primary hover:bg-primary-50 transition-all cursor-pointer group"
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

      <div className="flex flex-col w-full gap-3">
        <div className="flex items-center">
          <span className="flex text-title-16-semibold items-center">표</span>
        </div>
        <div className="relative">
          <button
            onClick={() => { setShowTablePopup((prev) => !prev); }}
            className="flex flex-col items-center justify-center gap-2 p-4 border border-black-25 rounded-lg hover:border-primary hover:bg-primary-50 transition-all cursor-pointer group w-full"
          >
            <Table2 className="icon-m text-black-70 group-hover:text-primary transition-colors" />
            <span className="text-12-semibold text-black-90 group-hover:text-primary transition-colors">
              표
            </span>
          </button>

          {showTablePopup && (
            <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-black-25 bg-white-100 p-4 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-14-regular text-black-70">행</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setTableRows((v) => clampSize(v - 1)); }}
                    disabled={tableRows <= MIN_TABLE_SIZE}
                    className="flex h-7 w-7 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-14-semibold"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tableRows}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) setTableRows(clampSize(v));
                    }}
                    className="w-10 text-center rounded border border-black-30 py-1 text-14-regular text-black-90"
                  />
                  <button
                    type="button"
                    onClick={() => { setTableRows((v) => clampSize(v + 1)); }}
                    disabled={tableRows >= MAX_TABLE_SIZE}
                    className="flex h-7 w-7 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-14-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-14-regular text-black-70">열</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setTableCols((v) => clampSize(v - 1)); }}
                    disabled={tableCols <= MIN_TABLE_SIZE}
                    className="flex h-7 w-7 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-14-semibold"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tableCols}
                    onChange={(e) => {
                      const v = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) setTableCols(clampSize(v));
                    }}
                    className="w-10 text-center rounded border border-black-30 py-1 text-14-regular text-black-90"
                  />
                  <button
                    type="button"
                    onClick={() => { setTableCols((v) => clampSize(v + 1)); }}
                    disabled={tableCols >= MAX_TABLE_SIZE}
                    className="flex h-7 w-7 items-center justify-center rounded border border-black-30 text-black-70 hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed text-14-semibold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowTablePopup(false); }}
                  className="flex-1 rounded border border-black-30 py-2 text-14-regular text-black-70 hover:bg-black-5"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleTableConfirm}
                  className="flex-1 rounded bg-primary py-2 text-14-regular text-white-100 hover:bg-primary-700"
                >
                  추가
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElementContent;
