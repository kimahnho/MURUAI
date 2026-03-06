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
      w?: number;
      h?: number;
      widthMode?: TextElement["widthMode"];
      userResizedWidth?: boolean;
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
    const clamped = clampFontSize(value);
    const newH = Math.round(clamped * lineHeight);
    // 사용자가 사이드 핸들로 너비를 직접 변경한 경우 너비를 고정하고 높이는 예상값으로 초기 설정한다.
    // autoResize가 실제 DOM 측정으로 높이를 보정한다.
    const widthPatch = element.userResizedWidth
      ? { w: element.w, h: newH }
      : (() => {
          // w/h 비율이 아닌 fontSize 비율로 너비를 계산한다.
          // element.h는 측정 lineHeight와 실제 lineHeight 불일치로 실제 비율과 다를 수 있기 때문이다.
          const scale = element.style.fontSize > 0 ? clamped / element.style.fontSize : 1;
          return { w: Math.round(element.w * scale), h: newH };
        })();
    updateElement(element.id, {
      style: { fontSize: clamped },
      // 전역 폰트 크기 변경 시 기존 인라인 font-size를 제거해 원복/우선순위 충돌을 방지한다.
      richText: element.richText
        ? stripStyleTags(element.richText, "fontSize")
        : undefined,
      ...widthPatch,
      // auto/element/미지정 모드인 경우 fixed로 전환해 autoResize가 박스 크기를 덮어쓰지 않도록 한다.
      widthMode: "fixed",
    });
  },
  onFontSizeStep: (delta: number) => {
    const nextBaseFontSize = clampFontSize(element.style.fontSize + delta);
    const newH = Math.round(nextBaseFontSize * lineHeight);
    // 사용자가 사이드 핸들로 너비를 직접 변경한 경우 너비를 고정하고 높이는 예상값으로 초기 설정한다.
    // autoResize가 실제 DOM 측정으로 높이를 보정한다.
    const widthPatch = element.userResizedWidth
      ? { w: element.w, h: newH }
      : (() => {
          // w/h 비율이 아닌 fontSize 비율로 너비를 계산한다.
          const scale = element.style.fontSize > 0 ? nextBaseFontSize / element.style.fontSize : 1;
          return { w: Math.round(element.w * scale), h: newH };
        })();
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
      ...widthPatch,
      // auto/element/미지정 모드인 경우 fixed로 전환해 autoResize가 박스 크기를 덮어쓰지 않도록 한다.
      widthMode: "fixed",
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
