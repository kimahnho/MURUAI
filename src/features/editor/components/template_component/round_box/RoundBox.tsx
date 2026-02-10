import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import type { Rect, ResizeHandle } from "../../../model/canvasTypes";
import { getScale } from "../../../utils/domUtils";
import TransformToolbar from "../TransformToolbar";

type ImageHandle = ResizeHandle;

interface RoundBoxProps {
  rect: Rect;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  fill?: string;
  imageScale?: number;
  imageOffset?: {
    x: number;
    y: number;
  };
  imageBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  borderRadius?: number | string;
  border?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted" | "double";
  };
  text?: string;
  textStyle?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    fontFamily?: string;
    color?: string;
  };
  children?: React.ReactNode;
  isSelected?: boolean;
  selectionCount?: number;
  isImageEditing?: boolean;
  isTextEditing?: boolean;
  locked?: boolean;
  selectable?: boolean;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => Rect;
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize" },
  ) => void;
  onImageScaleChange?: (value: number) => void;
  onImageOffsetChange?: (value: { x: number; y: number }) => void;
  onImageBoxChange?: (value: {
    x: number;
    y: number;
    w: number;
    h: number;
  }) => void;
  onSelectChange?: (
    isSelected: boolean,
    options?: { additive?: boolean },
  ) => void;
  onImageEditingChange?: (isEditing: boolean) => void;
  onTextEditingChange?: (isEditing: boolean) => void;
  onTextChange?: (text: string) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onImageDrop?: (imageUrl: string) => void;
  transform?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
  };
  onFlipX?: () => void;
  onFlipY?: () => void;
  onRotateCW?: () => void;
  onRotateCCW?: () => void;
  onRotationChange?: (angle: number) => void;
  showInlineMetrics?: boolean;
}

interface ActiveListeners {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
}

const RoundBox = ({
  rect,
  minWidth = 80,
  minHeight = 80,
  className = "",
  fill = "#ffffff",
  imageScale = 1,
  imageOffset = { x: 0, y: 0 },
  imageBox,
  borderRadius = 16,
  border,
  text = "",
  textStyle,
  children,
  isSelected = false,
  selectionCount = 0,
  isImageEditing: isImageEditingProp,
  isTextEditing: isTextEditingProp,
  locked = false,
  selectable = true,
  transformRect,
  onRectChange,
  onDragStateChange,
  onImageScaleChange,
  onImageOffsetChange,
  onImageBoxChange,
  onSelectChange,
  onImageEditingChange,
  onTextEditingChange,
  onTextChange,
  onContextMenu,
  onImageDrop,
  transform,
  onFlipX,
  onFlipY,
  onRotateCW,
  onRotateCCW,
  onRotationChange,
  showInlineMetrics = true,
}: RoundBoxProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isImageEditingState, setIsImageEditingState] = useState(false);
  const [isTextEditingState, setIsTextEditingState] = useState(false);
  const [editingText, setEditingText] = useState(text);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Use controlled prop if provided, otherwise use local state
  const isImageEditing = isImageEditingProp ?? isImageEditingState;
  const setIsImageEditing = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue =
      typeof value === "function" ? value(isImageEditing) : value;
    if (isImageEditingProp === undefined) {
      setIsImageEditingState(newValue);
    }
    onImageEditingChange?.(newValue);
  };

  const isTextEditing = isTextEditingProp ?? isTextEditingState;
  const setIsTextEditing = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === "function" ? value(isTextEditing) : value;
    if (isTextEditingProp === undefined) {
      setIsTextEditingState(newValue);
    }
    onTextEditingChange?.(newValue);
  };
  const rectRef = useRef(rect);
  const imageScaleRef = useRef(imageScale);
  const imageOffsetRef = useRef(imageOffset);
  const imageBoxRef = useRef(
    imageBox ?? { x: 0, y: 0, w: rect.width, h: rect.height },
  );
  const actionRef = useRef<ActiveListeners | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    imageScaleRef.current = imageScale;
  }, [imageScale]);

  useEffect(() => {
    imageOffsetRef.current = imageOffset;
  }, [imageOffset]);

  useEffect(() => {
    imageBoxRef.current = imageBox ?? {
      x: 0,
      y: 0,
      w: rect.width,
      h: rect.height,
    };
  }, [imageBox, rect.width, rect.height]);

  useEffect(() => {
    setEditingText(text);
  }, [text]);

  useEffect(() => {
    if (isTextEditing && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [isTextEditing]);

  useEffect(() => {
    return () => {
      const action = actionRef.current;
      if (!action) return;
      window.removeEventListener("pointermove", action.moveListener);
      window.removeEventListener("pointerup", action.upListener);
      actionRef.current = null;
    };
  }, []);

  const clampImageScale = (value: number) => Math.min(3, Math.max(0.5, value));

  const startAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    type:
      | "drag"
      | "resize"
      | "imageScale"
      | "imageMove"
      | "imageBoxResize"
      | "imageBoxMove",
    handle?: ResizeHandle,
  ) => {
    if (locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const shouldResetSelection =
      isSelected && !event.shiftKey && selectionCount > 1;
    if (!isSelected || event.shiftKey || shouldResetSelection) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    const startOffset = imageOffsetRef.current;
    const startImageBox = imageBoxRef.current;

    let hasMoved = false;
    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();

      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (!hasMoved) {
        hasMoved = true;
        if (type === "drag" || type === "resize") {
          onDragStateChange?.(true, rectRef.current, { type });
        }
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
          const scaleX = nextW / startBox.w;
          const scaleY = nextH / startBox.h;
          const scale = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY;
          nextW = startBox.w * scale;
          nextH = startBox.h * scale;
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

      if (!handle) return;

      let nextX = startRect.x;
      let nextY = startRect.y;
      let nextWidth = startRect.width;
      let nextHeight = startRect.height;

      // Shift 키를 눌렀고 모서리 핸들인 경우 비율 유지
      const isCornerHandle = handle.length === 2;
      const isShiftPressed = moveEvent.shiftKey;
      const aspectRatio = startRect.width / startRect.height;

      if (isShiftPressed && isCornerHandle) {
        // 비율을 유지하면서 크기 조절
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

        // 더 큰 변화량을 기준으로 비율 유지
        const widthChange = Math.abs(nextWidth - startRect.width);
        const heightChange = Math.abs(nextHeight - startRect.height);

        if (widthChange > heightChange) {
          nextHeight = nextWidth / aspectRatio;
        } else {
          nextWidth = nextHeight * aspectRatio;
        }

        // 위치 조정
        if (handle.includes("w")) {
          nextX = startRect.x + startRect.width - nextWidth;
        }
        if (handle.includes("n")) {
          nextY = startRect.y + startRect.height - nextHeight;
        }
      } else {
        // 기존 로직: 비율 유지 없이 자유롭게 조절
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
        if (isShiftPressed && isCornerHandle) {
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
        if (isShiftPressed && isCornerHandle) {
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
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      actionRef.current = null;
      if (hasMoved) {
        if (type === "drag" || type === "resize") {
          onDragStateChange?.(false, rectRef.current, { type });
        }
      }
    };

    actionRef.current = { moveListener, upListener };
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const handleSize = 10;
  const halfHandle = handleSize / 2;

  const renderHandle = (handle: ResizeHandle, cursor: string) => {
    const position =
      handle === "nw"
        ? { left: -halfHandle, top: -halfHandle }
        : handle === "ne"
          ? { right: -halfHandle, top: -halfHandle }
          : handle === "sw"
            ? { left: -halfHandle, bottom: -halfHandle }
            : handle === "se"
              ? { right: -halfHandle, bottom: -halfHandle }
              : handle === "n"
                ? {
                    left: "50%",
                    top: -halfHandle,
                    transform: "translateX(-50%)",
                  }
                : handle === "s"
                  ? {
                      left: "50%",
                      bottom: -halfHandle,
                      transform: "translateX(-50%)",
                    }
                  : handle === "e"
                    ? {
                        right: -halfHandle,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }
                    : {
                        left: -halfHandle,
                        top: "50%",
                        transform: "translateY(-50%)",
                      };

    return (
      <div
        key={handle}
        onPointerDown={(event) => {
          startAction(event, "resize", handle);
        }}
        data-capture-handle="true"
        className="absolute rounded-sm border bg-white-100"
        style={{
          width: handleSize,
          height: handleSize,
          cursor,
          borderColor: selectionColor,
          ...position,
        }}
      />
    );
  };

  const renderImageHandle = (
    handle: ImageHandle,
    cursor: string,
    box: { x: number; y: number; w: number; h: number },
  ) => {
    const position =
      handle === "nw"
        ? { left: box.x - halfHandle, top: box.y - halfHandle }
        : handle === "ne"
          ? { left: box.x + box.w - halfHandle, top: box.y - halfHandle }
          : handle === "sw"
            ? { left: box.x - halfHandle, top: box.y + box.h - halfHandle }
            : handle === "se"
              ? {
                  left: box.x + box.w - halfHandle,
                  top: box.y + box.h - halfHandle,
                }
              : handle === "n"
                ? {
                    left: box.x + box.w / 2 - halfHandle,
                    top: box.y - halfHandle,
                  }
                : handle === "s"
                  ? {
                      left: box.x + box.w / 2 - halfHandle,
                      top: box.y + box.h - halfHandle,
                    }
                  : handle === "e"
                    ? {
                        left: box.x + box.w - halfHandle,
                        top: box.y + box.h / 2 - halfHandle,
                      }
                    : {
                        left: box.x - halfHandle,
                        top: box.y + box.h / 2 - halfHandle,
                      };

    return (
      <div
        key={`img-${handle}`}
        onPointerDown={(event) => {
          event.stopPropagation();
          startAction(event, "imageBoxResize", handle);
        }}
        data-image-handle="true"
        data-capture-handle="true"
        className="absolute rounded-sm border bg-white-100"
        style={{
          width: handleSize,
          height: handleSize,
          cursor,
          borderColor: selectionColor,
          ...position,
        }}
      />
    );
  };

  const isActive = isSelected;
  const showOutline = !locked && (isHovered || isActive);
  const selectionColor = "var(--primary)";
  const borderStyle = border?.style ?? "solid";
  const isImageFill = fill.startsWith("url(") || fill.startsWith("data:");

  // Transform 툴바 표시 조건: 선택됨, 잠금 아님, 이미지/텍스트 편집 중 아님
  const showTransformToolbar =
    isActive &&
    !locked &&
    !isImageEditing &&
    !isTextEditing &&
    onFlipX &&
    onFlipY &&
    onRotateCW &&
    onRotateCCW;

  // 회전 핸들 표시 조건
  const showRotateHandle =
    isActive &&
    !locked &&
    !isImageEditing &&
    !isTextEditing &&
    !!onRotationChange;

  const handleRotatePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onRotationChange) return;
    event.stopPropagation();
    event.preventDefault();
    const box = boxRef.current;
    if (!box) return;

    setIsRotating(true);

    const boxRect = box.getBoundingClientRect();
    const centerX = boxRect.left + boxRect.width / 2;
    const centerY = boxRect.top + boxRect.height / 2;

    const currentRotation = transform?.rotation ?? 0;
    const startAngleRad = Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX,
    );

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentAngleRad = Math.atan2(
        moveEvent.clientY - centerY,
        moveEvent.clientX - centerX,
      );
      const deltaRad = currentAngleRad - startAngleRad;
      const deltaDeg = (deltaRad * 180) / Math.PI;
      const newRotation = Math.round((currentRotation + deltaDeg + 360) % 360);
      onRotationChange(newRotation);
    };

    const onPointerUp = () => {
      setIsRotating(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // 요소 전체 transform 스타일 계산 (최상위 div에 적용)
  const elementTransformStyle = (() => {
    const transforms: string[] = [];
    if (transform?.rotation)
      transforms.push(`rotate(${transform.rotation}deg)`);
    if (transform?.flipX) transforms.push("scaleX(-1)");
    if (transform?.flipY) transforms.push("scaleY(-1)");
    return transforms.length > 0 ? transforms.join(" ") : undefined;
  })();
  const backgroundStyle: CSSProperties = isImageFill
    ? {}
    : { backgroundColor: fill };
  const imageSrc = isImageFill
    ? fill.startsWith("url(")
      ? fill.slice(4, -1).replace(/(^['"]|['"]$)/g, "")
      : fill
    : "";
  const showResizeHandles =
    !locked &&
    (isHovered || isActive) &&
    !isImageEditing &&
    selectionCount <= 1;
  const showImageHandles =
    isImageFill &&
    !locked &&
    isActive &&
    isImageEditing &&
    onImageBoxChange &&
    selectionCount <= 1;
  const imageCenterThreshold = 2;
  const renderImageBox = imageBox ?? {
    x: 0,
    y: 0,
    w: rect.width,
    h: rect.height,
  };
  const showImageOverflow = isImageFill && isImageEditing;
  const imageOverflowOpacity = 0.35;
  const showImageCenterX =
    isImageEditing &&
    isImageFill &&
    Math.abs(renderImageBox.x + renderImageBox.w / 2 - rect.width / 2) <=
      imageCenterThreshold;
  const showImageCenterY =
    isImageEditing &&
    isImageFill &&
    Math.abs(renderImageBox.y + renderImageBox.h / 2 - rect.height / 2) <=
      imageCenterThreshold;

  return (
    <div
      ref={boxRef}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (isTextEditing) {
          return;
        }
        if (isImageEditing) {
          const target = event.target as HTMLElement;
          if (target.closest('[data-image-handle="true"]')) {
            return;
          }
          setIsImageEditing(false);
          return;
        }
        startAction(event, "drag");
      }}
      onDoubleClick={(event) => {
        if (locked || !isSelected) return;
        if (isImageFill) return;
        const target = event.target as HTMLElement;
        if (target.closest('[data-capture-handle="true"]')) return;
        if (!isTextEditing && isSelected) {
          event.stopPropagation();
          setIsTextEditing(true);
        }
      }}
      onContextMenu={onContextMenu}
      onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
        if (locked || !onImageDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
        if (locked || !onImageDrop) return;
        event.preventDefault();
        event.stopPropagation();
        const imageUrl =
          event.dataTransfer.getData("application/x-muru-image") ||
          event.dataTransfer.getData("text/plain");
        if (!imageUrl) return;
        onImageDrop(imageUrl);
      }}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className={`absolute select-none outline-2 ${className}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius,
        touchAction: "none",
        pointerEvents: selectable ? "auto" : "none",
        outlineColor: showOutline ? selectionColor : "transparent",
        border: border?.enabled
          ? `${border.width}px ${borderStyle} ${border.color}`
          : "none",
        transform: elementTransformStyle,
        transformOrigin: "center center",
      }}
    >
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          showImageOverflow ? "overflow-visible" : "overflow-hidden"
        }`}
        style={{
          borderRadius,
          ...backgroundStyle,
        }}
        onDoubleClick={(event) => {
          if (!isImageFill) return;
          event.stopPropagation();
          onSelectChange?.(true);
          setIsImageEditing((prev) => !prev);
        }}
      >
        {isImageFill && (
          <>
            <div
              className="absolute"
              onPointerDown={
                isImageEditing
                  ? (event) => {
                      event.stopPropagation();
                      startAction(event, "imageBoxMove");
                    }
                  : undefined
              }
              style={{
                left: renderImageBox.x,
                top: renderImageBox.y,
                width: renderImageBox.w,
                height: renderImageBox.h,
                cursor: isImageEditing ? "move" : "default",
                opacity: showImageOverflow ? imageOverflowOpacity : 1,
              }}
            >
              <img
                src={imageSrc}
                alt=""
                className="h-full w-full select-none"
                style={{
                  objectFit: "fill",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
            </div>
            {showImageOverflow && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className="absolute"
                  style={{
                    left: renderImageBox.x,
                    top: renderImageBox.y,
                    width: renderImageBox.w,
                    height: renderImageBox.h,
                  }}
                >
                  <img
                    src={imageSrc}
                    alt=""
                    className="h-full w-full select-none"
                    style={{
                      objectFit: "fill",
                      pointerEvents: "none",
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {isImageFill && isImageEditing && (
          <div
            className="absolute rounded-md border"
            style={{
              left: renderImageBox.x + 2,
              top: renderImageBox.y + 2,
              width: renderImageBox.w - 4,
              height: renderImageBox.h - 4,
              pointerEvents: "none",
              borderColor: selectionColor,
            }}
          />
        )}
        {showImageCenterX && (
          <div
            className="absolute inset-y-2 left-1/2 w-px"
            style={{
              backgroundColor: selectionColor,
              transform: "translateX(-0.5px)",
              pointerEvents: "none",
            }}
          />
        )}
        {showImageCenterY && (
          <div
            className="absolute inset-x-2 top-1/2 h-px"
            style={{
              backgroundColor: selectionColor,
              transform: "translateY(-0.5px)",
              pointerEvents: "none",
            }}
          />
        )}
        {!isImageFill && text && !isTextEditing && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="text-center px-2"
              style={{
                fontSize: `${textStyle?.fontSize ?? 16}px`,
                fontWeight: textStyle?.fontWeight ?? "normal",
                fontFamily: textStyle?.fontFamily,
                color: textStyle?.color ?? "#000000",
                wordBreak: "break-word",
              }}
            >
              {text}
            </div>
          </div>
        )}
        {isTextEditing && (
          <input
            ref={textInputRef}
            type="text"
            value={editingText}
            onChange={(e) => {
              setEditingText(e.target.value);
            }}
            onBlur={() => {
              setIsTextEditing(false);
              onTextChange?.(editingText);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsTextEditing(false);
                onTextChange?.(editingText);
              } else if (e.key === "Escape") {
                setEditingText(text);
                setIsTextEditing(false);
              }
            }}
            className="absolute inset-0 bg-transparent text-center outline-none w-full px-2"
            style={{
              fontSize: `${textStyle?.fontSize ?? 16}px`,
              fontWeight: textStyle?.fontWeight ?? "normal",
              fontFamily: textStyle?.fontFamily,
              color: textStyle?.color ?? "#000000",
              caretColor: textStyle?.color ?? "#000000",
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          />
        )}
        {children}
      </div>
      {showResizeHandles && (
        <>
          {renderHandle("n", "ns-resize")}
          {renderHandle("s", "ns-resize")}
          {renderHandle("e", "ew-resize")}
          {renderHandle("w", "ew-resize")}
          {renderHandle("nw", "nwse-resize")}
          {renderHandle("ne", "nesw-resize")}
          {renderHandle("sw", "nesw-resize")}
          {renderHandle("se", "nwse-resize")}
        </>
      )}
      {showImageHandles && (
        <>
          {renderImageHandle("n", "ns-resize", renderImageBox)}
          {renderImageHandle("s", "ns-resize", renderImageBox)}
          {renderImageHandle("e", "ew-resize", renderImageBox)}
          {renderImageHandle("w", "ew-resize", renderImageBox)}
          {renderImageHandle("nw", "nwse-resize", renderImageBox)}
          {renderImageHandle("ne", "nesw-resize", renderImageBox)}
          {renderImageHandle("sw", "nesw-resize", renderImageBox)}
          {renderImageHandle("se", "nwse-resize", renderImageBox)}
        </>
      )}
      {/* 회전 중: 각도만 표시 */}
      {showInlineMetrics && isRotating && (
        <div
          className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
          style={{ pointerEvents: "none" }}
        >
          {transform?.rotation ?? 0}°
        </div>
      )}
      {/* 회전 중이 아닐 때: 가로/세로 표시 */}
      {showInlineMetrics && !isRotating && !locked && (isHovered || isActive) && (
        <div
          className="absolute left-1/2 top-full mt-1 w-32 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
          style={{ pointerEvents: "none" }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
      {/* 회전 중이 아닐 때: TransformToolbar를 하단에 표시 */}
      {!isRotating && showTransformToolbar && (
        <TransformToolbar
          onFlipX={onFlipX}
          onFlipY={onFlipY}
          onRotateCW={onRotateCW}
          onRotateCCW={onRotateCCW}
          showFlipX={false}
          showFlipY={false}
          showRotateCCW={false}
          showRotateCW={false}
          position="bottom"
        />
      )}
      {/* 회전 중이 아닐 때: 회전 핸들 하단에 표시 (TransformToolbar 아래) */}
      {!isRotating && showRotateHandle && (
        <>
          {/* 회전 핸들 연결선 */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "calc(100% + 60px)",
              width: 1,
              height: 20,
              backgroundColor: "var(--primary)",
              pointerEvents: "none",
            }}
          />
          {/* 회전 핸들 아이콘 */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full border-2 bg-white-100 cursor-grab active:cursor-grabbing z-50"
            style={{
              top: "calc(100% + 80px)",
              width: 20,
              height: 20,
              borderColor: "var(--primary)",
            }}
            onPointerDown={handleRotatePointerDown}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export default RoundBox;
