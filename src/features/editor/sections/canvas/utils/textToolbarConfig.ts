/**
 * 텍스트 툴바 옵션과 표시 규칙 설정을 정의하는 모듈.
 */
import type { TextElement } from "../../../model/canvasTypes";
import { getFontLabel } from "../../../utils/fontOptions";
import type { SideBarMenu } from "../../../store/sideBarStore";
import {
  applyFontSizeDeltaToRichText,
  stripStyleTags,
} from "../elements/text/textContentUtils";

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
    // 글꼴 선택은 사이드바 font 패널을 여는 UI 전환과 현재 요소 폰트 상태 동기화를 함께 수행한다.
    setSideBarMenu("font");
    setFontPanel({
      fontFamily: element.style.fontFamily ?? "Pretendard",
      fontWeight,
    });
  },
  onFontSizeChange: (value: number) => {
    updateElement(element.id, {
      style: { fontSize: clampFontSize(value) },
      // 전역 폰트 크기 변경 시 기존 인라인 font-size를 제거해 원복/우선순위 충돌을 방지한다.
      richText: element.richText
        ? stripStyleTags(element.richText, "fontSize")
        : undefined,
    });
  },
  onFontSizeStep: (delta: number) => {
    const nextBaseFontSize = clampFontSize(element.style.fontSize + delta);
    updateElement(element.id, {
      style: {
        fontSize: nextBaseFontSize,
      },
      richText: element.richText
        ? applyFontSizeDeltaToRichText({
            richText: element.richText,
            delta,
            clamp: clampFontSize,
          })
        : undefined,
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
      // 단일 스타일 변경 시 richText 내 동일 속성 태그를 제거해 이중 우선순위를 방지한다.
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
  onAlignChange: (align: "left" | "center" | "right" | "justify") => {
    // 정렬 변경은 richText 마크업이 아닌 요소 style 레벨에서 처리해 전역 정렬 기준을 유지한다.
    updateElement(element.id, { style: { alignX: align } });
  },
  onAlignYChange: (alignY: "top" | "middle" | "bottom") => {
    updateElement(element.id, { style: { alignY } });
  },
});
