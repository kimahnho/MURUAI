/**
 * 라운드 박스 요소 전용 리사이즈 핸들을 렌더링하는 컴포넌트.
 */
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ResizeHandle } from "../../../../model/canvasTypes";

type ImageHandle = ResizeHandle;

const HANDLE_SIZE = 10;
const HALF_HANDLE = HANDLE_SIZE / 2;

interface HandleProps {
  handle: ResizeHandle;
  cursor: string;
  selectionColor: string;
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => void;
}

const getResizeHandlePosition = (handle: ResizeHandle) => {
  if (handle === "nw") return { left: -HALF_HANDLE, top: -HALF_HANDLE };
  if (handle === "ne") return { right: -HALF_HANDLE, top: -HALF_HANDLE };
  if (handle === "sw") return { left: -HALF_HANDLE, bottom: -HALF_HANDLE };
  if (handle === "se") return { right: -HALF_HANDLE, bottom: -HALF_HANDLE };
  if (handle === "n")
    return { left: "50%", top: -HALF_HANDLE, transform: "translateX(-50%)" };
  if (handle === "s")
    return {
      left: "50%",
      bottom: -HALF_HANDLE,
      transform: "translateX(-50%)",
    };
  if (handle === "e")
    return {
      right: -HALF_HANDLE,
      top: "50%",
      transform: "translateY(-50%)",
    };
  return { left: -HALF_HANDLE, top: "50%", transform: "translateY(-50%)" };
};

const ResizeHandleItem = ({
  handle,
  cursor,
  selectionColor,
  onPointerDown,
}: HandleProps) => (
  <div
    key={handle}
    onPointerDown={(event) => {
      onPointerDown(event, "resize", handle);
    }}
    data-capture-handle="true"
    className="absolute rounded-sm border bg-white-100"
    style={{
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      cursor,
      borderColor: selectionColor,
      ...getResizeHandlePosition(handle),
    }}
  />
);

interface ImageHandleProps {
  handle: ImageHandle;
  cursor: string;
  selectionColor: string;
  box: { x: number; y: number; w: number; h: number };
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => void;
}

const getImageHandlePosition = (
  handle: ImageHandle,
  box: { x: number; y: number; w: number; h: number },
) => {
  // 이미지 박스 핸들은 요소 외곽이 아니라 imageBox 좌표계를 기준으로 배치한다.
  if (handle === "nw")
    return { left: box.x - HALF_HANDLE, top: box.y - HALF_HANDLE };
  if (handle === "ne")
    return { left: box.x + box.w - HALF_HANDLE, top: box.y - HALF_HANDLE };
  if (handle === "sw")
    return { left: box.x - HALF_HANDLE, top: box.y + box.h - HALF_HANDLE };
  if (handle === "se")
    return {
      left: box.x + box.w - HALF_HANDLE,
      top: box.y + box.h - HALF_HANDLE,
    };
  if (handle === "n")
    return {
      left: box.x + box.w / 2 - HALF_HANDLE,
      top: box.y - HALF_HANDLE,
    };
  if (handle === "s")
    return {
      left: box.x + box.w / 2 - HALF_HANDLE,
      top: box.y + box.h - HALF_HANDLE,
    };
  if (handle === "e")
    return {
      left: box.x + box.w - HALF_HANDLE,
      top: box.y + box.h / 2 - HALF_HANDLE,
    };
  return {
    left: box.x - HALF_HANDLE,
    top: box.y + box.h / 2 - HALF_HANDLE,
  };
};

const ImageHandleItem = ({
  handle,
  cursor,
  selectionColor,
  box,
  onPointerDown,
}: ImageHandleProps) => (
  <div
    key={`img-${handle}`}
    onPointerDown={(event) => {
      // 이미지 박스 핸들 드래그는 박스 이동 드래그와 분리하기 위해 이벤트 전파를 끊는다.
      event.stopPropagation();
      onPointerDown(event, "imageBoxResize", handle);
    }}
    data-image-handle="true"
    data-capture-handle="true"
    className="absolute rounded-sm border bg-white-100"
    style={{
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      cursor,
      borderColor: selectionColor,
      ...getImageHandlePosition(handle, box),
    }}
  />
);

const HANDLES: Array<{ handle: ResizeHandle; cursor: string }> = [
  { handle: "n", cursor: "ns-resize" },
  { handle: "s", cursor: "ns-resize" },
  { handle: "e", cursor: "ew-resize" },
  { handle: "w", cursor: "ew-resize" },
  { handle: "nw", cursor: "nwse-resize" },
  { handle: "ne", cursor: "nesw-resize" },
  { handle: "sw", cursor: "nesw-resize" },
  { handle: "se", cursor: "nwse-resize" },
];

interface ResizeHandlesProps {
  selectionColor: string;
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => void;
}

export const ResizeHandles = ({
  selectionColor,
  onPointerDown,
}: ResizeHandlesProps) => (
  <>
    {HANDLES.map(({ handle, cursor }) => (
      <ResizeHandleItem
        key={handle}
        handle={handle}
        cursor={cursor}
        selectionColor={selectionColor}
        onPointerDown={onPointerDown}
      />
    ))}
  </>
);

interface ImageHandlesProps {
  selectionColor: string;
  box: { x: number; y: number; w: number; h: number };
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => void;
}

export const ImageHandles = ({
  selectionColor,
  box,
  onPointerDown,
}: ImageHandlesProps) => (
  <>
    {HANDLES.map(({ handle, cursor }) => (
      <ImageHandleItem
        key={handle}
        handle={handle}
        cursor={cursor}
        selectionColor={selectionColor}
        box={box}
        onPointerDown={onPointerDown}
      />
    ))}
  </>
);

// ─── 크롭 핸들 (요소 외곽 기준, 채움 스타일) ───

const CropHandleItem = ({
  handle,
  cursor,
  selectionColor,
  onPointerDown,
}: HandleProps) => (
  <div
    key={`crop-${handle}`}
    onPointerDown={(event) => {
      event.stopPropagation();
      onPointerDown(event, "cropResize" as "resize", handle);
    }}
    data-capture-handle="true"
    className="absolute rounded-sm"
    style={{
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      cursor,
      backgroundColor: selectionColor,
      ...getResizeHandlePosition(handle),
    }}
  />
);

interface CropHandlesProps {
  selectionColor: string;
  onPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "resize" | "imageBoxResize",
    handle: ResizeHandle,
  ) => void;
}

export const CropHandles = ({
  selectionColor,
  onPointerDown,
}: CropHandlesProps) => (
  <>
    {HANDLES.map(({ handle, cursor }) => (
      <CropHandleItem
        key={handle}
        handle={handle}
        cursor={cursor}
        selectionColor={selectionColor}
        onPointerDown={onPointerDown}
      />
    ))}
  </>
);
