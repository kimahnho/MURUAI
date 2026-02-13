import type { TextElement } from "../../../model/canvasTypes";
import { getFontLabel } from "../../../utils/fontOptions";
import type { SideBarMenu } from "../../../store/sideBarStore";
import { stripStyleTags } from "../elements/text/textContentUtils";

type TextToolbarConfigParams = {
  element: TextElement;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  clampFontSize: (value: number) => number;
  offset: number;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setFontPanel: (value: { fontFamily: string; fontWeight: number }) => void;
  updateElement: (
    id: string,
    patch: {
      style?: Partial<TextElement["style"]>;
      richText?: string;
    },
  ) => void;
};

export const buildTextToolbarConfig = ({
  element,
  fontWeight,
  lineHeight,
  letterSpacing,
  clampFontSize,
  offset,
  setSideBarMenu,
  setFontPanel,
  updateElement,
}: TextToolbarConfigParams) => ({
  offset,
  minFontSize: 12,
  maxFontSize: 120,
  fontSize: element.style.fontSize,
  lineHeight,
  letterSpacing,
  color: element.style.color,
  isBold:
    element.style.fontWeight === "bold" ||
    (typeof element.style.fontWeight === "number" &&
      element.style.fontWeight >= 700),
  isUnderline: Boolean(element.style.underline),
  isItalic: Boolean(element.style.italic),
  isStrikethrough: Boolean(element.style.strikethrough),
  align: element.style.alignX,
  alignY: element.style.alignY,
  fontFamily: element.style.fontFamily ?? "Pretendard",
  fontLabel: getFontLabel(element.style.fontFamily ?? "Pretendard"),
  onFontFamilyClick: () => {
    setSideBarMenu("font");
    setFontPanel({
      fontFamily: element.style.fontFamily ?? "Pretendard",
      fontWeight,
    });
  },
  onFontSizeChange: (value: number) => {
    updateElement(element.id, {
      style: { fontSize: clampFontSize(value) },
    });
  },
  onFontSizeStep: (delta: number) => {
    updateElement(element.id, {
      style: {
        fontSize: clampFontSize(element.style.fontSize + delta),
      },
    });
  },
  onLineHeightChange: (value: number) => {
    updateElement(element.id, { style: { lineHeight: value } });
  },
  onLetterSpacingChange: (value: number) => {
    updateElement(element.id, { style: { letterSpacing: value } });
  },
  onColorChange: (color: string) => {
    updateElement(element.id, {
      style: { color },
      richText: element.richText
        ? stripStyleTags(element.richText, "color")
        : undefined,
    });
  },
  onToggleBold: () => {
    updateElement(element.id, {
      style: {
        fontWeight: element.style.fontWeight === "bold" ? "normal" : "bold",
      },
      richText: element.richText
        ? stripStyleTags(element.richText, "bold")
        : undefined,
    });
  },
  onToggleUnderline: () => {
    updateElement(element.id, {
      style: { underline: !element.style.underline },
      richText: element.richText
        ? stripStyleTags(element.richText, "underline")
        : undefined,
    });
  },
  onToggleItalic: () => {
    updateElement(element.id, {
      style: { italic: !element.style.italic },
      richText: element.richText
        ? stripStyleTags(element.richText, "italic")
        : undefined,
    });
  },
  onToggleStrikethrough: () => {
    updateElement(element.id, {
      style: { strikethrough: !element.style.strikethrough },
      richText: element.richText
        ? stripStyleTags(element.richText, "strikethrough")
        : undefined,
    });
  },
  onAlignChange: (align: "left" | "center" | "right") => {
    updateElement(element.id, { style: { alignX: align } });
  },
  onAlignYChange: (alignY: "top" | "middle" | "bottom") => {
    updateElement(element.id, { style: { alignY } });
  },
});
