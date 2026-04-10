/**
 * AI 편집 모드에서 이미지 위 사각형/자유 올가미 선택 영역을 관리하는 훅.
 * SVG 좌표계(요소 내부 픽셀)로 작동하며, 마스크 빌드 시 원본 해상도로 역변환한다.
 */
import { useState, useRef } from "react";

export type AiEditTool = "rect" | "lasso";

const MIN_SELECTION_SIZE = 10;
// UI 표시용 색상 (화면에만 사용)
const OVERLAY_COLOR = "rgba(239, 68, 68, 0.25)";
const STROKE_COLOR = "#EF4444";
// Gemini 전송용 — fill 없이 테두리만 (마스크 색상이 AI 결과에 남지 않도록)
const MASK_STROKE_COLOR = "#FF0000";

interface UseAiEditInteractionOptions {
  /** 요소 표시 너비(px) — SVG 좌표계와 동일 */
  elementW: number;
  /** 요소 표시 높이(px) */
  elementH: number;
}

export const useAiEditInteraction = ({
  elementW,
  elementH,
}: UseAiEditInteractionOptions) => {
  const [tool, setToolState] = useState<AiEditTool>("rect");
  // SVG 좌표 내 상태 (요소 내부 픽셀 단위)
  const [rectPreview, setRectPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [hasSelection, setHasSelection] = useState(false);

  const isDrawingRef = useRef(false);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const committedRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const committedLassoRef = useRef<Array<{ x: number; y: number }>>([]);

  /** SVG 요소 내 포인터 좌표를 요소 경계 안으로 클램핑 */
  const getSvgPos = (e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = elementW / rect.width;
    const scaleY = elementH / rect.height;
    return {
      x: Math.max(0, Math.min(elementW, (e.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(elementH, (e.clientY - rect.top) * scaleY)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getSvgPos(e);
    isDrawingRef.current = true;
    setHasSelection(false);
    committedRectRef.current = null;
    committedLassoRef.current = [];
    if (tool === "rect") {
      rectStartRef.current = pos;
      setRectPreview(null);
    } else {
      setLassoPoints([pos]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getSvgPos(e);
    if (tool === "rect" && rectStartRef.current) {
      const start = rectStartRef.current;
      setRectPreview({
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x),
        h: Math.abs(pos.y - start.y),
      });
    } else if (tool === "lasso") {
      setLassoPoints((prev) => [...prev, pos]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const pos = getSvgPos(e);

    if (tool === "rect" && rectStartRef.current) {
      const start = rectStartRef.current;
      const w = Math.abs(pos.x - start.x);
      const h = Math.abs(pos.y - start.y);
      if (w < MIN_SELECTION_SIZE || h < MIN_SELECTION_SIZE) {
        // 너무 작은 선택 무시
        setRectPreview(null);
        rectStartRef.current = null;
        return;
      }
      const committed = {
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w,
        h,
      };
      committedRectRef.current = committed;
      setRectPreview(committed);
      setHasSelection(true);
      rectStartRef.current = null;
    } else if (tool === "lasso") {
      const points = lassoPoints;
      if (points.length > 2) {
        committedLassoRef.current = [...points, pos];
        setLassoPoints((prev) => [...prev, pos]);
        setHasSelection(true);
      }
    }
  };

  const reset = () => {
    isDrawingRef.current = false;
    rectStartRef.current = null;
    committedRectRef.current = null;
    committedLassoRef.current = [];
    setRectPreview(null);
    setLassoPoints([]);
    setHasSelection(false);
  };

  const setTool = (t: AiEditTool) => {
    setToolState(t);
    reset();
  };

  /** SVG 위에 그릴 선택 영역 JSX */
  const svgSelectionJsx = (() => {
    if (tool === "rect" && rectPreview) {
      return (
        <rect
          x={rectPreview.x}
          y={rectPreview.y}
          width={rectPreview.w}
          height={rectPreview.h}
          fill={OVERLAY_COLOR}
          stroke={STROKE_COLOR}
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      );
    }
    if (tool === "lasso" && lassoPoints.length > 1) {
      const pts = lassoPoints.map((p) => `${p.x},${p.y}`).join(" ");
      return (
        <polygon
          points={pts}
          fill={OVERLAY_COLOR}
          stroke={STROKE_COLOR}
          strokeWidth={2}
          strokeDasharray="4 4"
          fillRule="evenodd"
        />
      );
    }
    return null;
  })();

  const pointerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerUp,
  };

  /**
   * 원본 이미지 URL → WebP 무손실 base64.
   * 투명 PNG는 흰색 배경으로 합성 후 WebP 출력. 선택 영역이 없을 때 사용.
   */
  const fetchOriginalBase64 = async (imageUrl: string): Promise<string> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지 로드 실패"));
      el.src = imageUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context 없음");
    // 투명 PNG 대응 — 흰색 배경
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/webp", 1.0).split(",")[1];
  };

  /**
   * 원본 해상도 캔버스에 이미지를 그리고, SVG 좌표를 원본 해상도로 역변환해 마스크를 덮어 base64를 반환한다.
   * 화면 표시 크기(elementW, elementH) → 원본 이미지 크기 비율로 좌표를 변환한다.
   */
  const buildMaskedBase64 = async (imageUrl: string): Promise<string> => {
    // 원본 이미지 로드
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지 로드 실패"));
      el.src = imageUrl;
    });

    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    // 화면 좌표 → 원본 해상도 좌표 스케일 인자
    const scaleX = origW / elementW;
    const scaleY = origH / elementH;

    const canvas = document.createElement("canvas");
    canvas.width = origW;
    canvas.height = origH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context 없음");

    // 투명 PNG일 때 검은 배경이 되지 않도록 흰색 배경을 먼저 깔기
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, origW, origH);
    // 원본 해상도로 이미지 그리기
    ctx.drawImage(img, 0, 0);

    // 선택 영역을 원본 해상도 좌표로 변환 — 테두리만 (fill 없음, AI 결과에 마스크 잔상 방지)
    const strokeW = 3 * Math.max(scaleX, scaleY);
    if (tool === "rect" && committedRectRef.current) {
      const r = committedRectRef.current;
      ctx.strokeStyle = MASK_STROKE_COLOR;
      ctx.lineWidth = strokeW;
      ctx.strokeRect(r.x * scaleX, r.y * scaleY, r.w * scaleX, r.h * scaleY);
    } else if (tool === "lasso" && committedLassoRef.current.length > 2) {
      const points = committedLassoRef.current;
      ctx.beginPath();
      ctx.moveTo(points[0].x * scaleX, points[0].y * scaleY);
      for (const p of points) ctx.lineTo(p.x * scaleX, p.y * scaleY);
      ctx.closePath();
      ctx.strokeStyle = MASK_STROKE_COLOR;
      ctx.lineWidth = strokeW;
      ctx.stroke();
    }

    // WebP 무손실 출력
    return canvas.toDataURL("image/webp", 1.0).split(",")[1];
  };

  return {
    tool,
    setTool,
    hasSelection,
    svgSelectionJsx,
    pointerHandlers,
    buildMaskedBase64,
    fetchOriginalBase64,
    reset,
  };
};
