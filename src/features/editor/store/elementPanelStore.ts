/**
 * 선택된 요소의 속성 편집 데이터를 사이드바 패널에 전달하는 스토어.
 * Table을 제외한 모든 요소 타입과 다중 선택 상태를 관리한다.
 */
import { create } from "zustand";
import type {
  AacCardElement,
  EmotionCardElement,
  LineElement,
  ShapeElement,
  TextElement,
} from "../model/canvasTypes";
import type { AacLabelPosition } from "../utils/aacBoardUtils";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

// --- Panel data discriminated union ---

export type ShapePanelData = {
  type: "shape";
  element: ShapeElement;
  rect: { x: number; y: number; width: number; height: number };
  radius: number;
  minRadius: number;
  maxRadius: number;
  colorValue: string;
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: BorderStyle;
  isMultiShape?: boolean;
  selectedShapeIds?: string[];
};

export type LinePanelData = {
  type: "line" | "arrow";
  element: LineElement;
  stroke: { color: string; width: number };
  length: number;
  angle: number;
};

export type TextPanelData = {
  type: "text";
  element: TextElement;
  isEditing: boolean;
};

export type AacPanelData = {
  type: "aac";
  elementId: string;
  labelPosition: AacLabelPosition;
  cardCount: number;
  hasImage: boolean;
};

export type AacCardV2PanelData = {
  type: "aacCardV2";
  element: AacCardElement;
  hasImage: boolean;
};

export type MultiCallbacks = {
  multiColorValue: string;
  onMultiColorChange: (color: string) => void;
  hasMultiFontTargets: boolean;
  onOpenFontPanel: () => void;
  multiFontFamily: string;
  multiFontLabel: string;
  multiFontSizeInput: {
    displayValue: string;
    handleChange: (value: string) => void;
    handleFocus: (event?: import("react").FocusEvent<HTMLInputElement>) => void;
    handleBlur: () => void;
    commit: () => void;
    step: (delta: number) => void;
  };
  hasMultiBorderTargets: boolean;
  multiBorderEnabled: boolean;
  multiBorderColor: string;
  multiBorderWidth: number;
  activeBorderStyle: "solid" | "dashed" | "dotted" | "double" | "none";
  borderStyleOptions: Array<"solid" | "dashed" | "dotted" | "double" | "none">;
  clampBorderWidth: (value: number) => number;
  applyMultiBorderPatch: (patch: Partial<{ enabled: boolean; color: string; width: number; style: "solid" | "dashed" | "dotted" | "double" }>) => void;
  canDistribute: boolean;
  onDistributeHorizontal: () => void;
  onDistributeVertical: () => void;
};

export type EmotionCardPanelData = {
  type: "emotionCard";
  element: EmotionCardElement;
  hasImage: boolean;
};

export type MultiPanelData = {
  type: "multi";
};

export type PanelData =
  | ShapePanelData
  | LinePanelData
  | TextPanelData
  | AacPanelData
  | AacCardV2PanelData
  | EmotionCardPanelData
  | MultiPanelData
  | null;

// --- Update callbacks ---

type UpdateElementFn = (id: string, patch: Record<string, unknown>) => void;
type UpdateLinesFn = (
  updater: (el: LineElement) => Partial<LineElement>,
) => void;
type ChangeAllMatchingColorsFn = (oldColor: string, newColor: string) => void;
type HasMatchingColorsFn = (color: string) => boolean;
type ChangeAllMatchingFontsFn = (oldFont: string, newFont: string) => void;
type HasMatchingFontsFn = (font: string) => boolean;

export type LayerDirection = "forward" | "front" | "backward" | "back";
type MoveLayerFn = (elementId: string, direction: LayerDirection) => void;

// --- Text editing callbacks ---

export type TextEditingCallbacks = {
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onToggleItalic: () => void;
  onToggleStrikethrough: () => void;
  onColorChange: (color: string) => void;
  onFontSizeStep: (delta: number) => void;
  onFontSizeInputChange: (value: string) => void;
  onFontSizeInputCommit: () => void;
  onFontSizeInputCancel: () => void;
  onFontSizeInputFocus: () => void;
  onFontSizeInputBlur: () => void;
  onToolbarInputFocus: () => void;
  onToolbarInputBlur: () => void;
  onLineHeightChange: (value: number) => void;
  onLetterSpacingChange: (value: number) => void;
  onAlignChange: (value: "left" | "center" | "right" | "justify") => void;
  onAlignYChange: (value: "top" | "middle" | "bottom") => void;
  onFontFamilyClick: () => void;
  onFontFamilyChange: (family: string, weight: number) => void;
  fontSizeDisplay: string;
  fontSizeInputValue: string;
  isFontSizeMixed: boolean;
  isFontSizeInputDirty: boolean;
  fontSize: number;
  minFontSize: number;
  maxFontSize: number;
  fontFamily: string;
  fontLabel: string;
  isFontFamilyMixed: boolean;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  isBold: boolean;
  isUnderline: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  align: "left" | "center" | "right" | "justify";
  alignY: "top" | "middle" | "bottom";
};

// --- Store interface ---

interface ElementPanelStore {
  panelData: PanelData;
  updateElement: UpdateElementFn | null;
  updateLines: UpdateLinesFn | null;
  moveLayer: MoveLayerFn | null;
  changeAllMatchingColors: ChangeAllMatchingColorsFn | null;
  hasMatchingColors: HasMatchingColorsFn | null;
  changeAllMatchingFonts: ChangeAllMatchingFontsFn | null;
  hasMatchingFonts: HasMatchingFontsFn | null;
  textEditingCallbacks: TextEditingCallbacks | null;
  multiCallbacks: MultiCallbacks | null;

  setPanelData: (
    data: PanelData,
    update: UpdateElementFn | null,
    updateLines?: UpdateLinesFn | null,
  ) => void;
  setMoveLayer: (fn: MoveLayerFn | null) => void;
  setChangeAllMatchingColors: (fn: ChangeAllMatchingColorsFn | null) => void;
  setHasMatchingColors: (fn: HasMatchingColorsFn | null) => void;
  setChangeAllMatchingFonts: (fn: ChangeAllMatchingFontsFn | null) => void;
  setHasMatchingFonts: (fn: HasMatchingFontsFn | null) => void;
  setTextEditingCallbacks: (callbacks: TextEditingCallbacks | null) => void;
  setMultiCallbacks: (callbacks: MultiCallbacks | null) => void;
}

export const useElementPanelStore = create<ElementPanelStore>((set) => ({
  panelData: null,
  updateElement: null,
  updateLines: null,
  moveLayer: null,
  changeAllMatchingColors: null,
  hasMatchingColors: null,
  changeAllMatchingFonts: null,
  hasMatchingFonts: null,
  textEditingCallbacks: null,
  multiCallbacks: null,

  setPanelData: (data, update, updateLines) => {
    set({ panelData: data, updateElement: update, updateLines: updateLines ?? null });
  },
  setMoveLayer: (fn) => {
    set({ moveLayer: fn });
  },
  setChangeAllMatchingColors: (fn) => {
    set({ changeAllMatchingColors: fn });
  },
  setHasMatchingColors: (fn) => {
    set({ hasMatchingColors: fn });
  },
  setChangeAllMatchingFonts: (fn) => {
    set({ changeAllMatchingFonts: fn });
  },
  setHasMatchingFonts: (fn) => {
    set({ hasMatchingFonts: fn });
  },
  setTextEditingCallbacks: (callbacks) => {
    set({ textEditingCallbacks: callbacks });
  },
  setMultiCallbacks: (callbacks) => {
    set({ multiCallbacks: callbacks });
  },
}));
