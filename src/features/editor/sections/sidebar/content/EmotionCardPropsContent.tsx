/**
 * 감정카드 복합 요소 선택 시 사이드바에 표시되는 속성 편집 패널.
 * "감정" 탭(감정 이미지 선택)과 "박스" 탭(라벨 위치/테두리/배경 스타일)을 제공한다.
 */
import { useState, useEffect, useRef } from "react";
import {
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  Bold,
  EyeOff,
  Ban,
  Pipette,
} from "lucide-react";
import {
  useElementPanelStore,
  type EmotionCardPanelData,
} from "@/features/editor/store/elementPanelStore";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import type { AacCardLabelStyle } from "@/features/editor/model/canvasTypes";
import { FONT_OPTIONS } from "@/shared/utils/fontOptions";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import { useRecentColorStore } from "@/features/editor/store/recentColorStore";
import LayerPanel from "./LayerPanel";
import EmotionContent from "./EmotionContent";

type Tab = "emotion" | "box";
type LabelPosition = "top" | "bottom" | "none";
type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type EyeDropperResult = { sRGBHex: string };
type EyeDropperInstance = { open: () => Promise<EyeDropperResult> };
type EyeDropperConstructor = new () => EyeDropperInstance;

const POSITION_OPTIONS: Array<{
  id: LabelPosition;
  icon: typeof AlignVerticalJustifyStart;
  label: string;
}> = [
  { id: "top", icon: AlignVerticalJustifyStart, label: "상단" },
  { id: "bottom", icon: AlignVerticalJustifyEnd, label: "하단" },
  { id: "none", icon: EyeOff, label: "없음" },
];

const EmotionCardPropsContent = () => {
  const [activeTab, setActiveTab] = useState<Tab>("emotion");
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);
  const addRecentColor = useRecentColorStore((s) => s.addRecentColor);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);
  const boxColorPickerRef = useRef<HTMLInputElement>(null);

  const isEmotionCard = panelData?.type === "emotionCard";

  useEffect(() => {
    if (!panelData || panelData.type !== "emotionCard") {
      setSideBarMenu("template");
    }
  }, [panelData, setSideBarMenu]);

  // 이미지가 있으면 박스(스타일) 탭, 없으면 감정(이미지 선택) 탭으로 자동 전환
  useEffect(() => {
    if (isEmotionCard && panelData?.type === "emotionCard") {
      setActiveTab(panelData.hasImage ? "box" : "emotion");
    }
  }, [isEmotionCard, panelData]);

  if (!panelData || panelData.type !== "emotionCard" || !updateElement) return null;

  const data = panelData as EmotionCardPanelData;
  const { element } = data;
  const { label, border, fill } = element;
  const isImageFill = fill.startsWith("url(") || fill.startsWith("data:");
  const colorValue = element.backgroundColor ?? (isImageFill ? "#FFFFFF" : fill);
  const borderEnabled = border?.enabled ?? false;
  const borderColor = border?.color ?? "#E5E7EB";
  const borderWidth = border?.width ?? 2;
  const borderStyle = border?.style ?? "solid";
  const radius = element.radius ?? 0;

  const clampBorderWidth = (value: number) =>
    Math.min(20, Math.max(1, value));

  const handleLabelPositionChange = (position: LabelPosition) => {
    updateElement(element.id, {
      label: { ...label, position },
    });
  };

  const handleLabelStyleChange = (patch: Partial<AacCardLabelStyle>) => {
    updateElement(element.id, {
      label: { ...label, style: { ...label.style, ...patch } },
    });
  };

  const handleBorderStyleSelect = (style: BorderStyle | "none") => {
    if (style === "none") {
      updateElement(element.id, {
        border: { ...border, enabled: false } as typeof border,
      });
      return;
    }
    updateElement(element.id, {
      border: { enabled: true, color: borderColor, width: borderWidth, style },
    });
  };

  const handleOpenEyeDropper = async () => {
    const EyeDropperApi = (
      window as Window & { EyeDropper?: EyeDropperConstructor }
    ).EyeDropper;
    if (EyeDropperApi) {
      try {
        const eyeDropper = new EyeDropperApi();
        const result = await eyeDropper.open();
        const picked = result.sRGBHex.toUpperCase();
        if (isImageFill) {
          updateElement(element.id, { backgroundColor: picked });
        } else {
          updateElement(element.id, { fill: picked });
        }
        addRecentColor(picked);
        return;
      } catch {
        /* 사용자 취소 */
      }
    }
    const input = boxColorPickerRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.click();
  };

  const borderStyleOptions: Array<BorderStyle | "none"> = [
    "none",
    "solid",
    "dashed",
    "double",
    "dotted",
  ];
  const activeStyle = borderEnabled ? borderStyle : "none";

  const boxContent = (
    <div className="flex flex-col w-full gap-4">
      {/* 라벨 위치 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 위치</div>
        <div className="flex gap-1">
          {POSITION_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = label.position === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleLabelPositionChange(option.id)}
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

      {/* 텍스트 스타일 */}
      {label.position !== "none" && (
        <>
          {/* 글꼴 */}
          <div className="flex flex-col gap-2">
            <div className="text-14-semibold text-black-90">글꼴</div>
            <select
              value={label.style.fontFamily ?? "Pretendard"}
              onChange={(e) => handleLabelStyleChange({ fontFamily: e.target.value })}
              className="w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90 bg-white-100"
              style={{ fontFamily: label.style.fontFamily ?? "Pretendard" }}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.id} value={font.family} style={{ fontFamily: font.family }}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* 텍스트 크기 + 굵기 */}
          <div className="flex flex-col gap-2">
            <div className="text-14-semibold text-black-90">텍스트 크기</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLabelStyleChange({ fontSize: Math.max(8, label.style.fontSize - 1) })}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(label.style.fontSize)}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) handleLabelStyleChange({ fontSize: Math.min(120, Math.max(8, v)) });
                }}
                className="no-spinner w-14 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
              />
              <button
                type="button"
                onClick={() => handleLabelStyleChange({ fontSize: Math.min(120, label.style.fontSize + 1) })}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleLabelStyleChange({ fontWeight: label.style.fontWeight === "bold" ? "normal" : "bold" })}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  label.style.fontWeight === "bold"
                    ? "border-primary bg-primary-100 text-primary"
                    : "border-black-30 text-black-70 hover:border-primary hover:text-primary"
                }`}
                aria-label="굵게"
                aria-pressed={label.style.fontWeight === "bold"}
              >
                <Bold className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 텍스트 색상 */}
          <div className="flex flex-col gap-2">
            <div className="text-14-semibold text-black-90">텍스트 색상</div>
            <div className="flex items-center gap-2">
              <ColorPickerPopover
                value={label.style.color}
                onChange={(color) => handleLabelStyleChange({ color })}
              />
              <span className="text-14-regular text-black-70 uppercase">
                {label.style.color}
              </span>
            </div>
          </div>
        </>
      )}

      {/* 모서리 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">모서리</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateElement(element.id, {
                radius: Math.max(0, radius - 1),
              })
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
          >
            -
          </button>
          <span className="flex-1 text-center text-14-regular text-black-90">
            {Math.round(radius)}
          </span>
          <button
            type="button"
            onClick={() =>
              updateElement(element.id, { radius: radius + 1 })
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
          >
            +
          </button>
        </div>
      </div>

      {/* 박스 색상 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">박스 색상</div>
        <div className="flex items-center gap-2">
          <ColorPickerPopover
            value={colorValue}
            onChange={(color) => {
              if (isImageFill) {
                updateElement(element.id, { backgroundColor: color });
              } else {
                updateElement(element.id, { fill: color });
              }
            }}
            allowTransparent
          />
          <span className="text-14-regular text-black-70 uppercase">
            {colorValue === "transparent" ? "투명" : colorValue}
          </span>
          <button
            type="button"
            onClick={() => {
              void handleOpenEyeDropper();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary"
            aria-label="색상 추출"
          >
            <Pipette className="h-4 w-4" />
          </button>
          <input
            ref={boxColorPickerRef}
            type="color"
            value={colorValue}
            onChange={(e) => {
              const c = e.target.value.toUpperCase();
              if (isImageFill) {
                updateElement(element.id, { backgroundColor: c });
              } else {
                updateElement(element.id, { fill: c });
              }
              addRecentColor(c);
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      </div>

      {/* 테두리 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">테두리</div>
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
          <div className="flex items-center gap-2">
            {borderStyleOptions.map((styleOption) => {
              const isActive = activeStyle === styleOption;
              const cls = `flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                isActive
                  ? "border-primary bg-primary-100 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
              }`;
              if (styleOption === "none") {
                return (
                  <button
                    key={styleOption}
                    type="button"
                    onClick={() => handleBorderStyleSelect(styleOption)}
                    className={cls}
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                );
              }
              return (
                <button
                  key={styleOption}
                  type="button"
                  onClick={() => handleBorderStyleSelect(styleOption)}
                  className={cls}
                >
                  <span
                    className="block w-5"
                    style={{
                      borderTopWidth: 2,
                      borderTopStyle: styleOption,
                      borderTopColor: "currentColor",
                    }}
                  />
                </button>
              );
            })}
          </div>
          {borderEnabled && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-12-regular text-black-60">굵기</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={borderWidth}
                    onChange={(e) =>
                      updateElement(element.id, {
                        border: {
                          ...border,
                          width: clampBorderWidth(Number(e.target.value)),
                          enabled: true,
                        } as typeof border,
                      })
                    }
                    className="flex-1"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(borderWidth)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/[^0-9]/g, "");
                      if (d)
                        updateElement(element.id, {
                          border: {
                            ...border,
                            width: clampBorderWidth(Number(d)),
                            enabled: true,
                          } as typeof border,
                        });
                    }}
                    className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-12-regular text-black-60">색상</span>
                <ColorPickerPopover
                  value={borderColor}
                  onChange={(color) =>
                    updateElement(element.id, {
                      border: {
                        ...border,
                        color,
                        enabled: true,
                      } as typeof border,
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 레이어 */}
      {moveLayer && (
        <LayerPanel onMoveLayer={(dir) => moveLayer(element.id, dir)} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* 감정 / 박스 탭 전환 */}
      <div className="flex shrink-0 gap-0 mb-3 border-b border-black-25">
        <button
          type="button"
          onClick={() => setActiveTab("emotion")}
          className={`flex-1 py-2 text-14-semibold transition-all border-b-2 ${
            activeTab === "emotion"
              ? "border-primary text-primary"
              : "border-transparent text-black-50 hover:text-black-90"
          }`}
        >
          감정
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("box")}
          className={`flex-1 py-2 text-14-semibold transition-all border-b-2 ${
            activeTab === "box"
              ? "border-primary text-primary"
              : "border-transparent text-black-50 hover:text-black-90"
          }`}
        >
          박스
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {activeTab === "emotion" ? <EmotionContent /> : boxContent}
      </div>
    </div>
  );
};

export default EmotionCardPropsContent;
