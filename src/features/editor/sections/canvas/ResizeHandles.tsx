/**
 * 선택 요소 외곽의 리사이즈 핸들을 렌더링하고 방향별 드래그 진입점을 제공하는 컴포넌트.
 */
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

export const ResizeHandles = ({
  onResizeStart,
  selectionColor = "var(--primary)",
  handleSize = 10,
}: ResizeHandlesProps) => {
  // 핸들 크기 기준 좌표를 미리 계산해 각 방향 핸들 배치를 동일 규칙으로 유지한다.
  const halfHandle = handleSize / 2;

  return (
    <>
      {HANDLE_CONFIGS.map(({ handle, cursor, position }) => (
        <div
          key={handle}
          // 리사이즈 시작점은 handle 타입만 전달하고 실제 크기 계산은 상위 인터랙션 훅에서 처리한다.
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
