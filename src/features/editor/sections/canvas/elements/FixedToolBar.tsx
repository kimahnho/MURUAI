/**
 * 요소 고정 툴바의 버튼 그룹을 배치하고 액션 실행을 연결하는 컴포넌트.
 */
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import type { CSSProperties } from "react";

interface FixedToolBarProps {
  isVisible: boolean;
  children: ReactNode;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const FixedToolBar = ({
  isVisible,
  children,
  onPointerDown,
}: FixedToolBarProps) => {
  if (!isVisible) return null;

  const style: CSSProperties = {
    left: "50%",
    top: -60,
    transform: "translateX(-50%)",
  };

  return (
    <div
      data-capture-hide="true"
      className="absolute z-50 flex flex-nowrap items-center gap-2 rounded-lg border border-black-30 bg-white-100 px-3 py-2 shadow-md whitespace-nowrap"
      style={style}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  );
};

export default FixedToolBar;
