/**
 * 표지 템플릿 레지스트리 — 5 레이아웃 × 8 팔레트 = 40종.
 */
import type {
  CoverLayoutType,
  CoverPaletteId,
  CoverPalette,
  CoverTemplateEntry,
  CoverLayoutDef,
} from "./coverTypes";
import { COVER_PALETTES } from "./coverPalettes";
import { COVER_LAYOUTS } from "./coverLayouts";

// ─── Cross-product: 40 templates ───

function buildTemplateId(layout: CoverLayoutType, palette: CoverPaletteId): string {
  return `${layout}_${palette}`;
}

export const ALL_COVER_TEMPLATES: CoverTemplateEntry[] = COVER_LAYOUTS.flatMap(
  (layout) =>
    COVER_PALETTES.map((palette) => ({
      templateId: buildTemplateId(layout.type, palette.id),
      layoutType: layout.type,
      paletteId: palette.id,
      palette,
      label: `${layout.label} - ${palette.label}`,
    })),
);

// ─── Lookup helpers ───

const templateMap = new Map<string, CoverTemplateEntry>(
  ALL_COVER_TEMPLATES.map((t) => [t.templateId, t]),
);

const layoutMap = new Map<CoverLayoutType, CoverLayoutDef>(
  COVER_LAYOUTS.map((l) => [l.type, l]),
);

const paletteMap = new Map<CoverPaletteId, CoverPalette>(
  COVER_PALETTES.map((p) => [p.id, p]),
);

/** templateId → { layoutDef, palette } 반환. 없으면 null. */
export const getCoverTemplate = (
  templateId: string,
): { layout: CoverLayoutDef; palette: CoverPalette } | null => {
  const entry = templateMap.get(templateId);
  if (!entry) return null;
  const layout = layoutMap.get(entry.layoutType);
  const palette = paletteMap.get(entry.paletteId);
  if (!layout || !palette) return null;
  return { layout, palette };
};

/** 레이아웃 타입으로 필터. undefined이면 전체 반환. */
export const getCoverTemplatesByLayout = (
  layoutType?: CoverLayoutType,
): CoverTemplateEntry[] => {
  if (!layoutType) return ALL_COVER_TEMPLATES;
  return ALL_COVER_TEMPLATES.filter((t) => t.layoutType === layoutType);
};

export { COVER_PALETTES, COVER_LAYOUTS };
