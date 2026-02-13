import { useState } from "react";
import { Ban, Loader2, Upload } from "lucide-react";
import { useImageUploadToCloudinary } from "../hooks/useImageUploadToCloudinary";
import { useUploadListStore } from "@/features/editor/store/useUploadListStore";
import type { CanvasElement, ShapeElement } from "@/features/editor/model/canvasTypes";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

interface ShapePropertiesProps {
  element: ShapeElement;
  onUpdateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
}

const ShapeProperties = ({
  element,
  onUpdateElement,
}: ShapePropertiesProps) => {
  const { uploadImage, isUploading } = useImageUploadToCloudinary();
  const triggerRefetch = useUploadListStore((s) => s.triggerRefetch);
  const [widthInput, setWidthInput] = useState(() =>
    String(Math.round(element.w)),
  );
  const [heightInput, setHeightInput] = useState(() =>
    String(Math.round(element.h)),
  );
  const [radiusInput, setRadiusInput] = useState(() =>
    String(Math.round(element.radius ?? 0)),
  );
  const [isWidthEditing, setIsWidthEditing] = useState(false);
  const [isHeightEditing, setIsHeightEditing] = useState(false);
  const [isRadiusEditing, setIsRadiusEditing] = useState(false);

  const rect = { width: element.w, height: element.h };
  const radius = element.radius ?? 0;
  const minRadius = element.type === "ellipse" ? 50 : 0;
  const maxRadius = element.type === "ellipse" ? 50 : 100;
  const colorValue = element.fill?.startsWith("url(")
    ? "#ffffff"
    : (element.fill ?? "#ffffff");
  const borderEnabled = element.border?.enabled ?? false;
  const borderColor = element.border?.color ?? "#000000";
  const borderWidth = element.border?.width ?? 2;
  const borderStyle = element.border?.style ?? "solid";

  const clampRadius = (value: number) =>
    Math.min(maxRadius, Math.max(minRadius, value));
  const clampBorderWidth = (value: number) => Math.min(20, Math.max(1, value));
  const clampWidth = (value: number) => Math.max(1, value);
  const clampHeight = (value: number) => Math.max(1, value);

  const displayWidth = isWidthEditing
    ? widthInput
    : String(Math.round(element.w));
  const displayHeight = isHeightEditing
    ? heightInput
    : String(Math.round(element.h));
  const displayRadius = isRadiusEditing
    ? radiusInput
    : String(Math.round(radius));

  const commitWidthInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setWidthInput(String(Math.round(element.w)));
      return;
    }
    const nextWidth = clampWidth(Number(digits));
    onUpdateElement(element.id, { w: nextWidth });
    setWidthInput(String(Math.round(nextWidth)));
  };

  const commitHeightInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setHeightInput(String(Math.round(element.h)));
      return;
    }
    const nextHeight = clampHeight(Number(digits));
    onUpdateElement(element.id, { h: nextHeight });
    setHeightInput(String(Math.round(nextHeight)));
  };

  const commitRadiusInput = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setRadiusInput(String(Math.round(radius)));
      return;
    }
    const nextRadius = clampRadius(Number(digits));
    onUpdateElement(element.id, { radius: nextRadius });
    setRadiusInput(String(Math.round(nextRadius)));
  };

  const handleRadiusStep = (delta: number) => {
    const nextRadius = clampRadius(radius + delta);
    onUpdateElement(element.id, { radius: nextRadius });
    if (isRadiusEditing) {
      setRadiusInput(String(Math.round(nextRadius)));
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      const finalUrl =
        imageUrl.startsWith("url(") || imageUrl.startsWith("data:")
          ? imageUrl
          : `url(${imageUrl})`;
      onUpdateElement(element.id, {
        fill: finalUrl,
        imageBox: { x: 0, y: 0, w: rect.width, h: rect.height },
      });
      triggerRefetch();
    }
  };

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
      onUpdateElement(element.id, {
        border: { ...element.border, enabled: false } as ShapeElement["border"],
      });
      return;
    }
    onUpdateElement(element.id, {
      border: {
        enabled: true,
        color: borderColor,
        width: borderWidth,
        style: style,
      },
    });
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto">
      {/* 선택된 도형의 기하(크기/모서리) 속성 편집 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">크기</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-12-regular text-black-60">가로</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={displayWidth}
              onChange={(event) => {
                const digits = event.target.value.replace(/[^0-9]/g, "");
                setWidthInput(digits);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitWidthInput(widthInput);
                  setIsWidthEditing(false);
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => {
                if (!isWidthEditing) return;
                setIsWidthEditing(false);
                commitWidthInput(widthInput);
              }}
              onFocus={(event) => {
                setWidthInput(String(Math.round(element.w)));
                setIsWidthEditing(true);
                event.target.select();
              }}
              className="no-spinner w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-12-regular text-black-60">세로</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={displayHeight}
              onChange={(event) => {
                const digits = event.target.value.replace(/[^0-9]/g, "");
                setHeightInput(digits);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitHeightInput(heightInput);
                  setIsHeightEditing(false);
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => {
                if (!isHeightEditing) return;
                setIsHeightEditing(false);
                commitHeightInput(heightInput);
              }}
              onFocus={(event) => {
                setHeightInput(String(Math.round(element.h)));
                setIsHeightEditing(true);
                event.target.select();
              }}
              className="no-spinner w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90"
            />
          </div>
        </div>
      </div>

      {element.type === "rect" && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">모서리</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleRadiusStep(-1);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
            >
              -
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={displayRadius}
              onChange={(event) => {
                const digits = event.target.value.replace(/[^0-9]/g, "");
                setRadiusInput(digits);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitRadiusInput(radiusInput);
                  setIsRadiusEditing(false);
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => {
                if (!isRadiusEditing) return;
                setIsRadiusEditing(false);
                commitRadiusInput(radiusInput);
              }}
              onFocus={(event) => {
                setRadiusInput(String(Math.round(radius)));
                setIsRadiusEditing(true);
                event.target.select();
              }}
              className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
            />
            <button
              type="button"
              onClick={() => {
                handleRadiusStep(1);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* 시각 스타일(채우기/이미지/테두리) 편집 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">박스 색상</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorValue}
            onChange={(event) => {
              onUpdateElement(element.id, { fill: event.target.value });
            }}
            className="color-input h-10 w-10 cursor-pointer rounded-lg border border-black-30 bg-white-100 p-0 overflow-hidden"
            style={{ WebkitAppearance: "none", appearance: "none" }}
          />
          <span className="text-14-regular text-black-70 uppercase">
            {colorValue}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">이미지</div>
        <label
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary transition-colors cursor-pointer aria-disabled:opacity-60 aria-disabled:cursor-not-allowed"
          aria-disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="text-14-regular">이미지 업로드</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">테두리</div>
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
          <div className="flex items-center gap-2">
            {borderStyleOptions.map((styleOption) => {
              const isActive = activeStyle === styleOption;
              const buttonClass = `flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-black-30 text-black-70 hover:border-black-50"
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
                  >
                    <Ban className="h-4 w-4" />
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
                    onChange={(event) => {
                      onUpdateElement(element.id, {
                        border: {
                          ...element.border,
                          width: clampBorderWidth(Number(event.target.value)),
                          enabled: true,
                        } as ShapeElement["border"],
                      });
                    }}
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
                      onUpdateElement(element.id, {
                        border: {
                          ...element.border,
                          width: clampBorderWidth(Number(digits)),
                          enabled: true,
                        } as ShapeElement["border"],
                      });
                    }}
                    className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-12-regular text-black-60">색상</span>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(event) => {
                    onUpdateElement(element.id, {
                      border: {
                        ...element.border,
                        color: event.target.value,
                        enabled: true,
                      } as ShapeElement["border"],
                    });
                  }}
                  className="color-input h-8 w-8 cursor-pointer rounded border border-black-30 bg-white-100 p-0"
                  style={{ WebkitAppearance: "none", appearance: "none" }}
                />
                <span className="text-14-regular text-black-70 uppercase">
                  {borderColor}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShapeProperties;
