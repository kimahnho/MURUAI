import type { PointerEvent as ReactPointerEvent } from "react";
import type { ResizeHandle } from "../../model/canvasTypes";

interface ResizeHandlesProps {
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>, handle: ResizeHandle) => void;
  selectionColor?: string;
  handleSize?: number;
}

const HANDLE_CONFIGS: Array<{
  handle: ResizeHandle;
  cursor: string;
  position: (halfHandle: number) => React.CSSProperties;
}> = [
  {
    handle: "nw",
    cursor: "nwse-resize",
    position: (h) => ({ left: -h, top: -h }),
  },
  {
    handle: "ne",
    cursor: "nesw-resize",
    position: (h) => ({ right: -h, top: -h }),
  },
  {
    handle: "sw",
    cursor: "nesw-resize",
    position: (h) => ({ left: -h, bottom: -h }),
  },
  {
    handle: "se",
    cursor: "nwse-resize",
    position: (h) => ({ right: -h, bottom: -h }),
  },
  {
    handle: "n",
    cursor: "ns-resize",
    position: (h) => ({ left: "50%", top: -h, transform: "translateX(-50%)" }),
  },
  {
    handle: "s",
    cursor: "ns-resize",
    position: (h) => ({ left: "50%", bottom: -h, transform: "translateX(-50%)" }),
  },
  {
    handle: "e",
    cursor: "ew-resize",
    position: (h) => ({ right: -h, top: "50%", transform: "translateY(-50%)" }),
  },
  {
    handle: "w",
    cursor: "ew-resize",
    position: (h) => ({ left: -h, top: "50%", transform: "translateY(-50%)" }),
  },
];

/**
 * 리사이즈 핸들 컴포넌트
 * 8방향(n, s, e, w, nw, ne, sw, se) 핸들을 렌더링
 */
export const ResizeHandles = ({
  onResizeStart,
  selectionColor = "var(--primary)",
  handleSize = 10,
}: ResizeHandlesProps) => {
  const halfHandle = handleSize / 2;

  return (
    <>
      {HANDLE_CONFIGS.map(({ handle, cursor, position }) => (
        <div
          key={handle}
          onPointerDown={(event) => { onResizeStart(event, handle); }}
          data-capture-handle="true"
          className="absolute rounded-sm border bg-white-100"
          style={{
            width: handleSize,
            height: handleSize,
            cursor,
            borderColor: selectionColor,
            ...position(halfHandle),
          }}
        />
      ))}
    </>
  );
};
