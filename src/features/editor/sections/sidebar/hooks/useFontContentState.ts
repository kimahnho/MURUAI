import { useState } from "react";
import { FONT_OPTIONS } from "@/features/editor/utils/fontOptions";
import { useFontStore } from "@/features/editor/store/fontStore";

export const useFontContentState = () => {
  const panelFontFamily = useFontStore((state) => state.panelFontFamily);
  const panelFontWeight = useFontStore((state) => state.panelFontWeight);
  const setPanelFont = useFontStore((state) => state.setPanelFont);
  const applyFont = useFontStore((state) => state.applyFont);
  const selectedFont =
    FONT_OPTIONS.find((font) => font.family === panelFontFamily) ??
    FONT_OPTIONS[0];
  const [expandedFontIds, setExpandedFontIds] = useState<string[]>([]);
  const [hasTouchedExpand, setHasTouchedExpand] = useState(false);
  const effectiveExpandedFontIds = hasTouchedExpand
    ? expandedFontIds
    : expandedFontIds.includes(selectedFont.id)
      ? expandedFontIds
      : [selectedFont.id, ...expandedFontIds];

  const handleFontSelect = (family: string) => {
    const font = FONT_OPTIONS.find((item) => item.family === family);
    if (!font) return;
    const availableWeights = font.weights.map((w) => w.value);
    const nextWeight = availableWeights.includes(panelFontWeight)
      ? panelFontWeight
      : (font.weights[0]?.value ?? 400);
    setPanelFont({ fontFamily: font.family, fontWeight: nextWeight });
    applyFont({ fontFamily: font.family, fontWeight: nextWeight });
    setExpandedFontIds((prev) =>
      prev.includes(font.id) ? prev : [...prev, font.id],
    );
    setHasTouchedExpand(true);
  };

  const handleWeightSelect = (family: string, weight: number) => {
    setPanelFont({ fontFamily: family, fontWeight: weight });
    applyFont({ fontFamily: family, fontWeight: weight });
    const font = FONT_OPTIONS.find((item) => item.family === family);
    if (font) {
      setExpandedFontIds((prev) =>
        prev.includes(font.id) ? prev : [...prev, font.id],
      );
    }
    setHasTouchedExpand(true);
  };

  const toggleExpand = (fontId: string) => {
    setExpandedFontIds((prev) =>
      prev.includes(fontId)
        ? prev.filter((id) => id !== fontId)
        : [...prev, fontId],
    );
    setHasTouchedExpand(true);
  };

  return {
    selectedFontId: selectedFont.id,
    panelFontFamily,
    panelFontWeight,
    expandedFontIds: effectiveExpandedFontIds,
    onToggleExpand: toggleExpand,
    onSelectFont: handleFontSelect,
    onSelectWeight: handleWeightSelect,
  };
};
