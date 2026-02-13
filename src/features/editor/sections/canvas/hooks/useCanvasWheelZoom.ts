import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

type CanvasWheelZoomParams = {
  containerRef: RefObject<HTMLDivElement | null>;
  setZoom: Dispatch<SetStateAction<number>>;
};

export const useCanvasWheelZoom = ({
  containerRef,
  setZoom,
}: CanvasWheelZoomParams) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -10 : 10;
      setZoom((prev) => Math.min(200, Math.max(10, prev + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef, setZoom]);
};
