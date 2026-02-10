import { useEffect, useRef } from "react";

// A4 용지 크기 (mm to px, 1mm ≈ 3.7795px at 96 DPI)
const A4_WIDTH = 210 * 3.7795; // ~794px
const A4_HEIGHT = 297 * 3.7795; // ~1123px
const PADDING = 50; // 상하좌우 여백

interface UseCanvasZoomProps {
  zoom: number;
  pageId?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  orientation?: "horizontal" | "vertical";
}

// Canvas에 A4 용지 배경 그리기
const drawA4Paper = (
  ctx: CanvasRenderingContext2D,
  scale: number,
  width: number,
  height: number
) => {
  ctx.save();
  ctx.translate(PADDING, PADDING);
  ctx.scale(scale, scale);

  // 배경
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(0, 0, width, height);

  // 테두리
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.restore();
};

// 줌 변경 시 중앙 유지를 위한 스크롤 위치 업데이트
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

    // 줌 변경 시 스크롤 위치 업데이트
    const container = containerRef?.current;
    if (container && prevZoomRef.current !== zoom) {
      updateScrollPosition(container, prevZoomRef.current, zoom);
      prevZoomRef.current = zoom;
    }

    // orientation에 따라 width와 height 결정
    const paperWidth = orientation === "horizontal" ? A4_HEIGHT : A4_WIDTH;
    const paperHeight = orientation === "horizontal" ? A4_WIDTH : A4_HEIGHT;

    // Canvas 크기 계산
    const scale = zoom / 100;
    const canvasWidth = paperWidth * scale + PADDING * 2;
    const canvasHeight = paperHeight * scale + PADDING * 2;

    // Canvas 해상도 설정 (Retina 지원)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Canvas 렌더링
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawA4Paper(ctx, scale, paperWidth, paperHeight);
  }, [zoom, pageId, containerRef, orientation]);

  // orientation에 따라 width와 height 반환
  const paperWidth = orientation === "horizontal" ? A4_HEIGHT : A4_WIDTH;
  const paperHeight = orientation === "horizontal" ? A4_WIDTH : A4_HEIGHT;

  return {
    canvasRef,
    scale: zoom / 100,
    padding: PADDING,
    paperWidth,
    paperHeight,
  };
};
