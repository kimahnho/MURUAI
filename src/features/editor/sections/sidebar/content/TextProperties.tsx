/**
 * 선택 텍스트 요소의 상세 속성을 편집하는 프로퍼티 패널 컴포넌트.
 */
import {
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignStartHorizontal,
  TextAlignCenter,
  TextAlignStart,
  TextAlignEnd,
  Underline,
} from "lucide-react";
import type { CanvasElement, TextElement } from "@/features/editor/model/canvasTypes";

interface TextPropertiesProps {
  element: TextElement;
  onUpdateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
}

const TextProperties = ({
  element,
  onUpdateElement,
}: TextPropertiesProps) => {
  const minFontSize = 8;
  const maxFontSize = 200;
  const fontSize = element.style?.fontSize ?? 16;
  const color = element.style?.color ?? "#000000";
  const isBold =
    element.style?.fontWeight === "bold" ||
    (typeof element.style?.fontWeight === "number" &&
      element.style.fontWeight >= 700);
  const isUnderline = element.style?.underline ?? false;
  const align = element.style?.alignX ?? "left";
  const alignY = element.style?.alignY ?? "top";

  const clampFontSize = (value: number) =>
    Math.min(maxFontSize, Math.max(minFontSize, value));

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto">
      {/* 텍스트 자체 속성(크기/색상/강조) 편집 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 크기</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onUpdateElement(element.id, {
                style: {
                  ...element.style,
                  fontSize: clampFontSize(fontSize - 1),
                },
              });
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(fontSize)}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^0-9]/g, "");
              if (!digits) return;
              // 숫자 직접 입력도 동일 clamp 규칙을 사용해 버튼 증감 동작과 결과를 맞춘다.
              onUpdateElement(element.id, {
                style: {
                  ...element.style,
                  fontSize: clampFontSize(Number(digits)),
                },
              });
            }}
            className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
          />
          <button
            type="button"
            onClick={() => {
              onUpdateElement(element.id, {
                style: {
                  ...element.style,
                  fontSize: clampFontSize(fontSize + 1),
                },
              });
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
          >
            +
          </button>
        </div>
      </div>

      {/* 박스 내 정렬 속성 편집 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 색상</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(event) => {
              // 속성 패널에서 선택한 색상은 단일 텍스트 요소 style 필드에 즉시 반영한다.
              onUpdateElement(element.id, {
                style: { ...element.style, color: event.target.value },
              });
            }}
            className="color-input h-10 w-10 cursor-pointer rounded-lg border border-black-30 bg-white-100 p-0 overflow-hidden"
            style={{ WebkitAppearance: "none", appearance: "none" }}
          />
          <span className="text-14-regular text-black-70 uppercase">
            {color}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 스타일</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // 굵게/밑줄은 토글형 속성이라 기존 style을 유지한 채 해당 키만 반전한다.
              onUpdateElement(element.id, {
                style: {
                  ...element.style,
                  fontWeight: isBold ? "normal" : "bold",
                },
              });
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border text-16-semibold transition-colors ${
              isBold
                ? "border-primary bg-primary/10 text-primary"
                : "border-black-30 text-black-70 hover:border-black-50"
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdateElement(element.id, {
                style: { ...element.style, underline: !isUnderline },
              });
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              isUnderline
                ? "border-primary bg-primary/10 text-primary"
                : "border-black-30 text-black-70 hover:border-black-50"
            }`}
          >
            <Underline className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">가로 정렬</div>
        <div className="flex items-center gap-2">
          {(
            [
              { key: "left", Icon: TextAlignStart, label: "왼쪽" },
              { key: "center", Icon: TextAlignCenter, label: "가운데" },
              { key: "right", Icon: TextAlignEnd, label: "오른쪽" },
            ] as const
          ).map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                // 정렬 버튼은 개별 속성만 덮어써서 다른 텍스트 스타일과 충돌하지 않게 한다.
                onUpdateElement(element.id, {
                  style: { ...element.style, alignX: key },
                });
              }}
              className={`flex-1 flex h-10 items-center justify-center rounded-lg border transition-colors ${
                align === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">세로 정렬</div>
        <div className="flex items-center gap-2">
          {(
            [
              { key: "top", Icon: AlignStartHorizontal, label: "위" },
              { key: "middle", Icon: AlignCenterVertical, label: "중앙" },
              { key: "bottom", Icon: AlignEndHorizontal, label: "아래" },
            ] as const
          ).map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onUpdateElement(element.id, {
                  style: { ...element.style, alignY: key },
                });
              }}
              className={`flex-1 flex h-10 items-center justify-center rounded-lg border transition-colors ${
                alignY === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextProperties;
