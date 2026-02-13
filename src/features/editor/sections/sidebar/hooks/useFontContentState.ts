/**
 * 폰트 패널의 선택 폰트/굵기/크기 등 UI 상태를 관리하는 훅.
 */
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
  // 최초 진입 시 현재 선택 폰트를 자동 확장해, 사용자가 바로 weight 옵션을 확인할 수 있게 한다.
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
    // 폰트 변경 시 현재 weight가 없으면 해당 폰트의 첫 weight로 안전하게 fallback한다.
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
