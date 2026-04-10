/**
 * AI 이미지 편집 모달 — 사각형/자유 올가미로 영역 선택 + 프롬프트로 편집.
 * 좌우 고정 레이아웃: 이미지 영역(좌) + 프롬프트 패널(우).
 * 가로/세로 이미지 모두 동일한 컨테이너 안에서 aspect-ratio 유지 축소.
 */
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { Square, Lasso, RotateCcw, ImageOff } from "lucide-react";
import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";
import Spinner from "@/shared/ui/Spinner";
import Textarea from "@/shared/ui/Textarea";
import useToastStore from "@/shared/store/useToastStore";
import { editImageWithAi } from "../../ai/editImageWithAi";
import { checkAiCredits, recordAiCreditUsage } from "../../utils/aiTemplateUsage";
import { useCreditModalStore } from "../../store/creditModalStore";
import { mp } from "@/shared/utils/mixpanel";

type Tool = "rect" | "lasso";

interface AiImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onApply: (newImageUrl: string) => void;
}

const OVERLAY_COLOR = "rgba(239, 68, 68, 0.25)";
const STROKE_COLOR = "#EF4444";
const MIN_SELECTION_SIZE = 10;

const AiImageEditModal = ({
  isOpen,
  onClose,
  imageUrl,
  onApply,
}: AiImageEditModalProps) => {
  const [tool, setTool] = useState<Tool>("rect");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasSelectionRef = useRef(false);
  const scaleRef = useRef(1);
  const mountedRef = useRef(true);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const lassoPointsRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPrompt("");
      setResultUrl(null);
      setTool("rect");
      setImageLoadError(false);
      setIsImageLoading(true);
      hasSelectionRef.current = false;
      isDrawingRef.current = false;
      lassoPointsRef.current = [];
      rectStartRef.current = null;
      lastRectRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setImageLoadError(false);
    setIsImageLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      if (mountedRef.current) setIsImageLoading(false);
      drawCanvas();
    };
    img.onerror = () => {
      if (mountedRef.current) {
        setImageLoadError(true);
        setIsImageLoading(false);
      }
    };
    img.src = imageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageUrl]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // 컨테이너 실제 크기에서 padding(16px×2) 빼고 사용 가능 영역 계산
    const maxW = container.clientWidth - 32;
    const maxH = container.clientHeight - 32;
    if (maxW <= 0 || maxH <= 0) return;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    scaleRef.current = scale;

    const displayW = img.width * scale;
    const displayH = img.height * scale;

    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, 0, 0, displayW, displayH);
  }, []);

  // 컨테이너 리사이즈 시 캔버스 재계산
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !imageRef.current) return;
    const ro = new ResizeObserver(() => drawCanvas());
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawCanvas, isImageLoading]);

  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const w = parseFloat(canvas.style.width || "0");
    const h = parseFloat(canvas.style.height || "0");
    return {
      x: Math.max(0, Math.min(w, rawX)),
      y: Math.max(0, Math.min(h, rawY)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    isDrawingRef.current = true;
    hasSelectionRef.current = false;
    setResultUrl(null);
    if (tool === "rect") {
      rectStartRef.current = pos;
    } else {
      lassoPointsRef.current = [pos];
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCanvas();

    if (tool === "rect" && rectStartRef.current) {
      const start = rectStartRef.current;
      ctx.fillStyle = OVERLAY_COLOR;
      ctx.fillRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
      ctx.setLineDash([]);
    } else {
      lassoPointsRef.current.push(pos);
      const points = lassoPointsRef.current;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2;
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (tool === "rect" && rectStartRef.current) {
      const pos = getCanvasPos(e);
      const rectStart = rectStartRef.current;
      const w = Math.abs(pos.x - rectStart.x);
      const h = Math.abs(pos.y - rectStart.y);
      if (w < MIN_SELECTION_SIZE && h < MIN_SELECTION_SIZE) {
        hasSelectionRef.current = false;
        rectStartRef.current = null;
        drawCanvas();
        return;
      }
      drawCanvas();
      ctx.fillStyle = OVERLAY_COLOR;
      ctx.fillRect(rectStart.x, rectStart.y, pos.x - rectStart.x, pos.y - rectStart.y);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(rectStart.x, rectStart.y, pos.x - rectStart.x, pos.y - rectStart.y);
      hasSelectionRef.current = true;
      lastRectRef.current = {
        x: Math.min(rectStart.x, pos.x),
        y: Math.min(rectStart.y, pos.y),
        w: Math.abs(pos.x - rectStart.x),
        h: Math.abs(pos.y - rectStart.y),
      };
      rectStartRef.current = null;
      return;
    }

    if (tool === "lasso" && lassoPointsRef.current.length > 2) {
      drawCanvas();
      const points = lassoPointsRef.current;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = OVERLAY_COLOR;
      ctx.fill();
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();
      hasSelectionRef.current = true;
    }
  };

  const handleReset = () => {
    lassoPointsRef.current = [];
    rectStartRef.current = null;
    lastRectRef.current = null;
    hasSelectionRef.current = false;
    isDrawingRef.current = false;
    drawCanvas();
  };

  /** 원본 이미지 URL → base64 (캔버스 없이, 무손실) */
  const fetchOriginalBase64 = async (): Promise<string> => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = () => reject(new Error("이미지 읽기 실패"));
      reader.readAsDataURL(blob);
    });
  };

  /** 원본 해상도 캔버스에 이미지 + 마스크 오버레이를 그려서 PNG base64 반환 */
  const buildMaskedBase64 = (): string | null => {
    const img = imageRef.current;
    if (!img) return null;
    const scale = scaleRef.current;
    if (scale <= 0) return null;
    const invScale = 1 / scale;

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = img.width;
    fullCanvas.height = img.height;
    const ctx = fullCanvas.getContext("2d");
    if (!ctx) return null;

    // 원본 해상도로 이미지 그리기
    ctx.drawImage(img, 0, 0);

    // 화면 좌표 → 원본 좌표로 역변환하여 마스크 그리기
    if (tool === "rect" && lastRectRef.current) {
      const r = lastRectRef.current;
      ctx.fillStyle = OVERLAY_COLOR;
      ctx.fillRect(r.x * invScale, r.y * invScale, r.w * invScale, r.h * invScale);
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2 * invScale;
      ctx.strokeRect(r.x * invScale, r.y * invScale, r.w * invScale, r.h * invScale);
    } else if (tool === "lasso" && lassoPointsRef.current.length > 2) {
      const points = lassoPointsRef.current;
      ctx.beginPath();
      ctx.moveTo(points[0].x * invScale, points[0].y * invScale);
      for (const p of points) ctx.lineTo(p.x * invScale, p.y * invScale);
      ctx.closePath();
      ctx.fillStyle = OVERLAY_COLOR;
      ctx.fill();
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = 2 * invScale;
      ctx.stroke();
    }

    return fullCanvas.toDataURL("image/png").split(",")[1];
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const creditCheck = await checkAiCredits(1);
    if (!creditCheck.canProceed) {
      useCreditModalStore.getState().open("이미지 편집에 크레딧이 필요합니다.");
      return;
    }
    setIsGenerating(true);
    setResultUrl(null);
    try {
      const hasSelection = hasSelectionRef.current;
      const base64 = hasSelection ? buildMaskedBase64() : await fetchOriginalBase64();
      if (!base64) throw new Error("이미지 추출 실패");
      const url = await editImageWithAi(base64, prompt, hasSelection);
      if (mountedRef.current) setResultUrl(url);
      void recordAiCreditUsage("emotion", 1);
      mp.track("AI 이미지 편집", { has_selection: hasSelection, prompt_length: prompt.length });
    } catch {
      if (mountedRef.current) useToastStore.getState().showToast("이미지 편집에 실패했어요. 다시 시도해 주세요.");
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!resultUrl) return;
    onApply(resultUrl);
    onClose();
  };

  const handleClose = () => {
    if (isGenerating) return;
    if (resultUrl) {
      const confirmed = window.confirm("생성된 결과를 적용하지 않고 닫으시겠어요?\n크레딧은 이미 차감되었습니다.");
      if (!confirmed) return;
    }
    onClose();
  };

  // 도구 + 초기화 바
  const toolBar = (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg bg-black-5 p-0.5">
        <button type="button" onClick={() => { setTool("rect"); handleReset(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-13-bold transition ${tool === "rect" ? "bg-white-100 text-primary shadow-sm" : "text-black-60"}`}>
          <Square className="h-3.5 w-3.5" /> 사각형
        </button>
        <button type="button" onClick={() => { setTool("lasso"); handleReset(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-13-bold transition ${tool === "lasso" ? "bg-white-100 text-primary shadow-sm" : "text-black-60"}`}>
          <Lasso className="h-3.5 w-3.5" /> 자유
        </button>
      </div>
      <button type="button" onClick={handleReset}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-12-medium text-black-60 hover:bg-black-5 ml-auto">
        <RotateCcw className="h-3 w-3" /> 초기화
      </button>
    </div>
  );

  // 프롬프트 + 생성 + 결과 패널
  const promptPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-14-semibold text-black-90">어떻게 바꿀까요?</span>
        <Textarea placeholder="예: 배경을 바다로 바꿔줘" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
      </div>
      <Button variant="primary" size="md" fullWidth onClick={() => { void handleGenerate(); }} isLoading={isGenerating} disabled={!prompt.trim() || isGenerating || imageLoadError || isImageLoading}>
        {isGenerating ? "생성 중... (보통 5~15초)" : "생성하기"}
      </Button>
      {!isGenerating && !resultUrl && (
        <span className="text-14-regular text-black-60 text-center"><span className="text-title-16-semibold text-primary">1</span> 크레딧 차감</span>
      )}
      {resultUrl && (
        <div className="flex flex-col gap-3">
          <span className="text-13-bold text-black-70">결과</span>
          <div className="rounded-lg overflow-hidden border border-black-25">
            <img src={resultUrl} alt="편집 결과" className="w-full h-auto" />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" fullWidth onClick={handleApply}>옆에 추가</Button>
            <Button variant="outline" size="sm" fullWidth onClick={() => { void handleGenerate(); }} disabled={isGenerating}>
              다시 생성 (<span className="text-title-16-semibold text-primary">1</span> 크레딧)
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // 이미지 영역 — 가로/세로 이미지 모두 동일 컨테이너에서 중앙 정렬
  const imageArea = imageLoadError ? (
    <div className="flex flex-col items-center justify-center gap-3 h-full bg-black-5 rounded-lg">
      <ImageOff className="h-10 w-10 text-black-30" />
      <span className="text-14-regular text-black-50">이미지를 불러올 수 없습니다</span>
    </div>
  ) : isImageLoading ? (
    <div className="flex items-center justify-center h-full bg-black-5 rounded-lg" style={{ minHeight: 300 }}>
      <Spinner size="md" />
    </div>
  ) : (
    <div className="flex flex-col gap-3 h-full">
      <div ref={containerRef} className="flex-1 relative bg-black-5 rounded-lg overflow-hidden flex items-center justify-center p-4">
        <canvas ref={canvasRef} className="cursor-crosshair"
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
      </div>
      {toolBar}
      <p className="text-14-regular text-black-70">
        빨간 영역을 그리면 해당 부분만 편집됩니다. 영역 없이 생성하면 이미지 전체가 편집됩니다.
      </p>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="AI 이미지 편집" size="full" showCloseButton={!isGenerating}>
      <div className="flex gap-6 min-h-[460px]">
        <div className="flex-1 min-w-0">{imageArea}</div>
        <div className="w-72 shrink-0 overflow-y-auto">{promptPanel}</div>
      </div>
    </BaseModal>
  );
};

export default AiImageEditModal;
