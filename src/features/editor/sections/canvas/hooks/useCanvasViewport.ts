/**
 * 캔버스 뷰포트 크기와 스크롤 기준 상태를 계산하는 훅.
 */
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCanvasZoom } from "./useCanvasZoom";
import { useCanvasWheelZoom } from "./useCanvasWheelZoom";

type CanvasViewportParams = {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  selectedPageId: string;
  activeOrientation: "horizontal" | "vertical";
  containerRef: RefObject<HTMLDivElement | null>;
};

export const useCanvasViewport = ({
  zoom,
  setZoom,
  selectedPageId,
  activeOrientation,
  containerRef,
}: CanvasViewportParams) => {
  // 페이지/방향 변경 시 기준 rect를 다시 계산해 줌 중심점 기준이 흔들리지 않게 유지한다.
  const canvasZoomData = useCanvasZoom({
    zoom,
    pageId: selectedPageId,
    containerRef,
    orientation: activeOrientation,
  });

  // Ctrl/Cmd+휠 확대/축소를 전역 스크롤과 분리해 캔버스 컨테이너 기준으로 처리한다.
  useCanvasWheelZoom({ containerRef, setZoom });

  return canvasZoomData;
};
