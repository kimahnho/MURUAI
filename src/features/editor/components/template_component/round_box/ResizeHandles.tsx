import type { PointerEvent as ReactPointerEvent } from "react";
import type { ResizeHandle } from "../../../model/canvasTypes";

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
