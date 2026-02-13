import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import type { Rect, ResizeHandle } from "../../../../../model/canvasTypes";
import { getScale } from "../../../../../utils/domUtils";
import { DEFAULT_LINE_HEIGHT, isTextEmpty } from "../textContentUtils";
import { computeTextBoxSize } from "../textBoxMeasure";
import type { ActiveListeners, TextBoxProps } from "../textBoxTypes";

type UseTextBoxInteractionProps = {
  locked: boolean;
  editable: boolean;
  isEditing: boolean;
  text: string;
  richText?: string;
  minWidth: number;
  minHeight: number;
  widthMode: "auto" | "fixed" | "element";
  isSelected: boolean;
  toolbar?: TextBoxProps["toolbar"];
  onRequestDelete?: TextBoxProps["onRequestDelete"];
  onFinishEditing?: TextBoxProps["onFinishEditing"];
  onSelectChange?: TextBoxProps["onSelectChange"];
  onWidthModeChange?: TextBoxProps["onWidthModeChange"];
  onDragStateChange?: TextBoxProps["onDragStateChange"];
  onRectChange?: TextBoxProps["onRectChange"];
  transformRect?: TextBoxProps["transformRect"];
  rectRef: MutableRefObject<Rect>;
  boxRef: RefObject<HTMLDivElement | null>;
  measureRef: RefObject<HTMLDivElement | null>;
  editableRef: RefObject<HTMLDivElement | null>;
  isResizingRef: MutableRefObject<boolean>;
  didMoveRef: MutableRefObject<boolean>;
  actionRef: MutableRefObject<ActiveListeners | null>;
};

export const useTextBoxInteraction = ({
  locked,
  editable,
  isEditing,
  text,
  richText,
  minWidth,
  minHeight,
  widthMode,
  isSelected,
  toolbar,
  onRequestDelete,
  onFinishEditing,
  onSelectChange,
  onWidthModeChange,
  onDragStateChange,
  onRectChange,
  transformRect,
  rectRef,
  boxRef,
  measureRef,
  editableRef,
  isResizingRef,
  didMoveRef,
  actionRef,
}: UseTextBoxInteractionProps) => {
  const startAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "drag" | "resize",
    handle?: ResizeHandle
  ) => {
    if (locked) return;
    if (event.button !== 0) return;
    if (isEditing && type === "drag") return;
    event.preventDefault();
    event.stopPropagation();
    if (editable && isEditing && type === "resize") {
      const editableNode = editableRef.current;
      const nextText = editableNode?.innerText ?? text;
      const nextRichText = editableNode?.innerHTML ?? richText;
      if (isTextEmpty(nextText, nextRichText)) {
        onRequestDelete?.();
      } else {
        onFinishEditing?.();
      }
    }
    if (type === "resize") {
      isResizingRef.current = true;
    }
    if (!isSelected || event.shiftKey) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;

    // Detect corner handles (nw, ne, sw, se).
    const isCornerHandle =
      handle &&
      (handle === "nw" ||
        handle === "ne" ||
        handle === "sw" ||
        handle === "se");
    const startHeight = startRect.height;
    const startWidth = startRect.width;
    const aspectRatio = startWidth / startHeight;

    // Switching to fixed width when resizing from corners or side handles.
    // element 모드에서는 사이드 핸들 드래그 시 fixed로 전환
    const isSideHandle = handle && (handle === "e" || handle === "w");
    if (isCornerHandle && widthMode === "auto") {
      onWidthModeChange?.("fixed");
    }
    if (isSideHandle && widthMode === "element") {
      onWidthModeChange?.("fixed");
    }

    onDragStateChange?.(true, rectRef.current, { type, handle });

    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();

      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      if (!didMoveRef.current && Math.hypot(dx, dy) > 3) {
        didMoveRef.current = true;
      }

      if (type === "drag") {
        const nextRect = transformRect
          ? transformRect(
              {
                x: startRect.x + dx,
                y: startRect.y + dy,
                width: startRect.width,
                height: startRect.height,
              },
              { type, handle }
            )
          : {
              x: startRect.x + dx,
              y: startRect.y + dy,
              width: startRect.width,
              height: startRect.height,
            };
        rectRef.current = nextRect;
        onRectChange?.(nextRect);
        return;
      }

      if (!handle) return;

      let nextX = startRect.x;
      let nextY = startRect.y;
      let nextWidth = startRect.width;
      let nextHeight = startRect.height;

      // Corner handle: keep aspect ratio.
      if (isCornerHandle) {
        // Use diagonal delta to preserve ratio.
        let delta = 0;
        if (handle === "se") {
          delta = Math.max(dx / aspectRatio, dy);
        } else if (handle === "sw") {
          delta = Math.max(-dx / aspectRatio, dy);
        } else if (handle === "ne") {
          delta = Math.max(dx / aspectRatio, -dy);
        } else if (handle === "nw") {
          delta = Math.max(-dx / aspectRatio, -dy);
        }

        nextHeight = startHeight + delta;
        nextWidth = nextHeight * aspectRatio;

        if (handle.includes("w")) {
          nextX = startRect.x + (startRect.width - nextWidth);
        }
        if (handle.includes("n")) {
          nextY = startRect.y + (startRect.height - nextHeight);
        }
      } else {
        // Side handles: adjust width and recompute height in real time.
        if (handle.includes("e")) {
          nextWidth = startRect.width + dx;
        }
        if (handle.includes("w")) {
          nextWidth = startRect.width - dx;
          nextX = startRect.x + dx;
        }
        const measure = measureRef.current;
        if (measure) {
          const editableNode = editableRef.current;
          const htmlContent = isEditing ? editableNode?.innerHTML : richText;
          const clampedWidth = Math.max(nextWidth, minWidth);
          const { targetHeight } = computeTextBoxSize({
            measure,
            htmlContent,
            text,
            rect: { ...startRect, width: clampedWidth },
            minWidth,
            minHeight,
            widthMode: "fixed",
            maxWidth: clampedWidth,
          });
          nextHeight = targetHeight;
        } else {
          nextHeight = startHeight;
        }
      }

      if (nextWidth < minWidth) {
        nextWidth = minWidth;
        if (isCornerHandle) {
          nextHeight = nextWidth / aspectRatio;
        }
        if (handle.includes("w")) {
          nextX = startRect.x + (startRect.width - minWidth);
        }
        if (isCornerHandle && handle.includes("n")) {
          nextY = startRect.y + (startRect.height - nextHeight);
        }
      }

      if (nextHeight < minHeight) {
        nextHeight = minHeight;
        if (isCornerHandle) {
          nextWidth = nextHeight * aspectRatio;
        }
        if (handle.includes("n")) {
          nextY = startRect.y + (startRect.height - minHeight);
        }
        if (isCornerHandle && handle.includes("w")) {
          nextX = startRect.x + (startRect.width - nextWidth);
        }
      }

      // Scale font size from height while resizing corners.
      if (isCornerHandle && toolbar) {
        const lineHeight = toolbar.lineHeight || DEFAULT_LINE_HEIGHT;
        const newFontSize = Math.round(nextHeight / lineHeight);
        const clampedFontSize = Math.max(
          toolbar.minFontSize,
          Math.min(newFontSize, toolbar.maxFontSize)
        );

        if (clampedFontSize !== toolbar.fontSize) {
          toolbar.onFontSizeChange(clampedFontSize);
        }
      }

      const nextRect = transformRect
        ? transformRect(
            {
              x: nextX,
              y: nextY,
              width: nextWidth,
              height: nextHeight,
            },
            { type, handle }
          )
        : {
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
          };
      rectRef.current = nextRect;
      onRectChange?.(nextRect);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      actionRef.current = null;
      if (type === "resize") {
        isResizingRef.current = false;
      }
      onDragStateChange?.(false, rectRef.current, { type, handle });
    };

    actionRef.current = { moveListener, upListener };
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  return { startAction };
};
