/**
 * 줌 인/아웃/초기화 동작과 현재 줌 상태를 관리하는 훅.
 */
import { useEffect, useRef } from "react";

const A4_WIDTH = 210 * 3.7795;
const A4_HEIGHT = 297 * 3.7795;
const PADDING = 50;

interface UseCanvasZoomProps {
  zoom: number;
  pageId?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  orientation?: "horizontal" | "vertical";
}

const drawA4Paper = (
  ctx: CanvasRenderingContext2D,
  scale: number,
  width: number,
  height: number
) => {
  ctx.save();
  ctx.translate(PADDING, PADDING);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(0, 0, width, height);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.restore();
};

const updateScrollPosition = (
  container: HTMLDivElement,
  prevZoom: number,
  newZoom: number
) => {
  const { scrollLeft, scrollTop, clientWidth, clientHeight } = container;
  const centerX = scrollLeft + clientWidth / 2;
  const centerY = scrollTop + clientHeight / 2;
  const zoomRatio = newZoom / prevZoom;

  requestAnimationFrame(() => {
    container.scrollLeft = centerX * zoomRatio - clientWidth / 2;
    container.scrollTop = centerY * zoomRatio - clientHeight / 2;
  });
};

export const useCanvasZoom = ({ zoom, pageId, containerRef, orientation = "vertical" }: UseCanvasZoomProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 줌 변경 시 현재 화면 중심이 유지되도록 스크롤 위치를 함께 보정한다.
    const container = containerRef?.current;
    if (container && prevZoomRef.current !== zoom) {
      updateScrollPosition(container, prevZoomRef.current, zoom);
      prevZoomRef.current = zoom;
    }

    const paperWidth = orientation === "horizontal" ? A4_HEIGHT : A4_WIDTH;
    const paperHeight = orientation === "horizontal" ? A4_WIDTH : A4_HEIGHT;

    const scale = zoom / 100;
    const canvasWidth = paperWidth * scale + PADDING * 2;
    const canvasHeight = paperHeight * scale + PADDING * 2;

    // 스타일 픽셀과 실제 픽셀을 분리해 고해상도 화면에서도 선명도를 유지한다.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawA4Paper(ctx, scale, paperWidth, paperHeight);
  }, [zoom, pageId, containerRef, orientation]);

  const paperWidth = orientation === "horizontal" ? A4_HEIGHT : A4_WIDTH;
  const paperHeight = orientation === "horizontal" ? A4_WIDTH : A4_HEIGHT;

  const scale = zoom / 100;
  const canvasWidth = paperWidth * scale + PADDING * 2;
  const canvasHeight = paperHeight * scale + PADDING * 2;

  return {
    canvasRef,
    scale,
    padding: PADDING,
    paperWidth,
    paperHeight,
    canvasWidth,
    canvasHeight,
  };
};
