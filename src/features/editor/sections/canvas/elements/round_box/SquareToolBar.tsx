/**
 * 사각/라운드 박스 요소의 채우기/테두리/레이어 액션을 제공하는 툴바 컴포넌트.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Ban, Loader2, Pipette, Upload } from "lucide-react";
import { useNumberInput } from "../../../../shared/hooks/useNumberInput";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import { useImageUploadToCloudinary } from "@/features/editor/sections/sidebar/hooks/useImageUploadToCloudinary";
import { useUploadListStore } from "../../../../store/useUploadListStore";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

interface SquareToolBarProps {
  isVisible: boolean;
  showRadius?: boolean;
  borderRadius: number;
  minBorderRadius?: number;
  maxBorderRadius?: number;
  color: string;
  borderEnabled?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: BorderStyle;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  onBorderRadiusChange: (value: number) => void;
  onBorderRadiusStep: (delta: number) => void;
  onColorChange: (value: string) => void;
  onImageUpload: (imageUrl: string) => void;
  onBorderEnabledChange?: (value: boolean) => void;
  onBorderStyleChange?: (value: BorderStyle) => void;
  onBorderColorChange?: (value: string) => void;
  onBorderWidthChange?: (value: number) => void;
  onSizeChange?: (width: number, height: number) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

type EyeDropperResult = { sRGBHex: string };
type EyeDropperInstance = { open: () => Promise<EyeDropperResult> };
type EyeDropperConstructor = new () => EyeDropperInstance;

const SquareToolBar = ({
  isVisible,
  showRadius = true,
  borderRadius,
  minBorderRadius = 0,
  maxBorderRadius = 100,
  color,
  borderEnabled = false,
  borderColor = "#000000",
  borderWidth = 2,
  borderStyle = "solid",
  width,
  height,
  onBorderRadiusChange,
  onBorderRadiusStep,
  onColorChange,
  onImageUpload,
  onBorderEnabledChange,
  onBorderStyleChange,
  onBorderColorChange,
  onBorderWidthChange,
  onSizeChange,
  onPointerDown,
}: SquareToolBarProps) => {
  const [isBorderPanelOpen, setIsBorderPanelOpen] = useState(false);
  const [boxColorPopoverCloseSignal, setBoxColorPopoverCloseSignal] = useState(0);
  const boxColorPickerRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useImageUploadToCloudinary();
  const triggerRefetch = useUploadListStore((s) => s.triggerRefetch);

  // 도형 크기 입력은 공통 숫자 입력 훅으로 관리해
  // 포커스 해제/엔터 커밋 동작을 가로/세로에서 동일하게 유지한다.
  const widthInputHook = useNumberInput({
    value: width ?? 0,
    min: 1,
    onChange: (nextWidth) => {
      if (height !== undefined && onSizeChange) {
        onSizeChange(nextWidth, height);
      }
    },
  });

  const heightInputHook = useNumberInput({
    value: height ?? 0,
    min: 1,
    onChange: (nextHeight) => {
      if (width !== undefined && onSizeChange) {
        onSizeChange(width, nextHeight);
      }
    },
  });

  const radiusInputHook = useNumberInput({
    value: borderRadius,
    min: minBorderRadius,
    max: maxBorderRadius,
    onChange: onBorderRadiusChange,
  });

  const clampBorderWidth = (value: number) => Math.min(20, Math.max(1, value));

  const handleBorderRadiusStep = (delta: number) => {
    onBorderRadiusStep(delta);
    if (radiusInputHook.isEditing) {
      radiusInputHook.step(delta);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // 동일 파일 재업로드를 허용하기 위해 change 이벤트 직후 값을 비운다.
    event.target.value = "";

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      const fill =
        imageUrl.startsWith("url(") || imageUrl.startsWith("data:")
          ? imageUrl
          : `url(${imageUrl})`;
      onImageUpload(fill);
      triggerRefetch();
    }
  };

  const handleOpenBoxColorPicker = async () => {
    const EyeDropperApi = (
      window as Window & { EyeDropper?: EyeDropperConstructor }
    ).EyeDropper;
    if (EyeDropperApi) {
      try {
        // 지원 브라우저에서는 스포이드 버튼에서 바로 화면 컬러 샘플링으로 진입한다.
        const eyeDropper = new EyeDropperApi();
        const result = await eyeDropper.open();
        onColorChange(result.sRGBHex.toUpperCase());
        return;
      } catch {
        // 사용자가 취소한 경우에도 예외가 발생하므로 조용히 폴백한다.
      }
    }

    const input = boxColorPickerRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };
    // 브라우저 지원 시 네이티브 컬러 피커를 즉시 열고, 미지원 브라우저는 click으로 폴백한다.
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.click();
  };

  if (!isVisible) return null;

  const borderStyleOptions: Array<BorderStyle | "none"> = [
    "none",
    "solid",
    "dashed",
    "double",
    "dotted",
  ];
  const activeStyle = borderEnabled ? borderStyle : "none";
  const handleBorderStyleSelect = (style: BorderStyle | "none") => {
    if (style === "none") {
      onBorderEnabledChange?.(false);
      return;
    }
    if (!borderEnabled) {
      // 스타일을 먼저 고르면 테두리도 함께 켜서 사용자가 별도 토글을 누르지 않게 한다.
      onBorderEnabledChange?.(true);
    }
    onBorderStyleChange?.(style);
  };

  return (
    <div className="flex items-center gap-3" onPointerDown={onPointerDown}>
      {width !== undefined && height !== undefined && onSizeChange && (
        <>
          <div className="flex items-center text-14-regular text-black-60">
            가로
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={widthInputHook.displayValue}
            onChange={(event) => {
              widthInputHook.handleChange(event.target.value);
            }}
            onBlur={widthInputHook.handleBlur}
            onFocus={widthInputHook.handleFocus}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                widthInputHook.commit();
                event.currentTarget.blur();
              }
            }}
            className="no-spinner w-16 rounded border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
            style={{
              textAlign: "center",
              WebkitAppearance: "none",
              MozAppearance: "textfield",
              appearance: "textfield",
            }}
          />
          <div className="flex items-center text-14-regular text-black-60">
            세로
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={heightInputHook.displayValue}
            onChange={(event) => {
              heightInputHook.handleChange(event.target.value);
            }}
            onBlur={heightInputHook.handleBlur}
            onFocus={heightInputHook.handleFocus}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                heightInputHook.commit();
                event.currentTarget.blur();
              }
            }}
            className="no-spinner w-16 rounded border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
            style={{
              textAlign: "center",
              WebkitAppearance: "none",
              MozAppearance: "textfield",
              appearance: "textfield",
            }}
          />
        </>
      )}
      {showRadius && (
        <>
          <div className="flex items-center text-14-regular text-black-60">
            모서리
          </div>
          <div className="flex items-center gap-1 rounded border border-black-30 px-1">
            <button
              type="button"
              onClick={() => {
                handleBorderRadiusStep(-1);
              }}
              className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
              aria-label="Decrease border radius"
            >
              -
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={radiusInputHook.displayValue}
              onChange={(event) => {
                radiusInputHook.handleChange(event.target.value);
              }}
              onBlur={radiusInputHook.handleBlur}
              onFocus={radiusInputHook.handleFocus}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  radiusInputHook.commit();
                  event.currentTarget.blur();
                }
              }}
              className="no-spinner w-12 appearance-none border-x border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
              style={{
                textAlign: "center",
                WebkitAppearance: "none",
                MozAppearance: "textfield",
                appearance: "textfield",
              }}
            />
            <button
              type="button"
              onClick={() => {
                handleBorderRadiusStep(1);
              }}
              className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
              aria-label="Increase border radius"
            >
              +
            </button>
          </div>
        </>
      )}
      <div
        className="flex items-center gap-2"
        onClick={() => {
          // 박스 색상 조작 시 테두리 패널은 닫아 툴바 레이어가 겹치지 않게 유지한다.
          setIsBorderPanelOpen(false);
        }}
      >
        <span className="text-14-regular text-black-60">박스 색상</span>
        <ColorPickerPopover
          value={color}
          onChange={onColorChange}
          closeSignal={boxColorPopoverCloseSignal}
        />
        <div className="group relative">
          <button
            type="button"
            onPointerDown={() => {
              // 스포이드 진입 시 기존에 열린 툴바 패널을 먼저 닫는다.
              setIsBorderPanelOpen(false);
              setBoxColorPopoverCloseSignal((prev) => prev + 1);
            }}
            onClick={() => {
              void handleOpenBoxColorPicker();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-black-30 text-black-70"
            aria-label="박스 색상 스포이드"
          >
            <Pipette className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black-90 px-2 py-1 text-12-regular text-white-100 opacity-0 transition-opacity group-hover:opacity-100">
            색상 추출
          </span>
        </div>
        <input
          ref={boxColorPickerRef}
          type="color"
          value={color}
          onChange={(event) => {
            onColorChange(event.target.value.toUpperCase());
          }}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsBorderPanelOpen((prev) => !prev);
          }}
          className={`flex h-7 items-center justify-center rounded border px-2 text-14-regular ${
            borderEnabled || isBorderPanelOpen
              ? "border-primary text-primary bg-primary-100 ring-1 ring-primary-300 shadow-sm"
              : "border-black-30 text-black-70"
          }`}
          aria-label="Border settings"
        >
          테두리
        </button>
        {isBorderPanelOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-black-25 bg-white-100 p-3 shadow-lg z-50"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="flex items-center gap-2">
              {borderStyleOptions.map((styleOption) => {
                const isActive = activeStyle === styleOption;
                const buttonClass = `flex h-12 w-12 items-center justify-center rounded-lg border ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-black-30 text-black-70"
                }`;
                if (styleOption === "none") {
                  return (
                    <button
                      key={styleOption}
                      type="button"
                      onClick={() => {
                        handleBorderStyleSelect(styleOption);
                      }}
                      className={buttonClass}
                      aria-label="No border"
                    >
                      <Ban className="h-5 w-5" />
                    </button>
                  );
                }
                return (
                  <button
                    key={styleOption}
                    type="button"
                    onClick={() => {
                      handleBorderStyleSelect(styleOption);
                    }}
                    className={buttonClass}
                    aria-label={`${styleOption} border`}
                  >
                    <span
                      className="block w-6"
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
            <div className="mt-4 text-14-regular text-black-70">
              스트로크 굵기
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={borderWidth}
                disabled={!borderEnabled}
                onChange={(event) =>
                  onBorderWidthChange?.(
                    clampBorderWidth(Number(event.target.value)),
                  )
                }
                className="flex-1"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(borderWidth)}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^0-9]/g, "");
                  if (!digits) return;
                  onBorderWidthChange?.(clampBorderWidth(Number(digits)));
                }}
                disabled={!borderEnabled}
                className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90 disabled:bg-black-10"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-14-regular text-black-60">색상</span>
              <ColorPickerPopover
                value={borderColor}
                onChange={(value) => onBorderColorChange?.(value)}
              />
            </div>
          </div>
        )}
      </div>
      <label
        className="flex h-7 items-center gap-1.5 rounded border border-black-30 px-2 text-black-70 hover:border-primary hover:text-primary transition-colors cursor-pointer aria-disabled:opacity-60 aria-disabled:cursor-not-allowed"
        aria-disabled={isUploading}
        aria-label="Upload image"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span className="text-14-regular">사진/이미지</span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleImageUpload}
          disabled={isUploading}
          className="hidden"
        />
      </label>
    </div>
  );
};

export default SquareToolBar;
