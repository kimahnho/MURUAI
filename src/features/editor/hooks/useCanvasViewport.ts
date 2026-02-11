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
  const canvasZoomData = useCanvasZoom({
    zoom,
    pageId: selectedPageId,
    containerRef,
    orientation: activeOrientation,
  });

  useCanvasWheelZoom({ containerRef, setZoom });

  return canvasZoomData;
};
