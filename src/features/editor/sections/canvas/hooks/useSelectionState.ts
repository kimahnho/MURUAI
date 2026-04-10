/**
 * 현재 페이지 기준 선택 요소/선택 박스/다중 선택 파생 상태를 계산하는 훅.
 */
import type { Dispatch, SetStateAction } from "react";
import { useNumberInput } from "../../../shared/hooks/useNumberInput";
import { getFontLabel, normalizeFontWeight } from "@/shared/utils/fontOptions";
import type {
  AacCardElement,
  CanvasElement,
  EmotionCardElement,
  FreeformElement,
  ShapeElement,
  TextElement,
} from "../../../model/canvasTypes";
import type { Page } from "../../../model/pageTypes";
import { useAacSelectionState } from "./useAacSelectionState";
import {
  buildHorizontalDistribution,
  buildVerticalDistribution,
  buildAlignLeft,
  buildAlignCenterH,
  buildAlignRight,
  buildAlignTop,
  buildAlignCenterV,
  buildAlignBottom,
  applyPositionToElement,
} from "../../../utils/distributeElements";
import { updateElementsByPageId } from "../../../utils/pageMutation";
import { getUnlockedOrFirst } from "../utils/selectionHelpers";
import {
  applySelectedBorderPatch,
  applySelectedFontSize,
} from "../utils/selectionPatches";
import { mp } from "@/shared/utils/mixpanel";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type SelectionStateParams = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  setPages: Dispatch<SetStateAction<Page[]>>;
};

export const useSelectionState = ({
  pages,
  selectedPageId,
  selectedIds,
  setPages,
}: SelectionStateParams) => {
  const activePage = pages.find((page) => page.id === selectedPageId) ?? null;
  const selectedElements = activePage
    ? activePage.elements.filter((element) => selectedIds.includes(element.id))
    : [];
  const activeToolbarElementId =
    selectedIds.length === 1 ? selectedIds[0] : null;

  const isColorTarget = (
    element: CanvasElement,
  ): element is TextElement | ShapeElement | AacCardElement | EmotionCardElement | FreeformElement =>
    element.type === "text" ||
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse" ||
    element.type === "mosaic" ||
    element.type === "circleMosaic" ||
    element.type === "aacCard" ||
    element.type === "emotionCard" ||
    element.type === "freeform";
  const isMultiColorSelection =
    selectedElements.length > 1 && selectedElements.every(isColorTarget);
  // 다중 선택 UI는 잠금 요소가 섞일 수 있어 "수정 가능한 첫 요소"를 대표값으로 사용한다.
  const multiColorSource = isMultiColorSelection
    ? getUnlockedOrFirst(selectedElements)
    : null;
  const multiColorValue = (() => {
    if (!multiColorSource) return "#000000";
    if (multiColorSource.type === "text") {
      return multiColorSource.style.color ?? "#000000";
    }
    const fill = multiColorSource.fill ?? "#ffffff";
    const isImageFill = fill.startsWith("url(") || fill.startsWith("data:");
    return isImageFill ? "#ffffff" : fill;
  })();

  const isFontTarget = (
    element: CanvasElement,
  ): element is TextElement | ShapeElement | AacCardElement | EmotionCardElement =>
    element.type === "text" ||
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse" ||
    element.type === "mosaic" ||
    element.type === "circleMosaic" ||
    element.type === "aacCard" ||
    element.type === "emotionCard";
  const multiFontTargets = isMultiColorSelection
    ? selectedElements.filter(isFontTarget)
    : [];
  const multiFontSource =
    multiFontTargets.length > 0 ? getUnlockedOrFirst(multiFontTargets) : null;
  const hasMultiFontTargets = multiFontTargets.length > 0;
  const getMultiFontFamily = (): string => {
    if (!multiFontSource) return "Pretendard";
    if (multiFontSource.type === "text") return multiFontSource.style.fontFamily ?? "Pretendard";
    if (multiFontSource.type === "aacCard" || multiFontSource.type === "emotionCard") return multiFontSource.label.style.fontFamily ?? "Pretendard";
    return multiFontSource.textStyle?.fontFamily ?? "Pretendard";
  };
  const multiFontFamily = getMultiFontFamily();
  const multiFontLabel = getFontLabel(multiFontFamily);
  const multiFontWeight = multiFontSource
    ? multiFontSource.type === "text"
      ? normalizeFontWeight(multiFontSource.style.fontWeight)
      : multiFontSource.type === "aacCard" || multiFontSource.type === "emotionCard"
        ? normalizeFontWeight(multiFontSource.label.style.fontWeight)
        : normalizeFontWeight(multiFontSource.textStyle?.fontWeight)
    : 400;
  const multiFontSize =
    multiFontSource && multiFontSource.type === "text"
      ? multiFontSource.style.fontSize
      : multiFontSource && (multiFontSource.type === "aacCard" || multiFontSource.type === "emotionCard")
        ? multiFontSource.label.style.fontSize
        : (multiFontSource?.textStyle?.fontSize ?? 16);
  const minMultiFontSize = 12;
  const maxMultiFontSize = 120;
  const applyMultiFontSize = (value: number) => {
    if (!activePage) return;
    const nextSize = Math.min(
      maxMultiFontSize,
      Math.max(minMultiFontSize, value),
    );
    // 텍스트/도형 텍스트를 같은 액션으로 갱신해 혼합 선택 편집 경험을 맞춘다.
    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => applySelectedFontSize(el, selectedIds, nextSize)),
      ),
    );
  };
  const multiFontSizeInput = useNumberInput({
    value: multiFontSize,
    min: minMultiFontSize,
    max: maxMultiFontSize,
    onChange: applyMultiFontSize,
  });

  const isBorderTarget = (element: CanvasElement): element is ShapeElement | AacCardElement | EmotionCardElement | FreeformElement =>
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse" ||
    element.type === "mosaic" ||
    element.type === "circleMosaic" ||
    element.type === "aacCard" ||
    element.type === "emotionCard" ||
    element.type === "freeform";
  const multiBorderTargets = isMultiColorSelection
    ? selectedElements.filter(isBorderTarget)
    : [];
  const multiBorderSource =
    multiBorderTargets.length > 0
      ? getUnlockedOrFirst(multiBorderTargets)
      : null;
  const hasMultiBorderTargets = multiBorderTargets.length > 0;
  const multiBorderEnabled = multiBorderSource?.border?.enabled ?? false;
  const multiBorderColor = multiBorderSource?.border?.color ?? "#000000";
  const multiBorderWidth = multiBorderSource?.border?.width ?? 2;
  const multiBorderStyle: BorderStyle =
    multiBorderSource?.border?.style ?? "solid";
  const borderStyleOptions: Array<BorderStyle | "none"> = [
    "none",
    "solid",
    "dashed",
    "double",
    "dotted",
  ];
  const activeBorderStyle: BorderStyle | "none" = multiBorderEnabled
    ? multiBorderStyle
    : "none";
  const clampBorderWidth = (value: number) => Math.min(20, Math.max(1, value));
  const applyMultiBorderPatch = (patch: Partial<ShapeElement["border"]>) => {
    if (!activePage) return;
    // 테두리 기본값을 함께 넘겨 테두리가 없는 도형도 동일 규칙으로 생성/갱신한다.
    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) =>
          applySelectedBorderPatch(el, selectedIds, patch, {
            enabled: multiBorderEnabled,
            color: multiBorderColor,
            width: multiBorderWidth,
            style: multiBorderStyle,
          }),
        ),
      ),
    );
  };

  const selectedElement = activeToolbarElementId
    ? activePage?.elements.find((el) => el.id === activeToolbarElementId)
    : null;
  const lineToolbarData = (() => {
    if (!activePage) return null;

    const selectedLines = selectedIds
      .map((id) => activePage.elements.find((el) => el.id === id))
      .filter(
        (el): el is Extract<CanvasElement, { type: "line" | "arrow" }> =>
          el != null &&
          !el.locked &&
          (el.type === "line" || el.type === "arrow"),
      );

    if (selectedLines.length === 0) return null;

    const element = selectedLines[0];
    const stroke = element.stroke ?? { color: "#000000", width: 2 };
    const dx = element.end.x - element.start.x;
    const dy = element.end.y - element.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angleRad = Math.atan2(dy, dx);
    const rawAngle = ((angleRad * 180) / Math.PI + 360) % 360;
    const angle = Math.round(rawAngle) % 360;

    return {
      element,
      stroke,
      length,
      angle,
    };
  })();

  const shapeToolbarData = (() => {
    const buildShapeData = (element: ShapeElement, isMultiShape: boolean, selectedShapeIds: string[]) => {
      const rect = {
        x: element.x,
        y: element.y,
        width: element.w,
        height: element.h,
      };
      const radius =
        element.type === "ellipse"
          ? Math.min(rect.width, rect.height) / 2
          : (element.radius ?? 0);
      const maxRadius = Math.min(rect.width, rect.height) / 2;
      const minRadius = 0;
      const clampRadius = (value: number) =>
        Math.min(maxRadius, Math.max(minRadius, value));
      const isImageFill =
        element.fill.startsWith("url(") || element.fill.startsWith("data:");
      const colorValue = isImageFill ? "#ffffff" : element.fill;
      const borderEnabled = element.border?.enabled ?? false;
      const borderColor = element.border?.color ?? "#000000";
      const borderWidth = element.border?.width ?? 2;
      const borderStyle = element.border?.style ?? "solid";

      return {
        element,
        rect,
        radius,
        minRadius,
        maxRadius,
        clampRadius,
        colorValue,
        borderEnabled,
        borderColor,
        borderWidth,
        borderStyle,
        isMultiShape,
        selectedShapeIds,
      };
    };

    const isShapeBase = (el: CanvasElement): el is ShapeElement =>
      (el.type === "rect" ||
        el.type === "roundRect" ||
        el.type === "ellipse" ||
        el.type === "mosaic" ||
        el.type === "circleMosaic") &&
      !el.locked &&
      el.subType !== "emotionSlot" &&
      el.subType !== "emotionInference";

    // 단일 선택: imageSlot은 이미지 삽입 UX를 위해 제외
    if (
      selectedElement &&
      isShapeBase(selectedElement) &&
      selectedElement.subType !== "imageSlot"
    ) {
      return buildShapeData(selectedElement, false, [selectedElement.id]);
    }

    // 다중 선택: 같은 도형 타입만 선택된 경우 (imageSlot 포함)
    if (selectedElements.length > 1) {
      const selectedShapes = selectedElements.filter(isShapeBase);
      if (
        selectedShapes.length === selectedElements.length &&
        selectedShapes.every((el) => el.type === selectedShapes[0].type)
      ) {
        const representative = getUnlockedOrFirst(selectedShapes) ?? selectedShapes[0];
        return buildShapeData(representative, true, selectedShapes.map((s) => s.id));
      }
    }

    return null;
  })();

  const { aacToolbarData, applyAacLabelPosition } = useAacSelectionState({
    activePage,
    selectedPageId,
    selectedElements,
    setPages,
  });

  const canAlign = selectedElements.length >= 2;
  const canDistribute = selectedElements.length >= 3;

  const applyAlignment = (
    builder: (elements: CanvasElement[]) => Map<string, number> | null,
    axis: "x" | "y",
    direction: string,
  ) => {
    if (!activePage || selectedElements.length < 2) return;
    const positionMap = builder(selectedElements);
    if (!positionMap) return;

    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => applyPositionToElement(el, axis, positionMap)),
      ),
    );
    mp.track("요소 정렬", { direction });
  };

  const alignLeft = () => applyAlignment(buildAlignLeft, "x", "left");
  const alignCenterH = () => applyAlignment(buildAlignCenterH, "x", "center-h");
  const alignRight = () => applyAlignment(buildAlignRight, "x", "right");
  const alignTop = () => applyAlignment(buildAlignTop, "y", "top");
  const alignCenterV = () => applyAlignment(buildAlignCenterV, "y", "center-v");
  const alignBottom = () => applyAlignment(buildAlignBottom, "y", "bottom");

  const distributeHorizontal = () => {
    if (!activePage || selectedElements.length < 3) return;
    const positionMap = buildHorizontalDistribution(selectedElements);
    if (!positionMap) return;

    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => applyPositionToElement(el, "x", positionMap)),
      ),
    );
    mp.track("요소 정렬 분배", { direction: "horizontal" });
  };

  const distributeVertical = () => {
    if (!activePage || selectedElements.length < 3) return;
    const positionMap = buildVerticalDistribution(selectedElements);
    if (!positionMap) return;

    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => applyPositionToElement(el, "y", positionMap)),
      ),
    );
    mp.track("요소 정렬 분배", { direction: "vertical" });
  };

  return {
    activePage,
    isMultiColorSelection,
    multiColorValue,
    hasMultiFontTargets,
    multiFontFamily,
    multiFontLabel,
    multiFontWeight,
    multiFontSizeInput,
    hasMultiBorderTargets,
    multiBorderEnabled,
    multiBorderColor,
    multiBorderWidth,
    activeBorderStyle,
    borderStyleOptions,
    clampBorderWidth,
    applyMultiBorderPatch,
    lineToolbarData,
    shapeToolbarData,
    aacToolbarData,
    applyAacLabelPosition,
    canAlign,
    alignLeft,
    alignCenterH,
    alignRight,
    alignTop,
    alignCenterV,
    alignBottom,
    canDistribute,
    distributeHorizontal,
    distributeVertical,
  };
};
