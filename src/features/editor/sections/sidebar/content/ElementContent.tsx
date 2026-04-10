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
import { useDrawingModeStore } from "@/features/editor/store/drawingModeStore";
import type { ElementType } from "@/features/editor/model/canvasTypes";

type ShapeItem = {
  id: number;
  name: string;
  icon: typeof Square;
  type: ElementType;
};

const SyllableBoxIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 40 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="28"
  >
    <rect x="1" y="1" width="38" height="46" rx="0" fill="#FFFFFF" stroke="#000" strokeWidth="2" strokeDasharray="4 2" />
    <rect x="1" y="1" width="20" height="19" rx="0" fill="#FFFFFF" stroke="#000" strokeWidth="2" strokeDasharray="4 2" />
    <rect x="1" y="32" width="38" height="15" rx="0" fill="#FFFFFF" stroke="#000" strokeWidth="2" strokeDasharray="4 2" />
  </svg>
);

// 자유형 아이콘: freeform_icon(2).svg 도형만 확대 + 굵은 외곽선
const FreeformIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="25 45 175 185"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
  >
    <path
      d="M68.2764 58.79C69.4236 58.4468 71.0575 58.3771 73.3457 58.752C77.9323 59.5034 84.6569 61.9527 94.2568 66.5674C132.814 85.1015 156.97 92.409 171.549 95.0664C178.842 96.3957 183.759 96.5657 186.896 96.3857C187.279 96.3637 187.636 96.3347 187.968 96.3037C169.531 126.61 162.333 141.79 163.049 156.905C163.417 164.691 165.878 172.354 169.744 181.912C171.679 186.695 173.984 191.995 176.577 198.04C178.955 203.584 181.581 209.773 184.408 216.813C184.374 216.815 184.34 216.817 184.305 216.818C182.867 216.879 180.765 216.962 178.111 217.048C172.804 217.22 165.292 217.409 156.479 217.476C138.843 217.608 116.025 217.249 95.2314 215.287C84.8338 214.306 74.9711 212.927 66.5293 211.018C58.0579 209.101 51.145 206.678 46.5566 203.674C41.9906 200.684 40.0198 197.346 40.5996 193.511C41.2142 189.446 44.7327 184.278 52.7021 177.888C85.6514 151.467 76.839 113.343 70.0059 87.3965C68.2788 80.8386 66.6851 75.0974 65.8408 70.3916C65.42 68.0458 65.1984 66.0227 65.2285 64.335C65.2588 62.6367 65.5435 61.3932 66.0332 60.5205C66.4936 59.7001 67.1838 59.1169 68.2764 58.79Z"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

type ShapeItemWithAction = {
  id: number;
  name: string;
  action: "syllableBox" | "freeform";
  customIcon: React.FC<{ className?: string }>;
};

type ShapeItemWithCustom = ShapeItem | ShapeItemWithAction;

const SHAPES: (ShapeItem | ShapeItemWithCustom)[] = [
  { id: 1, name: "사각형", icon: Square, type: "rect" },
  { id: 2, name: "둥근 사각형", icon: RectangleHorizontal, type: "roundRect" },
  { id: 3, name: "원", icon: Circle, type: "ellipse" },
  { id: 4, name: "모자이크", icon: Grid3x3, type: "mosaic" },
  { id: 5, name: "원형모자이크", icon: CircleDashed, type: "circleMosaic" },
  { id: 6, name: "선", icon: Minus, type: "line" },
  { id: 7, name: "화살표", icon: ArrowRight, type: "arrow" },
  { id: 8, name: "AAC 카드", icon: SquareUser, type: "aacCard" },
  { id: 9, name: "감정카드", icon: SmilePlus, type: "emotionCard" },
  { id: 10, name: "음절상자", customIcon: SyllableBoxIcon, action: "syllableBox" },
  { id: 11, name: "자유형", customIcon: FreeformIcon, action: "freeform" },
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
  const requestSyllableBox = useElementStore((s) => s.requestSyllableBox);
  const isFreeformDrawing = useDrawingModeStore((s) => s.isDrawing);

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
            const isAction = "action" in shape;
            const handleClick = () => {
              if (isAction && shape.action === "syllableBox") {
                requestSyllableBox();
              } else if (isAction && shape.action === "freeform") {
                // 토글: 이미 그리기 모드이면 해제, 아니면 활성화
                const store = useDrawingModeStore.getState();
                store.setIsDrawing(!store.isDrawing);
              } else if ("type" in shape) {
                onSelectShape(shape.type);
              }
            };
            // 자유형 버튼은 그리기 모드 활성 시 선택된 상태로 표시
            const isFreeformActive = isAction && shape.action === "freeform" && isFreeformDrawing;
            return (
              <button
                key={shape.id}
                onClick={handleClick}
                className={`flex flex-col items-center justify-center gap-2 px-2 py-4 border rounded-lg transition-all cursor-pointer group ${
                  isFreeformActive
                    ? "border-primary bg-primary-50"
                    : "border-black-25 hover:border-primary hover:bg-primary-50"
                }`}
              >
                {"customIcon" in shape ? (
                  <shape.customIcon className={`icon-m transition-colors ${isFreeformActive ? "text-primary" : "text-black-70 group-hover:text-primary"}`} />
                ) : (
                  <shape.icon className="icon-m text-black-70 group-hover:text-primary transition-colors" />
                )}
                <span className={`text-12-semibold transition-colors ${isFreeformActive ? "text-primary" : "text-black-90 group-hover:text-primary"}`}>
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
