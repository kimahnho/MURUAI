import { useCallback, useEffect, useMemo } from "react";
import type { CanvasElement, ShapeElement, TextElement } from "../../../model/canvasTypes";
import {
  getRectFromElement,
  isEditableTarget,
  isEmotionLabelText,
  isEmotionPlaceholderText,
  isEmotionSlotShape,
  isSameRect,
  type Rect,
} from "../../../utils/designPaperUtils";

const EMOTION_LABEL_TOLERANCE = 8;
const EMOTION_PLACEHOLDER_TOLERANCE = 8;

type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};

type UseEmotionSlotBindingsProps = {
  elements: CanvasElement[];
  readOnly: boolean;
  selectedIds: string[];
  editingTextId: string | null;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  updateElement: (id: string, patch: TextElementPatch | Partial<CanvasElement>) => void;
};

export const useEmotionSlotBindings = ({
  elements,
  readOnly,
  selectedIds,
  editingTextId,
  onElementsChange,
  onEditingTextIdChange,
  updateElement,
}: UseEmotionSlotBindingsProps) => {
  const findEmotionSlotTextId = useCallback(
    (shape: ShapeElement) => {
      const shapeRect = getRectFromElement(shape);
      if (!shapeRect) return null;
      const matched = elements.find(
        (element) => element.type === "text" && isSameRect(shapeRect, element)
      );
      return matched?.id ?? null;
    },
    [elements]
  );

  const findEmotionPlaceholderId = useCallback(
    (shape: ShapeElement) => {
      const exactId = findEmotionSlotTextId(shape);
      if (exactId) return exactId;
      const shapeRect = getRectFromElement(shape);
      if (!shapeRect) return null;
      const targetCenterX = shapeRect.x + shapeRect.width / 2;
      const targetCenterY = shapeRect.y + shapeRect.height / 2;
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      elements.forEach((element) => {
        if (!isEmotionPlaceholderText(element)) return;
        const centerX = element.x + element.w / 2;
        const centerY = element.y + element.h / 2;
        if (
          centerX < shapeRect.x - EMOTION_PLACEHOLDER_TOLERANCE ||
          centerX >
            shapeRect.x + shapeRect.width + EMOTION_PLACEHOLDER_TOLERANCE
        ) {
          return;
        }
        if (
          centerY < shapeRect.y - EMOTION_PLACEHOLDER_TOLERANCE ||
          centerY >
            shapeRect.y + shapeRect.height + EMOTION_PLACEHOLDER_TOLERANCE
        ) {
          return;
        }
        const distance = Math.hypot(
          centerX - targetCenterX,
          centerY - targetCenterY
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = element.id;
        }
      });
      return bestId;
    },
    [elements, findEmotionSlotTextId]
  );

  const findEmotionLabelId = useCallback(
    (shape: ShapeElement) => {
      const shapeRect = getRectFromElement(shape);
      if (!shapeRect) return null;
      const targetCenterX = shapeRect.x + shapeRect.width / 2;
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      elements.forEach((element) => {
        if (!isEmotionLabelText(element)) return;
        const centerX = element.x + element.w / 2;
        const matchesCenter =
          Math.abs(centerX - targetCenterX) <= EMOTION_LABEL_TOLERANCE;
        const matchesLeft =
          Math.abs(element.x - shapeRect.x) <= EMOTION_LABEL_TOLERANCE;
        if (!matchesCenter && !matchesLeft) {
          return;
        }
        const centerY = element.y + element.h / 2;
        const distance = centerY - (shapeRect.y + shapeRect.height);
        if (distance < -EMOTION_LABEL_TOLERANCE) return;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = element.id;
        }
      });
      return bestId;
    },
    [elements]
  );

  const emotionSlotTextIds = useMemo(() => {
    const ids = new Set<string>();
    elements.forEach((element) => {
      if (!isEmotionSlotShape(element)) return;
      const slotTextId = findEmotionPlaceholderId(element);
      if (slotTextId) {
        ids.add(slotTextId);
      }
    });
    return ids;
  }, [elements, findEmotionPlaceholderId]);

  const applyEmotionSlotRectUpdate = useCallback(
    (shapeId: string, nextRect: Rect) => {
      if (readOnly || !onElementsChange) return;
      const shape = elements.find((element) => element.id === shapeId);
      if (!shape || !isEmotionSlotShape(shape)) return;
      const shapeRect = getRectFromElement(shape) ?? {
        x: shape.x,
        y: shape.y,
        width: shape.w,
        height: shape.h,
      };
      const placeholderId = findEmotionPlaceholderId(shape);
      const labelId = findEmotionLabelId(shape);
      const label = labelId
        ? elements.find(
            (element) => element.id === labelId && element.type === "text"
          )
        : null;
      const labelOffset =
        label && label.type === "text"
          ? label.y - (shapeRect.y + shapeRect.height)
          : 0;
      const nextElements = elements.map((element) => {
        if (element.id === shapeId && "x" in element) {
          return {
            ...element,
            x: nextRect.x,
            y: nextRect.y,
            w: nextRect.width,
            h: nextRect.height,
          } as ShapeElement;
        }
        if (placeholderId && element.id === placeholderId) {
          return {
            ...element,
            x: nextRect.x,
            y: nextRect.y,
            w: nextRect.width,
            h: nextRect.height,
            widthMode: "fixed",
          } as TextElement;
        }
        if (labelId && element.id === labelId) {
          return {
            ...element,
            x: nextRect.x,
            y: nextRect.y + nextRect.height + labelOffset,
            w: nextRect.width,
            widthMode: "fixed",
          } as TextElement;
        }
        return element;
      });
      onElementsChange(nextElements);
    },
    [
      elements,
      findEmotionLabelId,
      findEmotionPlaceholderId,
      onElementsChange,
      readOnly,
    ]
  );

  const clearEmotionSlotImage = useCallback(
    (shapeId: string) => {
      if (readOnly || !onElementsChange) return;
      const target = elements.find((element) => element.id === shapeId);
      if (!target || !isEmotionSlotShape(target)) return;
      const isImageFill =
        target.fill.startsWith("url(") || target.fill.startsWith("data:");
      if (!isImageFill) return;
      const placeholderId = findEmotionPlaceholderId(target);
      const nextElements = elements.map((element) => {
        if (element.id === target.id) {
          return {
            ...element,
            fill: "#FFFFFF",
            imageBox: undefined,
            text: "감정을 선택해주세요",
          };
        }
        if (
          placeholderId &&
          element.id === placeholderId &&
          element.type === "text"
        ) {
          return { ...element, text: "감정을 선택해주세요" };
        }
        return element;
      });
      onElementsChange(nextElements);
    },
    [elements, findEmotionPlaceholderId, onElementsChange, readOnly]
  );

  useEffect(() => {
    if (readOnly || !onElementsChange) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (editingTextId) return;
      if (isEditableTarget(event.target)) {
        return;
      }
      if (selectedIds.length !== 1) return;
      const selectedElement = elements.find(
        (element) => element.id === selectedIds[0]
      );
      if (!selectedElement || !isEmotionSlotShape(selectedElement)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const slotTextId = findEmotionPlaceholderId(selectedElement);
      if (!slotTextId) return;
      const slotText = elements.find((element) => element.id === slotTextId);
      if (!slotText || slotText.type !== "text") return;
      event.preventDefault();
      const nextText =
        slotText.text === "감정을 선택해주세요"
          ? event.key
          : `${slotText.text}${event.key}`;
      updateElement(slotTextId, {
        text: nextText,
        style: { fontSize: 12, color: "#111827" },
      });
      onEditingTextIdChange?.(slotTextId);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    editingTextId,
    elements,
    findEmotionPlaceholderId,
    onEditingTextIdChange,
    onElementsChange,
    readOnly,
    selectedIds,
    updateElement,
  ]);

  return {
    emotionSlotTextIds,
    findEmotionPlaceholderId,
    findEmotionLabelId,
    applyEmotionSlotRectUpdate,
    clearEmotionSlotImage,
  };
};
