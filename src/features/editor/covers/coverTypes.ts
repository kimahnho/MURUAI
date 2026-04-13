/**
 * 표지(커버) 템플릿 시스템 타입 정의.
 */
import type { ReactNode } from "react";

export type CoverLayoutType =
  | "corner"
  | "scene"
  | "frame"
  | "character"
  | "minimal";

export type CoverPaletteId =
  | "mint_cream"
  | "rose_blush"
  | "warm_peach"
  | "sunny_yellow"
  | "fresh_green"
  | "sky_blue"
  | "deep_pink"
  | "lavender";

export interface CoverPalette {
  id: CoverPaletteId;
  label: string;
  bg: string;
  accent: string;
  titleBorder: string;
}

/** Page에 영속화되는 커버 데이터 */
export interface CoverData {
  templateId: string;
  title: string;
}

/** 레지스트리 엔트리 — 모달 썸네일 + 필터에 사용 */
export interface CoverTemplateEntry {
  templateId: string;
  layoutType: CoverLayoutType;
  paletteId: CoverPaletteId;
  palette: CoverPalette;
  label: string;
}

/** 레이아웃 정의 — 장식 렌더링 함수와 제목 스타일 포함 */
export interface CoverLayoutDef {
  type: CoverLayoutType;
  label: string;
  renderDecorations: (palette: CoverPalette) => ReactNode;
  titleStyle: (palette: CoverPalette) => React.CSSProperties;
}

export const COVER_LAYOUT_LABELS: Record<CoverLayoutType, string> = {
  corner: "코너",
  scene: "풍경",
  frame: "프레임",
  character: "캐릭터",
  minimal: "미니멀",
};
