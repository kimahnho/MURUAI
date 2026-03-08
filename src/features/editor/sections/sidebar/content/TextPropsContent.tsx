/**
 * 텍스트 요소 선택 시 사이드바에 표시되는 속성 편집 패널.
 * 편집 모드에서는 textEditingCallbacks를 통한 인라인 스타일링,
 * 비편집 모드에서는 요소 레벨 스타일 변경을 제공한다.
 */
import { useEffect, useState } from "react";
import {
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignJustify,
  AlignStartHorizontal,
  Italic,
  Pipette,
  Strikethrough,
  TextAlignCenter,
  TextAlignStart,
  TextAlignEnd,
  Underline,
} from "lucide-react";
import { useElementPanelStore, type TextPanelData } from "@/features/editor/store/elementPanelStore";
import { DEFAULT_LINE_HEIGHT } from "@/features/editor/sections/canvas/elements/text/textContentUtils";
import { useSideBarStore } from "@/features/editor/store/sideBarStore";
import { detectMixedFontFamilyInRichText } from "@/features/editor/sections/canvas/elements/text/textContentUtils";
import { useRecentColorStore } from "@/features/editor/store/recentColorStore";
import ColorPickerPopover from "@/features/editor/shared/ColorPickerPopover";
import InlineFontPicker from "@/features/editor/shared/InlineFontPicker";
import LayerPanel from "./LayerPanel";


type EyeDropperResult = { sRGBHex: string };
type EyeDropperInstance = { open: () => Promise<EyeDropperResult> };
type EyeDropperConstructor = new () => EyeDropperInstance;

const TextPropsContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const updateElement = useElementPanelStore((s) => s.updateElement);
  const moveLayer = useElementPanelStore((s) => s.moveLayer);
  const textCallbacks = useElementPanelStore((s) => s.textEditingCallbacks);
  const setSideBarMenu = useSideBarStore((s) => s.setSelectedMenu);

  useEffect(() => {
    if (!panelData || panelData.type !== "text") {
      setSideBarMenu("template");
    }
  }, [panelData, setSideBarMenu]);

  if (!panelData || panelData.type !== "text" || !updateElement) return null;

  const data = panelData as TextPanelData;
  const { element } = data;

  // 편집 모드 시 textEditingCallbacks 사용, 비편집 모드 시 요소 레벨 스타일 사용
  const cb = textCallbacks;

  return (
    <div className="flex flex-col w-full h-full gap-4 overflow-y-auto" data-text-props-panel>
      {/* 글꼴/크기/자간/행간/색상/스타일/정렬 — 편집 여부에 따라 다른 콜백 사용 */}
      {cb ? (
        <EditingTextPanel callbacks={cb} />
      ) : (
        <StaticTextPanel element={element} updateElement={updateElement} />
      )}

      {/* 레이어 */}
      {moveLayer && <LayerPanel onMoveLayer={(dir) => moveLayer(element.id, dir)} />}
    </div>
  );
};

// 편집 모드 패널: textEditingCallbacks를 사용한 인라인 스타일링
const EditingTextPanel = ({ callbacks: cb }: { callbacks: NonNullable<ReturnType<typeof useElementPanelStore.getState>["textEditingCallbacks"]> }) => {
  const changeAllMatchingColors = useElementPanelStore((s) => s.changeAllMatchingColors);
  const hasMatchingColors = useElementPanelStore((s) => s.hasMatchingColors);
  const formatNumber = (value: number) => String(Math.round(value * 100) / 100);
  const clampLineHeight = (value: number) => Math.min(5, Math.max(0.5, value));
  const clampLetterSpacing = (value: number) => Math.min(20, Math.max(-10, value));

  const [lineHeightInput, setLineHeightInput] = useState(() => formatNumber(cb.lineHeight));
  const [isLineHeightEditing, setIsLineHeightEditing] = useState(false);
  const [letterSpacingInput, setLetterSpacingInput] = useState(() => formatNumber(cb.letterSpacing));
  const [isLetterSpacingEditing, setIsLetterSpacingEditing] = useState(false);

  const commitLineHeight = () => {
    const trimmed = lineHeightInput.trim();
    if (!trimmed || !Number.isFinite(Number(trimmed)) || Number(trimmed) <= 0) {
      setLineHeightInput(formatNumber(cb.lineHeight));
      return;
    }
    const clamped = clampLineHeight(Number(trimmed));
    cb.onLineHeightChange(clamped);
    setLineHeightInput(formatNumber(clamped));
  };

  const commitLetterSpacing = () => {
    const trimmed = letterSpacingInput.trim();
    if (!trimmed || !Number.isFinite(Number(trimmed))) {
      setLetterSpacingInput(formatNumber(cb.letterSpacing));
      return;
    }
    const clamped = clampLetterSpacing(Number(trimmed));
    cb.onLetterSpacingChange(clamped);
    setLetterSpacingInput(formatNumber(clamped));
  };

  return (
    <>
      {/* 글꼴 */}
      <InlineFontPicker fontFamily={cb.fontFamily} preventFocus isMixed={cb.isFontFamilyMixed} />

      {/* 텍스트 크기 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 크기</div>
        <div className="flex items-center gap-2">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cb.onFontSizeStep(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">-</button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={cb.fontSizeInputValue}
            onChange={(e) => cb.onFontSizeInputChange(e.target.value)}
            onFocus={(e) => { cb.onFontSizeInputFocus(); cb.onToolbarInputFocus(); e.target.select(); }}
            onBlur={() => { cb.onFontSizeInputCommit(); cb.onFontSizeInputBlur(); cb.onToolbarInputBlur(); }}
            onPointerDown={(e) => { e.stopPropagation(); requestAnimationFrame(() => e.currentTarget.focus()); }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); cb.onFontSizeInputCommit(); e.currentTarget.blur(); }
              if (e.key === "Escape") { e.preventDefault(); cb.onFontSizeInputCancel(); e.currentTarget.blur(); }
            }}
            className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
          />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cb.onFontSizeStep(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">+</button>
        </div>
        {cb.isFontSizeMixed && <div className="text-12-regular text-black-50">혼합 크기</div>}
      </div>

      {/* 자간 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">자간</div>
        <input
          type="text" inputMode="decimal"
          value={isLetterSpacingEditing ? letterSpacingInput : formatNumber(cb.letterSpacing)}
          onChange={(e) => setLetterSpacingInput(e.target.value.replace(/[^0-9.-]/g, ""))}
          onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => { cb.onToolbarInputFocus(); setLetterSpacingInput(formatNumber(cb.letterSpacing)); setIsLetterSpacingEditing(true); e.target.select(); }}
          onBlur={() => { if (isLetterSpacingEditing) { setIsLetterSpacingEditing(false); commitLetterSpacing(); } cb.onToolbarInputBlur(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitLetterSpacing(); setIsLetterSpacingEditing(false); e.currentTarget.blur(); } }}
          className="no-spinner w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90"
        />
      </div>

      {/* 행간 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">행간</div>
        <input
          type="text" inputMode="decimal"
          value={isLineHeightEditing ? lineHeightInput : formatNumber(cb.lineHeight)}
          onChange={(e) => setLineHeightInput(e.target.value.replace(/[^0-9.-]/g, ""))}
          onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => { cb.onToolbarInputFocus(); setLineHeightInput(formatNumber(cb.lineHeight)); setIsLineHeightEditing(true); e.target.select(); }}
          onBlur={() => { if (isLineHeightEditing) { setIsLineHeightEditing(false); commitLineHeight(); } cb.onToolbarInputBlur(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitLineHeight(); setIsLineHeightEditing(false); e.currentTarget.blur(); } }}
          className="no-spinner w-full rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90"
        />
      </div>

      {/* 색상 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 색상</div>
        <div className="flex items-center gap-2">
          <ColorPickerPopover value={cb.color} onChange={cb.onColorChange} onChangeAll={changeAllMatchingColors ?? undefined} hasMatchingColors={hasMatchingColors ?? undefined} />
          <span className="text-14-regular text-black-70 uppercase">{cb.color}</span>
          <EyeDropperButton onPick={cb.onColorChange} />
        </div>
      </div>

      {/* 스타일 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">스타일</div>
        <div className="flex gap-1">
          <StyleButton label="B" title="굵게" active={cb.isBold} onClick={cb.onToggleBold} />
          <StyleButton label={<Underline className="h-4 w-4" />} title="밑줄" active={cb.isUnderline} onClick={cb.onToggleUnderline} />
          <StyleButton label={<Italic className="h-4 w-4" />} title="기울임꼴" active={cb.isItalic} onClick={cb.onToggleItalic} />
          <StyleButton label={<Strikethrough className="h-4 w-4" />} title="취소선" active={cb.isStrikethrough} onClick={cb.onToggleStrikethrough} />
        </div>
      </div>

      {/* 가로 정렬 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">정렬</div>
        <div className="flex gap-1">
          {([
            { key: "left" as const, Icon: TextAlignStart, label: "좌측" },
            { key: "center" as const, Icon: TextAlignCenter, label: "가운데" },
            { key: "right" as const, Icon: TextAlignEnd, label: "우측" },
            { key: "justify" as const, Icon: AlignJustify, label: "양쪽" },
          ]).map(({ key, Icon, label }) => (
            <button key={key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cb.onAlignChange(key)} className={`flex h-10 flex-1 items-center justify-center rounded-lg border ${cb.align === key ? "border-blue-500 bg-blue-50 text-primary" : "border-black-30 text-black-70 hover:bg-black-5"}`} title={label}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* 세로 정렬 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">세로 정렬</div>
        <div className="flex gap-1">
          {([
            { key: "top" as const, Icon: AlignStartHorizontal, label: "상단" },
            { key: "middle" as const, Icon: AlignCenterVertical, label: "중앙" },
            { key: "bottom" as const, Icon: AlignEndHorizontal, label: "하단" },
          ]).map(({ key, Icon, label }) => (
            <button key={key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cb.onAlignYChange(key)} className={`flex h-10 flex-1 items-center justify-center rounded-lg border ${cb.alignY === key ? "border-blue-500 bg-blue-50 text-primary" : "border-black-30 text-black-70 hover:bg-black-5"}`} title={label}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// 비편집 모드 패널: 요소 레벨 스타일 직접 변경
const StaticTextPanel = ({ element, updateElement }: { element: TextPanelData["element"]; updateElement: (id: string, patch: Record<string, unknown>) => void }) => {
  const changeAllMatchingColors = useElementPanelStore((s) => s.changeAllMatchingColors);
  const hasMatchingColors = useElementPanelStore((s) => s.hasMatchingColors);
  const style = element.style;
  const fontFamily = style.fontFamily ?? "Pretendard";
  const isFontFamilyMixed = detectMixedFontFamilyInRichText(element.richText, fontFamily);
  const color = style.color ?? "#000000";
  const align = style.alignX ?? "left";
  const alignY = style.alignY ?? "top";

  const [fontSizeInput, setFontSizeInput] = useState(String(style.fontSize));
  const [isFontSizeEditing, setIsFontSizeEditing] = useState(false);

  const MIN_FONT_SIZE = 12;
  const MAX_FONT_SIZE = 120;
  const clampFontSize = (v: number) => Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, v));

  // fontSize 비율로 너비를 계산하고 lineHeight로 높이를 계산한다.
  // element.h는 측정 lineHeight와 실제 lineHeight 불일치로 실제 비율과 다를 수 있으므로
  // w/h 비율 대신 fontSize 배율을 기준으로 한다.
  // 사용자가 사이드 핸들로 너비를 직접 변경한 경우 너비를 고정하고 높이는 예상값으로 초기 설정 후 autoResize가 보정한다.
  const calcNewRect = (newFontSize: number) => {
    const lh = style.lineHeight ?? DEFAULT_LINE_HEIGHT;
    const newH = Math.round(newFontSize * lh);
    if (element.userResizedWidth) {
      return { w: element.w, h: newH };
    }
    const scale = style.fontSize > 0 ? newFontSize / style.fontSize : 1;
    const newW = Math.round(element.w * scale);
    return { w: newW, h: newH };
  };

  const commitFontSize = () => {
    const parsed = Number(fontSizeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFontSizeInput(String(style.fontSize));
      return;
    }
    const clamped = clampFontSize(Math.round(parsed));
    const { w, h } = calcNewRect(clamped);
    updateElement(element.id, { style: { ...style, fontSize: clamped }, w, h, widthMode: "fixed" });
    setFontSizeInput(String(clamped));
  };

  const handleFontSizeStep = (delta: number) => {
    const next = clampFontSize(style.fontSize + delta);
    const { w, h } = calcNewRect(next);
    updateElement(element.id, { style: { ...style, fontSize: next }, w, h, widthMode: "fixed" });
    setFontSizeInput(String(next));
  };

  return (
    <>
      {/* 글꼴 */}
      <InlineFontPicker fontFamily={fontFamily} isMixed={isFontFamilyMixed} />

      {/* 텍스트 크기 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 크기</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleFontSizeStep(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">-</button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={isFontSizeEditing ? fontSizeInput : String(style.fontSize)}
            onChange={(e) => setFontSizeInput(e.target.value.replace(/[^0-9]/g, ""))}
            onFocus={(e) => { setFontSizeInput(String(style.fontSize)); setIsFontSizeEditing(true); e.target.select(); }}
            onBlur={() => { if (isFontSizeEditing) { setIsFontSizeEditing(false); commitFontSize(); } }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitFontSize(); setIsFontSizeEditing(false); e.currentTarget.blur(); } }}
            className="no-spinner flex-1 rounded-lg border border-black-30 px-3 py-2 text-center text-14-regular text-black-90"
          />
          <button type="button" onClick={() => handleFontSizeStep(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-16-semibold text-black-70 hover:border-primary hover:text-primary">+</button>
        </div>
      </div>

      {/* 색상 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">텍스트 색상</div>
        <div className="flex items-center gap-2">
          <ColorPickerPopover value={color} onChange={(c) => updateElement(element.id, { style: { ...style, color: c } })} onChangeAll={changeAllMatchingColors ?? undefined} hasMatchingColors={hasMatchingColors ?? undefined} />
          <span className="text-14-regular text-black-70 uppercase">{color}</span>
          <EyeDropperButton onPick={(c) => updateElement(element.id, { style: { ...style, color: c } })} />
        </div>
      </div>

      {/* 스타일 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">스타일</div>
        <div className="flex gap-1">
          <StyleButton label="B" title="굵게" active={style.fontWeight === "bold"} onClick={() => updateElement(element.id, { style: { ...style, fontWeight: style.fontWeight === "bold" ? "normal" : "bold" } })} />
          <StyleButton label={<Underline className="h-4 w-4" />} title="밑줄" active={!!style.underline} onClick={() => updateElement(element.id, { style: { ...style, underline: !style.underline } })} />
          <StyleButton label={<Italic className="h-4 w-4" />} title="기울임꼴" active={!!style.italic} onClick={() => updateElement(element.id, { style: { ...style, italic: !style.italic } })} />
          <StyleButton label={<Strikethrough className="h-4 w-4" />} title="취소선" active={!!style.strikethrough} onClick={() => updateElement(element.id, { style: { ...style, strikethrough: !style.strikethrough } })} />
        </div>
      </div>

      {/* 정렬 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">정렬</div>
        <div className="flex gap-1">
          {([
            { key: "left" as const, Icon: TextAlignStart },
            { key: "center" as const, Icon: TextAlignCenter },
            { key: "right" as const, Icon: TextAlignEnd },
            { key: "justify" as const, Icon: AlignJustify },
          ]).map(({ key, Icon }) => (
            <button key={key} type="button" onClick={() => updateElement(element.id, { style: { ...style, alignX: key } })} className={`flex h-10 flex-1 items-center justify-center rounded-lg border ${align === key ? "border-blue-500 bg-blue-50 text-primary" : "border-black-30 text-black-70 hover:bg-black-5"}`}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* 세로 정렬 */}
      <div className="flex flex-col gap-2">
        <div className="text-14-semibold text-black-90">세로 정렬</div>
        <div className="flex gap-1">
          {([
            { key: "top" as const, Icon: AlignStartHorizontal },
            { key: "middle" as const, Icon: AlignCenterVertical },
            { key: "bottom" as const, Icon: AlignEndHorizontal },
          ]).map(({ key, Icon }) => (
            <button key={key} type="button" onClick={() => updateElement(element.id, { style: { ...style, alignY: key } })} className={`flex h-10 flex-1 items-center justify-center rounded-lg border ${alignY === key ? "border-blue-500 bg-blue-50 text-primary" : "border-black-30 text-black-70 hover:bg-black-5"}`}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// 스타일 토글 버튼 (contentEditable 포커스 보존을 위해 onMouseDown preventDefault 필수)
const StyleButton = ({ label, title, active, onClick }: { label: React.ReactNode; title: string; active: boolean; onClick: () => void }) => (
  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-14-semibold ${active ? "border-blue-500 bg-blue-50 text-primary" : "border-black-30 text-black-70 hover:bg-black-5"}`} title={title}>
    {label}
  </button>
);

// 색상 추출(스포이드) 버튼
const EyeDropperButton = ({ onPick }: { onPick: (color: string) => void }) => {
  const addRecentColor = useRecentColorStore((s) => s.addRecentColor);

  const handleClick = async () => {
    const EyeDropperApi = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!EyeDropperApi) return;
    try {
      const eyeDropper = new EyeDropperApi();
      const result = await eyeDropper.open();
      const picked = result.sRGBHex.toUpperCase();
      onPick(picked);
      addRecentColor(picked);
    } catch { /* 사용자 취소 */ }
  };

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { void handleClick(); }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary"
      aria-label="색상 추출"
    >
      <Pipette className="h-4 w-4" />
    </button>
  );
};

export default TextPropsContent;
