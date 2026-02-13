import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import type { Rect, ResizeHandle } from "../../../../../model/canvasTypes";
import { getScale } from "../../../../../utils/domUtils";
import { DEFAULT_LINE_HEIGHT, isTextEmpty } from "../textContentUtils";
import { computeTextBoxSize } from "../textBoxMeasure";
import type { TextBoxProps } from "../textBoxTypes";
import { usePointerDragSession } from "../../../hooks/usePointerDragSession";

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
  selectionCount: number;
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
  selectionCount,
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
}: UseTextBoxInteractionProps) => {
  const { startPointerDragSession, cleanup } = usePointerDragSession();

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
    const shouldSelectOnClickOnly =
      type === "drag" && isSelected && selectionCount > 1 && !event.shiftKey;
    if (!shouldSelectOnClickOnly && (!isSelected || event.shiftKey)) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;

    // 코너 핸들은 가로/세로를 함께 조절해 비율 리사이즈 경로를 탄다.
    const isCornerHandle =
      handle &&
      (handle === "nw" ||
        handle === "ne" ||
        handle === "sw" ||
        handle === "se");
    const startHeight = startRect.height;
    const startWidth = startRect.width;
    const aspectRatio = startWidth / startHeight;

    // 코너/사이드 리사이즈는 폭 기준이 고정되어야 일관된 결과가 나오므로
    // auto/element 모드를 fixed로 전환한다.
    const isSideHandle = handle && (handle === "e" || handle === "w");
    if (isCornerHandle && widthMode === "auto") {
      onWidthModeChange?.("fixed");
    }
    if (isSideHandle && widthMode === "element") {
      onWidthModeChange?.("fixed");
    }

    onDragStateChange?.(true, rectRef.current, { type, handle });

    startPointerDragSession({
      startContext: null,
      createMoveContext: (moveEvent) => {
        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;
        return {
          distance: Math.hypot(dx, dy),
          context: { moveEvent, dx, dy },
        };
      },
      onMove: ({ moveEvent, dx, dy }) => {
        moveEvent.preventDefault();
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
                { type, handle },
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

        if (isCornerHandle) {
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

        if (isCornerHandle && toolbar) {
          const lineHeight = toolbar.lineHeight || DEFAULT_LINE_HEIGHT;
          const newFontSize = Math.round(nextHeight / lineHeight);
          const clampedFontSize = Math.max(
            toolbar.minFontSize,
            Math.min(newFontSize, toolbar.maxFontSize),
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
              { type, handle },
            )
          : {
              x: nextX,
              y: nextY,
              width: nextWidth,
              height: nextHeight,
            };
        rectRef.current = nextRect;
        onRectChange?.(nextRect);
      },
      onEnd: () => {
        if (!didMoveRef.current && shouldSelectOnClickOnly) {
          onSelectChange?.(true);
        }
        if (type === "resize") {
          isResizingRef.current = false;
        }
        onDragStateChange?.(false, rectRef.current, { type, handle });
      },
    });
  };

  return { startAction, cleanup };
};
