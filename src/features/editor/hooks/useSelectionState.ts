import type { Dispatch, SetStateAction } from "react";
import { useNumberInput } from "../model/useNumberInput";
import { getFontLabel, normalizeFontWeight } from "../utils/fontOptions";
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
} from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import type { AacLabelPosition } from "../utils/aacBoardUtils";
import { findLabelElementId, isAacLabelElement } from "../utils/imageFillUtils";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

const AAC_CARD_PREFIX = "aac-card-";
const AAC_LABEL_PREFIX = "aac-label-";
const AAC_BORDER_COLOR = "#E5E7EB";
const AAC_BORDER_WIDTH = 2;
const AAC_IMAGEBOX_TOLERANCE = 2;

const getTempId = (element: CanvasElement) =>
  (element as { tempId?: string }).tempId;

const isAacBoardLabel = (element: CanvasElement) => {
  if (element.type !== "text") return false;
  const tempId = getTempId(element);
  if (tempId?.startsWith(AAC_LABEL_PREFIX)) return true;
  return isAacLabelElement(element);
};

const hasAacBorder = (element: ShapeElement) =>
  element.border?.enabled === true &&
  element.border.color === AAC_BORDER_COLOR &&
  element.border.width === AAC_BORDER_WIDTH;

const hasInsetImageBox = (element: ShapeElement) => {
  if (!element.imageBox) return false;
  return (
    Math.abs(element.imageBox.w - element.w) > AAC_IMAGEBOX_TOLERANCE ||
    Math.abs(element.imageBox.h - element.h) > AAC_IMAGEBOX_TOLERANCE
  );
};

const buildAacIndex = (elements: CanvasElement[]) => {
  const elementById = new Map<string, CanvasElement>();
  const aacLabelIds = new Set<string>();
  elements.forEach((element) => {
    elementById.set(element.id, element);
    if (isAacBoardLabel(element)) {
      aacLabelIds.add(element.id);
    }
  });

  const aacCards: ShapeElement[] = [];
  const aacCardsByLabelId = new Map<string, ShapeElement>();
  elements.forEach((element) => {
    if (
      element.type !== "rect" &&
      element.type !== "roundRect" &&
      element.type !== "ellipse"
    ) {
      return;
    }
    const tempId = getTempId(element);
    const isExplicitAac = tempId?.startsWith(AAC_CARD_PREFIX);
    const hasLinkedAacLabel =
      Boolean(element.labelId) && aacLabelIds.has(element.labelId ?? "");
    const isFallbackAac =
      !element.labelId && hasAacBorder(element) && hasInsetImageBox(element);
    if (!isExplicitAac && !hasLinkedAacLabel && !isFallbackAac) return;
    aacCards.push(element);
    if (element.labelId) {
      aacCardsByLabelId.set(element.labelId, element);
    }
  });

  const aacCardIdSet = new Set(aacCards.map((card) => card.id));

  return {
    elementById,
    aacLabelIds,
    aacCards,
    aacCardIdSet,
    aacCardsByLabelId,
  };
};

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
  ): element is TextElement | ShapeElement =>
    element.type === "text" ||
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse";
  const isMultiColorSelection =
    selectedElements.length > 1 && selectedElements.every(isColorTarget);
  const multiColorSource = isMultiColorSelection
    ? (selectedElements.find((element) => !element.locked) ??
      selectedElements[0] ??
      null)
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
  ): element is TextElement | ShapeElement =>
    element.type === "text" ||
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse";
  const multiFontTargets = isMultiColorSelection
    ? selectedElements.filter(isFontTarget)
    : [];
  const multiFontSource =
    multiFontTargets.length > 0
      ? (multiFontTargets.find((element) => !element.locked) ??
        multiFontTargets[0] ??
        null)
      : null;
  const hasMultiFontTargets = multiFontTargets.length > 0;
  const multiFontFamily =
    multiFontSource && multiFontSource.type === "text"
      ? (multiFontSource.style.fontFamily ?? "Pretendard")
      : (multiFontSource?.textStyle?.fontFamily ?? "Pretendard");
  const multiFontLabel = getFontLabel(multiFontFamily);
  const multiFontWeight = multiFontSource
    ? multiFontSource.type === "text"
      ? normalizeFontWeight(multiFontSource.style.fontWeight)
      : normalizeFontWeight(multiFontSource.textStyle?.fontWeight)
    : 400;
  const multiFontSize =
    multiFontSource && multiFontSource.type === "text"
      ? multiFontSource.style.fontSize
      : (multiFontSource?.textStyle?.fontSize ?? 16);
  const minMultiFontSize = 12;
  const maxMultiFontSize = 120;
  const applyMultiFontSize = (value: number) => {
    if (!activePage) return;
    const nextSize = Math.min(
      maxMultiFontSize,
      Math.max(minMultiFontSize, value),
    );
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === selectedPageId
          ? {
              ...page,
              elements: page.elements.map((el) => {
                if (!selectedIds.includes(el.id) || el.locked) {
                  return el;
                }
                if (el.type === "text") {
                  return {
                    ...el,
                    style: {
                      ...el.style,
                      fontSize: nextSize,
                    },
                  };
                }
                if (
                  el.type === "rect" ||
                  el.type === "roundRect" ||
                  el.type === "ellipse"
                ) {
                  return {
                    ...el,
                    textStyle: {
                      ...el.textStyle,
                      fontSize: nextSize,
                    },
                  };
                }
                return el;
              }),
            }
          : page,
      ),
    );
  };
  const multiFontSizeInput = useNumberInput({
    value: multiFontSize,
    min: minMultiFontSize,
    max: maxMultiFontSize,
    onChange: applyMultiFontSize,
  });

  const isBorderTarget = (element: CanvasElement): element is ShapeElement =>
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse";
  const multiBorderTargets = isMultiColorSelection
    ? selectedElements.filter(isBorderTarget)
    : [];
  const multiBorderSource =
    multiBorderTargets.length > 0
      ? (multiBorderTargets.find((element) => !element.locked) ??
        multiBorderTargets[0] ??
        null)
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
    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id !== selectedPageId) return page;
        return {
          ...page,
          elements: page.elements.map((el) => {
            if (!selectedIds.includes(el.id) || el.locked) {
              return el;
            }
            if (
              el.type !== "rect" &&
              el.type !== "roundRect" &&
              el.type !== "ellipse"
            ) {
              return el;
            }
            const baseBorder = el.border ?? {
              enabled: multiBorderEnabled,
              color: multiBorderColor,
              width: multiBorderWidth,
              style: multiBorderStyle,
            };
            return {
              ...el,
              border: {
                ...baseBorder,
                ...patch,
              },
            };
          }),
        };
      }),
    );
  };

  const selectedElement = activeToolbarElementId
    ? activePage?.elements.find((el) => el.id === activeToolbarElementId)
    : null;
  const lineToolbarData = (() => {
    if (!activePage) return null;

    // 선택된 요소들 중 line/arrow만 필터링
    const selectedLines = selectedIds
      .map((id) => activePage.elements.find((el) => el.id === id))
      .filter(
        (el): el is Extract<CanvasElement, { type: "line" | "arrow" }> =>
          el != null &&
          !el.locked &&
          (el.type === "line" || el.type === "arrow"),
      );

    if (selectedLines.length === 0) return null;

    // 첫 번째 선택된 선을 기준으로 툴바 데이터 생성
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
    if (
      !selectedElement ||
      selectedElement.locked ||
      (selectedElement.type !== "rect" &&
        selectedElement.type !== "roundRect" &&
        selectedElement.type !== "ellipse")
    ) {
      return null;
    }

    const element = selectedElement;
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
    };
  })();

  const aacIndex = activePage ? buildAacIndex(activePage.elements) : null;

  // AAC 카드 선택 감지 (단일 또는 다중 선택, 라벨 클릭 포함)
  const aacCardTargets = (() => {
    if (!activePage || !aacIndex) return [];
    const elements = activePage.elements;
    const targets = new Map<string, ShapeElement>();
    const { aacCards, aacCardIdSet, aacCardsByLabelId } = aacIndex;

    selectedElements.forEach((element) => {
      if (element.type === "text") {
        const linkedCard = aacCardsByLabelId.get(element.id);
        if (linkedCard) {
          targets.set(linkedCard.id, linkedCard);
          return;
        }
        if (!isAacBoardLabel(element)) return;
        const matchedCard = aacCards.find(
          (card) =>
            findLabelElementId(elements, card, isAacLabelElement) ===
            element.id,
        );
        if (matchedCard) {
          targets.set(matchedCard.id, matchedCard);
        }
        return;
      }
      if (
        (element.type === "rect" ||
          element.type === "roundRect" ||
          element.type === "ellipse") &&
        aacCardIdSet.has(element.id)
      ) {
        targets.set(element.id, element);
      }
    });

    return Array.from(targets.values());
  })();
  const hasAacCardSelection = aacCardTargets.length > 0;

  // AAC 카드의 현재 라벨 위치 판단
  const aacLabelPosition = ((): AacLabelPosition => {
    if (!hasAacCardSelection || !activePage || !aacIndex) return "bottom";

    const firstCard = aacCardTargets[0];
    const labelElement =
      firstCard.labelId != null
        ? aacIndex.elementById.get(firstCard.labelId)
        : null;

    if (!labelElement || labelElement.type !== "text") return "none";

    // 라벨이 숨겨진 경우 "none"
    if (labelElement.visible === false) return "none";

    // 라벨이 카드 상단에 있는지 하단에 있는지 확인
    const cardY = firstCard.y;
    const cardHeight = firstCard.h;
    const labelY = labelElement.y;
    const cardCenterY = cardY + cardHeight / 2;

    return labelY < cardCenterY ? "top" : "bottom";
  })();

  // AAC 카드 라벨 위치 변경 함수
  const applyAacLabelPosition = (position: AacLabelPosition) => {
    if (!activePage || aacCardTargets.length === 0) return;

    const targetCardIds = new Set(aacCardTargets.map((card) => card.id));
    const getDefaultLabelHeight = (cardHeight: number) => {
      const maxLabelHeight = 12 * 3.7795;
      const rawHeight = Math.min(
        maxLabelHeight,
        Math.max(0, cardHeight * 0.22),
      );
      return Math.max(1, Math.round(rawHeight * 2) / 2);
    };

    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id !== selectedPageId) return page;

        const elements = page.elements;
        const elementById = new Map(
          elements.map((element) => [element.id, element]),
        );
        const targetCards = elements.filter(
          (element): element is ShapeElement => targetCardIds.has(element.id),
        );
        if (targetCards.length === 0) return page;

        const targetCardById = new Map(
          targetCards.map((card) => [card.id, card]),
        );
        const labelInfoMap = new Map<
          string,
          { labelHeight: number; cardId: string }
        >();
        const labelIdByCardId = new Map<string, string>();
        const newLabels: TextElement[] = [];

        targetCards.forEach((card) => {
          let labelId = card.labelId ?? null;
          const labelElement =
            labelId != null ? elementById.get(labelId) : undefined;

          if (
            (!labelElement || labelElement.type !== "text") &&
            position !== "none"
          ) {
            const nextLabelId = labelId ?? crypto.randomUUID();
            const nextLabel: TextElement = {
              id: nextLabelId,
              type: "text",
              x: card.x,
              y: card.y,
              w: card.w,
              h: getDefaultLabelHeight(card.h),
              text: "단어",
              widthMode: "auto",
              lockHeight: true,
              style: {
                fontSize: 18,
                fontWeight: "normal",
                color: "#6B7280",
                underline: false,
                alignX: "center",
                alignY: "middle",
              },
            };
            newLabels.push(nextLabel);
            labelId = nextLabelId;
          }

          if (labelId) {
            labelIdByCardId.set(card.id, labelId);
            labelInfoMap.set(labelId, {
              labelHeight:
                labelElement && labelElement.type === "text"
                  ? labelElement.h
                  : getDefaultLabelHeight(card.h),
              cardId: card.id,
            });
          }
        });

        const labelIds = new Set(labelInfoMap.keys());

        return {
          ...page,
          elements: [
            ...elements.map((el) => {
              // AAC 카드(roundRect) 처리 - 이미지 박스 위치 조정
              const isTargetCard =
                targetCardIds.has(el.id) &&
                (el.type === "rect" ||
                  el.type === "roundRect" ||
                  el.type === "ellipse");
              if (
                isTargetCard &&
                (el.type === "rect" ||
                  el.type === "roundRect" ||
                  el.type === "ellipse")
              ) {
                const card = el;
                let nextCard: ShapeElement = card;
                const nextLabelId = labelIdByCardId.get(card.id);
                if (nextLabelId && card.labelId !== nextLabelId) {
                  nextCard = { ...nextCard, labelId: nextLabelId };
                }
                if (!card.imageBox) return nextCard;

                const labelInfo = nextLabelId
                  ? labelInfoMap.get(nextLabelId)
                  : undefined;
                const labelHeight = labelInfo?.labelHeight ?? 0;
                const imagePadding = 4;
                const labelGap = 8;
                const labelAreaHeight =
                  position === "none" ? 0 : labelHeight + labelGap;

                // 이미지 박스 크기 계산
                const availableHeight =
                  card.h - imagePadding * 2 - labelAreaHeight;
                const availableWidth = card.w - imagePadding * 2;
                const imageBoxSize = Math.min(availableWidth, availableHeight);

                // 이미지 박스 위치 계산
                const imageBoxX = (card.w - imageBoxSize) / 2;
                let imageBoxY: number;

                if (position === "none") {
                  // 텍스트 없음: 이미지를 중앙에 배치
                  imageBoxY = (card.h - imageBoxSize) / 2;
                } else if (position === "top") {
                  // 텍스트 상단: 이미지를 아래쪽에 배치
                  imageBoxY = imagePadding + labelAreaHeight;
                } else {
                  // 텍스트 하단: 이미지를 위쪽에 배치
                  imageBoxY = imagePadding;
                }

                return {
                  ...nextCard,
                  imageBox: {
                    x: imageBoxX,
                    y: imageBoxY,
                    w: imageBoxSize,
                    h: imageBoxSize,
                  },
                };
              }

              // 라벨 텍스트 처리
              if (labelIds.has(el.id) && el.type === "text") {
                if (position === "none") {
                  // 라벨 숨기기 (visible: false)
                  return {
                    ...el,
                    visible: false,
                  };
                }

                // 해당 라벨의 카드 찾기
                const labelInfo = labelInfoMap.get(el.id);
                const parentCard = labelInfo
                  ? targetCardById.get(labelInfo.cardId)
                  : undefined;
                if (!parentCard) return el;

                const labelInset = 4;
                const newY =
                  position === "top"
                    ? parentCard.y + labelInset
                    : parentCard.y + parentCard.h - el.h - labelInset;

                return {
                  ...el,
                  y: newY,
                  visible: true,
                };
              }

              return el;
            }),
            ...newLabels,
          ],
        };
      }),
    );
  };

  const aacToolbarData = hasAacCardSelection
    ? {
        labelPosition: aacLabelPosition,
        cardCount: aacCardTargets.length,
      }
    : null;

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
  };
};
