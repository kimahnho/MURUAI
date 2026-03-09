/**
 * 라운드 박스 요소를 렌더링하고 선택/드래그/변형 상호작용을 연결하는 컴포넌트.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import type { Rect, ResizeHandle } from "../../../../model/canvasTypes";
import TransformToolbar from "../TransformToolbar";
import { useRoundBoxInteraction } from "./useRoundBoxInteraction";
import { ResizeHandles, ImageHandles } from "./ResizeHandles";
import { usePointerDragSession } from "../../hooks/usePointerDragSession";

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
  const { startPointerDragSession } = usePointerDragSession();

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

  const { startAction, cleanup } = useRoundBoxInteraction({
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
  });

  useEffect(() => {
    return cleanup;
  }, []);

  const isActive = isSelected;
  const showOutline = !locked && (isHovered || isActive);
  const selectionColor = "var(--primary)";
  const borderStyle = border?.style ?? "solid";
  // 이미지 편집 모드에서는 border를 제거하므로 오프셋도 0으로 처리한다.
  const bw = !isImageEditing && border?.enabled ? (border.width ?? 0) : 0;
  const isImageFill = fill.startsWith("url(") || fill.startsWith("data:");

  const showTransformToolbar =
    isActive &&
    !locked &&
    !isImageEditing &&
    !isTextEditing &&
    onFlipX &&
    onFlipY &&
    onRotateCW &&
    onRotateCCW;

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

    startPointerDragSession({
      thresholdPx: 0,
      startContext: undefined,
      createMoveContext: (moveEvent) => ({
        distance: 0,
        context: moveEvent,
      }),
      onMove: (moveEvent) => {
        const currentAngleRad = Math.atan2(
          moveEvent.clientY - centerY,
          moveEvent.clientX - centerX,
        );
        const deltaRad = currentAngleRad - startAngleRad;
        const deltaDeg = (deltaRad * 180) / Math.PI;
        // 누적 회전값은 0~359 범위로 정규화해 툴바/배지 표시를 일관되게 유지한다.
        const newRotation = Math.round((currentRotation + deltaDeg + 360) % 360);
        onRotationChange(newRotation);
      },
      onEnd: () => {
        setIsRotating(false);
      },
    });
  };

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

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => {
    startAction(event, type, handle);
  };

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
          // 이미지 편집 중 빈 영역 클릭은 편집 모드 종료로 해석해 일반 드래그와 충돌을 막는다.
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
        // 이미지 편집 모드에서는 border를 제거해 clip 없이 이미지가 프레임 밖으로 보이도록 한다.
        border: isImageEditing
          ? "none"
          : border?.enabled
            ? `${border.width}px ${borderStyle} ${border.color}`
            : "none",
        overflow: "visible",
        transform: elementTransformStyle,
        transformOrigin: "center center",
      }}
    >
      <div
        className={`absolute flex items-center justify-center ${
          showImageOverflow ? "overflow-visible" : "overflow-hidden"
        }`}
        style={{
          top: -bw,
          left: -bw,
          right: -bw,
          bottom: -bw,
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
              // 편집 중에는 원본 이미지 영역을 반투명으로 보여 crop 기준을 직관적으로 확인시킨다.
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
        <ResizeHandles
          selectionColor={selectionColor}
          onPointerDown={handleResizePointerDown}
        />
      )}
      {showImageHandles && (
        <ImageHandles
          selectionColor={selectionColor}
          box={renderImageBox}
          onPointerDown={handleResizePointerDown}
        />
      )}
      {showInlineMetrics && isRotating && (
        <div
          className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
          style={{ pointerEvents: "none" }}
        >
          {transform?.rotation ?? 0}°
        </div>
      )}
      {showInlineMetrics && !isRotating && !locked && (isHovered || isActive) && (
        <div
          className="absolute left-1/2 top-full mt-1 w-32 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
          style={{ pointerEvents: "none" }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
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
      {!isRotating && showRotateHandle && (
        <>
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
