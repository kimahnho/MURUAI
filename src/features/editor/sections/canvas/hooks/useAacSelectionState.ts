import type { Dispatch, SetStateAction } from "react";
import type {
  CanvasElement,
  ShapeElement,
  TextElement,
} from "../../../model/canvasTypes";
import type { Page } from "../../../model/pageTypes";
import type { AacLabelPosition } from "../../../utils/aacBoardUtils";
import { findLabelElementId, isAacLabelElement } from "../../../utils/imageFillUtils";
import { bumpPageRevision } from "../../../utils/pageRevision";

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

export const buildAacIndex = (elements: CanvasElement[]) => {
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

type AacSelectionStateParams = {
  activePage: Page | null;
  selectedPageId: string;
  selectedElements: CanvasElement[];
  setPages: Dispatch<SetStateAction<Page[]>>;
};

export const useAacSelectionState = ({
  activePage,
  selectedPageId,
  selectedElements,
  setPages,
}: AacSelectionStateParams) => {
  const aacIndex = activePage ? buildAacIndex(activePage.elements) : null;

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

  const aacLabelPosition = ((): AacLabelPosition => {
    if (!hasAacCardSelection || !activePage || !aacIndex) return "bottom";

    const firstCard = aacCardTargets[0];
    const labelElement =
      firstCard.labelId != null
        ? aacIndex.elementById.get(firstCard.labelId)
        : null;

    if (!labelElement || labelElement.type !== "text") return "none";
    if (labelElement.visible === false) return "none";

    const cardY = firstCard.y;
    const cardHeight = firstCard.h;
    const labelY = labelElement.y;
    const cardCenterY = cardY + cardHeight / 2;

    return labelY < cardCenterY ? "top" : "bottom";
  })();

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

        return bumpPageRevision({
          ...page,
          elements: [
            ...elements.map((el) => {
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
                const labelGap = 8;
                const labelAreaHeight =
                  position === "none" ? 0 : labelHeight + labelGap;

                const existingBox = card.imageBox;
                const imageAreaHeight = Math.max(
                  1,
                  card.h - labelAreaHeight,
                );
                const imageAreaWidth = card.w;

                const imageAreaY =
                  position === "top" ? labelAreaHeight : 0;
                const imageBoxX =
                  (imageAreaWidth - existingBox.w) / 2;
                const imageBoxY =
                  imageAreaY +
                  (imageAreaHeight - existingBox.h) / 2;

                return {
                  ...nextCard,
                  imageBox: {
                    x: imageBoxX,
                    y: imageBoxY,
                    w: existingBox.w,
                    h: existingBox.h,
                  },
                };
              }

              if (labelIds.has(el.id) && el.type === "text") {
                if (position === "none") {
                  return {
                    ...el,
                    visible: false,
                  };
                }

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
        });
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
    aacToolbarData,
    applyAacLabelPosition,
  };
};
