/**
 * 라운드 박스 요소의 포인터 입력을 해석해 이동/리사이즈/선택 패치를 생성하는 인터랙션 훅.
 */
import { type PointerEvent as ReactPointerEvent } from "react";
import type { Rect, ResizeHandle } from "../../../../model/canvasTypes";
import { getScale } from "../../../../utils/domUtils";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

type ActionType =
  | "drag"
  | "resize"
  | "imageScale"
  | "imageMove"
  | "imageBoxResize"
  | "imageBoxMove"
  | "cropResize";

interface ImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseRoundBoxInteractionParams {
  locked: boolean;
  isSelected: boolean;
  selectionCount: number;
  minWidth: number;
  minHeight: number;
  boxRef: React.RefObject<HTMLDivElement | null>;
  rectRef: React.RefObject<Rect>;
  imageScaleRef: React.RefObject<number>;
  imageOffsetRef: React.RefObject<{ x: number; y: number }>;
  imageBoxRef: React.RefObject<ImageBox>;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => Rect;
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle; isCrop?: boolean },
  ) => void;
  onImageScaleChange?: (value: number) => void;
  onImageOffsetChange?: (value: { x: number; y: number }) => void;
  onImageBoxChange?: (value: ImageBox) => void;
  onSelectChange?: (
    isSelected: boolean,
    options?: { additive?: boolean },
  ) => void;
  cropKeepFrame?: boolean;
}

const clampImageScale = (value: number) => Math.min(3, Math.max(0.5, value));

export const useRoundBoxInteraction = ({
  locked,
  isSelected,
  selectionCount,
  minWidth,
  minHeight,
  boxRef,
  rectRef,
  imageScaleRef,
  imageOffsetRef,
  imageBoxRef,
  transformRect,
  onRectChange,
  onDragStateChange,
  onImageScaleChange,
  onImageOffsetChange,
  onImageBoxChange,
  onSelectChange,
  cropKeepFrame = false,
}: UseRoundBoxInteractionParams) => {
  const { startPointerDragSession, cleanup } = usePointerDragSession();

  const startAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: ActionType,
    handle?: ResizeHandle,
  ) => {
    if (locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const shouldSelectOnClickOnly =
      type === "drag" && isSelected && selectionCount > 1 && !event.shiftKey;
    if (!shouldSelectOnClickOnly && (!isSelected || event.shiftKey)) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffset = imageOffsetRef.current;
    const startImageBox = imageBoxRef.current;

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
      onStart: () => {
        if (type === "drag" || type === "resize" || type === "cropResize") {
          onDragStateChange?.(true, rectRef.current, { type: type === "cropResize" ? "resize" : type, handle, isCrop: type === "cropResize" });
        }
      },
      onMove: ({ moveEvent, dx, dy }) => {
        moveEvent.preventDefault();

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

        if (type === "imageScale") {
          if (!onImageScaleChange || !handle) return;
          const directionX = handle.includes("w") ? -1 : 1;
          const directionY = handle.includes("n") ? -1 : 1;
          const delta = (dx * directionX + dy * directionY) / 200;
          const nextScale = clampImageScale(imageScaleRef.current + delta);
          imageScaleRef.current = nextScale;
          onImageScaleChange(nextScale);
          return;
        }
        if (type === "imageMove") {
          if (!onImageOffsetChange) return;
          const nextOffset = { x: startOffset.x + dx, y: startOffset.y + dy };
          imageOffsetRef.current = nextOffset;
          onImageOffsetChange(nextOffset);
          return;
        }
        if (type === "imageBoxMove") {
          if (!onImageBoxChange) return;
          const nextX = startImageBox.x + dx;
          const nextY = startImageBox.y + dy;
          const nextBox = {
            x: nextX,
            y: nextY,
            w: startImageBox.w,
            h: startImageBox.h,
          };
          imageBoxRef.current = nextBox;
          onImageBoxChange(nextBox);
          return;
        }
        if (type === "imageBoxResize") {
          if (!onImageBoxChange || !handle) return;
          const minSize = 20;
          const startBox = startImageBox;
          let nextX = startBox.x;
          let nextY = startBox.y;
          let nextW = startBox.w;
          let nextH = startBox.h;

          if (handle.includes("e")) {
            nextW = startBox.w + dx;
          }
          if (handle.includes("s")) {
            nextH = startBox.h + dy;
          }
          if (handle.includes("w")) {
            nextW = startBox.w - dx;
            nextX = startBox.x + dx;
          }
          if (handle.includes("n")) {
            nextH = startBox.h - dy;
            nextY = startBox.y + dy;
          }

          if (handle.length === 2) {
            // 코너 핸들은 축비율을 유지해 이미지 박스가 찌그러지지 않게 한다.
            const scaleX = nextW / startBox.w;
            const scaleY = nextH / startBox.h;
            const uniformScale =
              Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY;
            nextW = startBox.w * uniformScale;
            nextH = startBox.h * uniformScale;
            if (handle.includes("w")) {
              nextX = startBox.x + (startBox.w - nextW);
            }
            if (handle.includes("n")) {
              nextY = startBox.y + (startBox.h - nextH);
            }
          }

          if (nextW < minSize) {
            nextW = minSize;
            if (handle.includes("w")) {
              nextX = startBox.x + (startBox.w - minSize);
            }
          }
          if (nextH < minSize) {
            nextH = minSize;
            if (handle.includes("n")) {
              nextY = startBox.y + (startBox.h - minSize);
            }
          }

          const nextBox = { x: nextX, y: nextY, w: nextW, h: nextH };
          imageBoxRef.current = nextBox;
          onImageBoxChange(nextBox);
          return;
        }

        if (type === "cropResize") {
          if (!onImageBoxChange || !handle) return;

          if (cropKeepFrame) {
            // 감정카드/AAC카드: 프레임 고정, imageBox만 축소/확대
            const minSize = 20;
            const box = startImageBox;
            let nextX = box.x;
            let nextY = box.y;
            let nextW = box.w;
            let nextH = box.h;

            if (handle.includes("e")) {
              nextW = Math.max(minSize, box.w + dx);
            }
            if (handle.includes("s")) {
              nextH = Math.max(minSize, box.h + dy);
            }
            if (handle.includes("w")) {
              const d = Math.min(-dx, nextW - minSize);
              nextW -= d;
              nextX = box.x - d;
            }
            if (handle.includes("n")) {
              const d = Math.min(-dy, nextH - minSize);
              nextH -= d;
              nextY = box.y - d;
            }

            const nextBox = { x: nextX, y: nextY, w: nextW, h: nextH };
            imageBoxRef.current = nextBox;
            onImageBoxChange(nextBox);
            return;
          }

          // 순수 이미지: rect 축소 + imageBox 보상
          if (!onRectChange) return;
          const minSize = 20;
          const box = startImageBox;

          let nx = startRect.x;
          let ny = startRect.y;
          let nw = startRect.width;
          let nh = startRect.height;
          let bx = box.x;
          let by = box.y;

          if (handle.includes("w")) {
            const d = Math.min(dx, nw - minSize);
            nx += d;
            nw -= d;
            bx -= d;
          }
          if (handle.includes("e")) {
            nw = Math.max(minSize, startRect.width + dx);
          }
          if (handle.includes("n")) {
            const d = Math.min(dy, nh - minSize);
            ny += d;
            nh -= d;
            by -= d;
          }
          if (handle.includes("s")) {
            nh = Math.max(minSize, startRect.height + dy);
          }

          const nextRect = { x: nx, y: ny, width: nw, height: nh };
          const nextBox = { x: bx, y: by, w: box.w, h: box.h };
          rectRef.current = nextRect;
          imageBoxRef.current = nextBox;
          onRectChange(nextRect);
          onImageBoxChange(nextBox);
          return;
        }

        if (!handle) return;

        let nextX = startRect.x;
        let nextY = startRect.y;
        let nextWidth = startRect.width;
        let nextHeight = startRect.height;

        const isCornerHandle = handle.length === 2;
        const aspectRatio = startRect.width / startRect.height;

        if (isCornerHandle) {
          // 코너 리사이즈는 항상 원본 비율을 보존해 도형 스케일만 바뀌도록 한다.
          if (handle.includes("e")) {
            nextWidth = startRect.width + dx;
          }
          if (handle.includes("s")) {
            nextHeight = startRect.height + dy;
          }
          if (handle.includes("w")) {
            nextWidth = startRect.width - dx;
          }
          if (handle.includes("n")) {
            nextHeight = startRect.height - dy;
          }

          const scaleX = nextWidth / startRect.width;
          const scaleY = nextHeight / startRect.height;
          const uniformScale =
            Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY;
          nextWidth = startRect.width * uniformScale;
          nextHeight = startRect.height * uniformScale;

          if (handle.includes("w")) {
            nextX = startRect.x + startRect.width - nextWidth;
          }
          if (handle.includes("n")) {
            nextY = startRect.y + startRect.height - nextHeight;
          }
        } else {
          if (handle.includes("e")) {
            nextWidth = startRect.width + dx;
          }
          if (handle.includes("s")) {
            nextHeight = startRect.height + dy;
          }
          if (handle.includes("w")) {
            nextWidth = startRect.width - dx;
            nextX = startRect.x + dx;
          }
          if (handle.includes("n")) {
            nextHeight = startRect.height - dy;
            nextY = startRect.y + dy;
          }
        }

        if (nextWidth < minWidth) {
          nextWidth = minWidth;
          if (handle.includes("w")) {
            nextX = startRect.x + (startRect.width - minWidth);
          }
          if (isCornerHandle) {
            nextHeight = nextWidth / aspectRatio;
            if (handle.includes("n")) {
              nextY = startRect.y + startRect.height - nextHeight;
            }
          }
        }

        if (nextHeight < minHeight) {
          nextHeight = minHeight;
          if (handle.includes("n")) {
            nextY = startRect.y + (startRect.height - minHeight);
          }
          if (isCornerHandle) {
            nextWidth = nextHeight * aspectRatio;
            if (handle.includes("w")) {
              nextX = startRect.x + startRect.width - nextWidth;
            }
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
      onEnd: (moved, reason) => {
        // 다중 선택된 도형을 드래그하려다 이동이 없으면 클릭으로 간주해
        // 단일 선택으로 전환한다.
        if (!moved && shouldSelectOnClickOnly && reason === "pointerup") {
          onSelectChange?.(true);
        }
        if (moved && (type === "drag" || type === "resize" || type === "cropResize")) {
          onDragStateChange?.(false, rectRef.current, { type: type === "cropResize" ? "resize" : type, isCrop: type === "cropResize" });
        }
      },
    });
  };

  return { startAction, cleanup };
};
