/**
 * 도형 선택 시 사이드바에 표시되는 속성 편집 패널.
 * 크기, 모서리, 색상, 이미지, 테두리, 레이어 컨트롤을 제공한다.
 */
import { useRef, useState } from "react";
import { Ban, Italic, Loader2, Pipette, Underline, Upload } from "lucide-react";
import { useElementPanelStore, type ShapePanelData } from "@/features/editor/store/elementPanelStore";
import { useImageUploadToCloudinary } from "../hooks/useImageUploadToCloudinary";
import { useUploadListStore } from "@/features/editor/store/useUploadListStore";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import { useRecentColorStore } from "@/features/editor/store/recentColorStore";
import InlineFontPicker from "@/features/editor/shared/InlineFontPicker";
import LayerPanel from "./LayerPanel";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type EyeDropperResult = { sRGBHex: string };
type EyeDropperInstance = { open: () => Promise<EyeDropperResult> };
type EyeDropperConstructor = new () => EyeDropperInstance;

const ShapePropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);

  const { uploadImage, isUploading } = useImageUploadToCloudinary();
  const triggerRefetch = useUploadListStore((s) => s.triggerRefetch);
  const boxColorPickerRef = useRef<HTMLInputElement>(null);
  const addRecentColor = useRecentColorStore((s) => s.addRecentColor);
  const changeAllMatchingColors = useElementPanelStore((s) => s.changeAllMatchingColors);
  const hasMatchingColors = useElementPanelStore((s) => s.hasMatchingColors);

  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [radiusInput, setRadiusInput] = useState("");
  const [isWidthEditing, setIsWidthEditing] = useState(false);
  const [isHeightEditing, setIsHeightEditing] = useState(false);
  const [isRadiusEditing, setIsRadiusEditing] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState("");
  const [isFontSizeEditing, setIsFontSizeEditing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isTextInputEditing, setIsTextInputEditing] = useState(false);

  if (!panelData || panelData.type !== "shape" || !updateElement) return null;

  const data = panelData as ShapePanelData;
  const { element, rect, radius, minRadius, maxRadius, colorValue, borderEnabled, borderColor, borderWidth, borderStyle } = data;
  const isImageFill = element.fill.startsWith("url(") || element.fill.startsWith("data:");
  const isMosaic = element.type === "mosaic" || element.type === "circleMosaic";

  const clampRadius = (value: number) => Math.min(maxRadius, Math.max(minRadius, value));
  const clampBorderWidth = (value: number) => Math.min(20, Math.max(1, value));

  const displayWidth = isWidthEditing ? widthInput : String(Math.round(rect.width));
  const displayHeight = isHeightEditing ? heightInput : String(Math.round(rect.height));

  const commitWidth = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) return;
    updateElement(element.id, { w: Math.max(1, Number(digits)) });
  };

  const commitHeight = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) return;
    updateElement(element.id, { h: Math.max(1, Number(digits)) });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      const fill = imageUrl.startsWith("url(") || imageUrl.startsWith("data:") ? imageUrl : `url(${imageUrl})`;
      updateElement(element.id, { fill, imageBox: { x: 0, y: 0, w: rect.width, h: rect.height } });
      triggerRefetch();
    }
  };

  const handleOpenEyeDropper = async () => {
    const EyeDropperApi = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (EyeDropperApi) {
      try {
        const eyeDropper = new EyeDropperApi();
        const result = await eyeDropper.open();
        const picked = result.sRGBHex.toUpperCase();
        updateElement(element.id, { fill: picked });
        addRecentColor(picked);
        return;
      } catch { /* 사용자 취소 */ }
    }
    const input = boxColorPickerRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker();
      return;
    }
    pickerInput.click();
  };

  const borderStyleOptions: Array<BorderStyle | "none"> = ["none", "solid", "dashed", "double", "dotted"];
  const activeStyle = borderEnabled ? borderStyle : "none";

  const handleBorderStyleSelect = (style: BorderStyle | "none") => {
    if (style === "none") {
      updateElement(element.id, { border: { ...element.border, enabled: false } as typeof element.border });
      return;
    }
    updateElement(element.id, { border: { enabled: true, color: borderColor, width: borderWidth, style } });
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto">
      {/* 크기 */}
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
              onChange={(e) => setWidthInput(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={(e) => { setWidthInput(String(Math.round(rect.width))); setIsWidthEditing(true); e.target.select(); }}
              onBlur={() => { if (isWidthEditing) { setIsWidthEditing(false); commitWidth(widthInput); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitWidth(widthInput); setIsWidthEditing(false); e.currentTarget.blur(); } }}
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
              onChange={(e) => setHeightInput(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={(e) => { setHeightInput(String(Math.round(rect.height))); setIsHeightEditing(true); e.target.select(); }}
              onBlur={() => { if (isHeightEditing) { setIsHeightEditing(false); commitHeight(heightInput); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitHeight(heightInput); setIsHeightEditing(false); e.currentTarget.blur(); } }}
              className="no-spinner w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90"
            />
          </div>
        </div>
      </div>

      {/* 모자이크 강도 */}
      {(element.type === "mosaic" || element.type === "circleMosaic") && !data.isMultiShape && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">모자이크 강도</div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={20}
              value={element.mosaicLevel ?? 8}
              onChange={(e) => updateElement(element.id, { mosaicLevel: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-8 text-center text-14-regular text-black-70">
              {element.mosaicLevel ?? 8}
            </span>
          </div>
        </div>
      )}

      {/* 모서리 (ellipse 제외) */}
      {element.type !== "ellipse" && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">모서리</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => updateElement(element.id, { radius: clampRadius(radius - 1) })} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">-</button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={isRadiusEditing ? radiusInput : String(Math.round(radius))}
              onChange={(e) => setRadiusInput(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={(e) => { setRadiusInput(String(Math.round(radius))); setIsRadiusEditing(true); e.target.select(); }}
              onBlur={() => { if (isRadiusEditing) { setIsRadiusEditing(false); const d = radiusInput.trim(); if (d) updateElement(element.id, { radius: clampRadius(Number(d)) }); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const d = radiusInput.trim(); if (d) updateElement(element.id, { radius: clampRadius(Number(d)) }); setIsRadiusEditing(false); e.currentTarget.blur(); } }}
              className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
            />
            <button type="button" onClick={() => updateElement(element.id, { radius: clampRadius(radius + 1) })} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">+</button>
          </div>
        </div>
      )}

      {/* 박스 색상 — 모자이크에서는 숨김 */}
      {!isMosaic && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">박스 색상</div>
          <div className="flex items-center gap-2">
            <ColorPickerPopover value={colorValue} onChange={(color) => updateElement(element.id, { fill: color })} onChangeAll={changeAllMatchingColors ?? undefined} hasMatchingColors={hasMatchingColors ?? undefined} allowTransparent />
            <span className="text-14-regular text-black-70 uppercase">{colorValue === "transparent" ? "투명" : colorValue}</span>
            <button type="button" onClick={() => { void handleOpenEyeDropper(); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary" aria-label="색상 추출">
              <Pipette className="h-4 w-4" />
            </button>
            <input ref={boxColorPickerRef} type="color" value={colorValue} onChange={(e) => { const c = e.target.value.toUpperCase(); updateElement(element.id, { fill: c }); addRecentColor(c); }} className="sr-only" tabIndex={-1} aria-hidden />
          </div>
        </div>
      )}

      {/* 이미지 — 모자이크, 이미지 채워진 도형, 다중 선택에서는 숨김 */}
      {!isMosaic && !isImageFill && !data.isMultiShape && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">이미지</div>
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary transition-colors cursor-pointer aria-disabled:opacity-60 aria-disabled:cursor-not-allowed" aria-disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="text-14-regular">이미지 업로드</span>
            <input type="file" accept="image/jpeg,image/png" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
          </label>
        </div>
      )}

      {/* 테두리 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">테두리</div>
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
          <div className="flex items-center gap-2">
            {borderStyleOptions.map((styleOption) => {
              const isActive = activeStyle === styleOption;
              const cls = `flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${isActive ? "border-primary bg-primary-100 text-primary" : "border-black-30 text-black-70 hover:border-black-50"}`;
              if (styleOption === "none") {
                return <button key={styleOption} type="button" onClick={() => handleBorderStyleSelect(styleOption)} className={cls}><Ban className="h-4 w-4" /></button>;
              }
              return (
                <button key={styleOption} type="button" onClick={() => handleBorderStyleSelect(styleOption)} className={cls}>
                  <span className="block w-5" style={{ borderTopWidth: 2, borderTopStyle: styleOption, borderTopColor: "currentColor" }} />
                </button>
              );
            })}
          </div>
          {borderEnabled && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-12-regular text-black-60">굵기</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={20} value={borderWidth} onChange={(e) => updateElement(element.id, { border: { ...element.border, width: clampBorderWidth(Number(e.target.value)), enabled: true } as typeof element.border })} className="flex-1" />
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={String(borderWidth)} onChange={(e) => { const d = e.target.value.replace(/[^0-9]/g, ""); if (d) updateElement(element.id, { border: { ...element.border, width: clampBorderWidth(Number(d)), enabled: true } as typeof element.border }); }} className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-12-regular text-black-60">색상</span>
                <ColorPickerPopover value={borderColor} onChange={(color) => updateElement(element.id, { border: { ...element.border, color, enabled: true } as typeof element.border })} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 텍스트 — 모자이크, 이미지 채워진 도형, 다중 선택에서는 숨김 */}
      {!isMosaic && !isImageFill && !data.isMultiShape && (
        <ShapeTextSection
          element={element}
          updateElement={updateElement}
          textInput={textInput}
          setTextInput={setTextInput}
          isTextInputEditing={isTextInputEditing}
          setIsTextInputEditing={setIsTextInputEditing}
          fontSizeInput={fontSizeInput}
          setFontSizeInput={setFontSizeInput}
          isFontSizeEditing={isFontSizeEditing}
          setIsFontSizeEditing={setIsFontSizeEditing}
          changeAllMatchingColors={changeAllMatchingColors}
          hasMatchingColors={hasMatchingColors}
        />
      )}

      {/* 레이어 — 다중 선택 시 숨김 */}
      {moveLayer && !data.isMultiShape && <LayerPanel onMoveLayer={(dir) => moveLayer(element.id, dir)} />}
    </div>
  );
};

// 도형 텍스트 편집 섹션: 내용 입력, 글꼴, 크기, 색상, 스타일 컨트롤
const ShapeTextSection = ({
  element,
  updateElement,
  textInput,
  setTextInput,
  isTextInputEditing,
  setIsTextInputEditing,
  fontSizeInput,
  setFontSizeInput,
  isFontSizeEditing,
  setIsFontSizeEditing,
  changeAllMatchingColors,
  hasMatchingColors,
}: {
  element: import("@/features/editor/model/canvasTypes").ShapeElement;
  updateElement: (id: string, patch: Record<string, unknown>) => void;
  textInput: string;
  setTextInput: (v: string) => void;
  isTextInputEditing: boolean;
  setIsTextInputEditing: (v: boolean) => void;
  fontSizeInput: string;
  setFontSizeInput: (v: string) => void;
  isFontSizeEditing: boolean;
  setIsFontSizeEditing: (v: boolean) => void;
  changeAllMatchingColors: ((oldColor: string, newColor: string) => void) | null;
  hasMatchingColors: ((color: string) => boolean) | null;
}) => {
  const addRecentColor = useRecentColorStore((s) => s.addRecentColor);

  const currentFontSize = element.textStyle?.fontSize ?? 16;
  const currentFontFamily = element.textStyle?.fontFamily ?? "Pretendard";
  const currentColor = element.textStyle?.color ?? "#000000";
  const currentFontWeight = element.textStyle?.fontWeight ?? "normal";
  const isBold = currentFontWeight === "bold";
  const isItalic = element.textStyle?.italic ?? false;
  const isUnderline = element.textStyle?.underline ?? false;

  const MIN_FONT_SIZE = 8;
  const MAX_FONT_SIZE = 120;
  const clampFontSize = (v: number) => Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, v));

  const commitText = (value: string) => {
    updateElement(element.id, { text: value });
  };

  const commitFontSize = () => {
    const parsed = Number(fontSizeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFontSizeInput(String(currentFontSize));
      return;
    }
    const clamped = clampFontSize(Math.round(parsed));
    updateElement(element.id, { textStyle: { fontSize: clamped } });
    setFontSizeInput(String(clamped));
  };

  const handleFontSizeStep = (delta: number) => {
    const next = clampFontSize(currentFontSize + delta);
    updateElement(element.id, { textStyle: { fontSize: next } });
  };

  const handleOpenEyeDropper = async () => {
    const EyeDropperApi = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!EyeDropperApi) return;
    try {
      const eyeDropper = new EyeDropperApi();
      const result = await eyeDropper.open();
      const picked = result.sRGBHex.toUpperCase();
      updateElement(element.id, { textStyle: { color: picked } });
      addRecentColor(picked);
    } catch { /* 사용자 취소 */ }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-14-semibold text-black-90">텍스트</div>
      <div className="flex flex-col gap-3 p-3 rounded-lg border border-black-25 bg-black-5">
        {/* 텍스트 내용 */}
        <div className="flex flex-col gap-1">
          <label className="text-12-regular text-black-60">내용</label>
          <input
            type="text"
            value={isTextInputEditing ? textInput : (element.text ?? "")}
            onChange={(e) => setTextInput(e.target.value)}
            onFocus={(e) => { setTextInput(element.text ?? ""); setIsTextInputEditing(true); e.target.select(); }}
            onBlur={() => { if (isTextInputEditing) { setIsTextInputEditing(false); commitText(textInput); } }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitText(textInput); setIsTextInputEditing(false); e.currentTarget.blur(); } }}
            placeholder="텍스트를 입력하세요"
            className="w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90 placeholder:text-black-30"
          />
        </div>

        {/* 글꼴 */}
        <InlineFontPicker fontFamily={currentFontFamily} />

        {/* 텍스트 크기 */}
        <div className="flex flex-col gap-1">
          <label className="text-12-regular text-black-60">크기</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleFontSizeStep(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">-</button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={isFontSizeEditing ? fontSizeInput : String(currentFontSize)}
              onChange={(e) => setFontSizeInput(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={(e) => { setFontSizeInput(String(currentFontSize)); setIsFontSizeEditing(true); e.target.select(); }}
              onBlur={() => { if (isFontSizeEditing) { setIsFontSizeEditing(false); commitFontSize(); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitFontSize(); setIsFontSizeEditing(false); e.currentTarget.blur(); } }}
              className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
            />
            <button type="button" onClick={() => handleFontSizeStep(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">+</button>
          </div>
        </div>

        {/* 텍스트 색상 */}
        <div className="flex items-center gap-2">
          <span className="text-12-regular text-black-60">색상</span>
          <ColorPickerPopover value={currentColor} onChange={(c) => updateElement(element.id, { textStyle: { color: c } })} onChangeAll={changeAllMatchingColors ?? undefined} hasMatchingColors={hasMatchingColors ?? undefined} />
          <span className="text-14-regular text-black-70 uppercase">{currentColor}</span>
          <button
            type="button"
            onClick={() => { void handleOpenEyeDropper(); }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary"
            aria-label="색상 추출"
          >
            <Pipette className="h-4 w-4" />
          </button>
        </div>

        {/* 스타일 토글 */}
        <div className="flex gap-1">
          <StyleToggle label="B" title="굵게" active={isBold} onClick={() => updateElement(element.id, { textStyle: { fontWeight: isBold ? "normal" : "bold" } })} />
          <StyleToggle label={<Italic className="h-4 w-4" />} title="기울임꼴" active={isItalic} onClick={() => updateElement(element.id, { textStyle: { italic: !isItalic } })} />
          <StyleToggle label={<Underline className="h-4 w-4" />} title="밑줄" active={isUnderline} onClick={() => updateElement(element.id, { textStyle: { underline: !isUnderline } })} />
        </div>
      </div>
    </div>
  );
};

const StyleToggle = ({ label, title, active, onClick }: { label: React.ReactNode; title: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-14-semibold ${active ? "border-blue-500 bg-blue-50 text-primary" : "border-black-30 text-black-70 hover:bg-black-5"}`} title={title}>
    {label}
  </button>
);

export default ShapePropsContent;
