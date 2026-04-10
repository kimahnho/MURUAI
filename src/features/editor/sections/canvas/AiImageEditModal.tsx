/**
 * AI 이미지 편집 모달 — 사각형/자유 올가미로 영역 선택 + 프롬프트로 편집.
 * 결과는 기존 이미지 옆에 새 요소로 추가.
 */
import { useState, useRef, useEffect, useCallback } from "react";
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
  const imageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasSelectionRef = useRef(false);
  const scaleRef = useRef(1);
  const mountedRef = useRef(true);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const lassoPointsRef = useRef<Array<{ x: number; y: number }>>([]);

  // 마운트 추적
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 모달 열릴 때 상태 초기화
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
    }
  }, [isOpen]);

  // 이미지 로드
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
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const maxW = 500;
    const maxH = 400;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    scaleRef.current = scale;

    const displayW = img.width * scale;
    const displayH = img.height * scale;

    // DPR 적용 — 고해상도 디스플레이에서 선명하게
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, 0, 0, displayW, displayH);
  }, []);

  // 좌표를 캔버스 범위 내로 클램핑
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    return {
      x: Math.max(0, Math.min(parseFloat(canvas.style.width || "0"), rawX)),
      y: Math.max(0, Math.min(parseFloat(canvas.style.height || "0"), rawY)),
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
    hasSelectionRef.current = false;
    isDrawingRef.current = false;
    drawCanvas();
  };

  /** 원본 해상도로 오버레이 이미지 생성 */
  const getCanvasBase64 = (): string | null => {
    const displayCanvas = canvasRef.current;
    const img = imageRef.current;
    if (!displayCanvas || !img) return null;

    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = img.width;
    fullCanvas.height = img.height;
    const ctx = fullCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(displayCanvas, 0, 0, displayCanvas.width, displayCanvas.height, 0, 0, img.width, img.height);
    return fullCanvas.toDataURL("image/webp", 0.85).split(",")[1];
  };

  /** CORS 안전 원본 이미지 base64 — blob URL 메모리 누수 방지 */
  const getOriginalBase64 = async (): Promise<string> => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
      return await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          if (!ctx) { reject(new Error("canvas 생성 실패")); return; }
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/webp", 0.85).split(",")[1]);
        };
        img.onerror = () => reject(new Error("이미지 로드 실패"));
        img.src = blobUrl;
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
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
      const base64 = hasSelection ? getCanvasBase64() : await getOriginalBase64();
      if (!base64) throw new Error("이미지 추출 실패");

      const url = await editImageWithAi(base64, prompt, hasSelection);
      if (mountedRef.current) {
        setResultUrl(url);
      }
      void recordAiCreditUsage("emotion", 1);
      mp.track("AI 이미지 편집", { has_selection: hasSelection, prompt_length: prompt.length });
    } catch {
      if (mountedRef.current) {
        useToastStore.getState().showToast("이미지 편집에 실패했어요. 다시 시도해 주세요.");
      }
    } finally {
      if (mountedRef.current) {
        setIsGenerating(false);
      }
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

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="AI 이미지 편집" size="xl" showCloseButton={!isGenerating}>
      <div className="flex gap-6 min-h-[450px]">
        {/* 좌측: 이미지 + 올가미 */}
        <div className="flex flex-col gap-3 flex-1">
          {imageLoadError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 bg-black-5 rounded-lg">
              <ImageOff className="h-10 w-10 text-black-30" />
              <span className="text-14-regular text-black-50">이미지를 불러올 수 없습니다</span>
            </div>
          ) : isImageLoading ? (
            <div className="flex items-center justify-center py-20 bg-black-5 rounded-lg" style={{ minHeight: 350 }}>
              <Spinner size="md" />
            </div>
          ) : (
            <div className="relative bg-black-5 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 350 }}>
              <canvas
                ref={canvasRef}
                className="cursor-crosshair"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          )}

          {!imageLoadError && !isImageLoading && (
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-black-5 p-0.5">
                <button
                  type="button"
                  onClick={() => { setTool("rect"); handleReset(); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-13-bold transition ${
                    tool === "rect" ? "bg-white-100 text-primary shadow-sm" : "text-black-60"
                  }`}
                >
                  <Square className="h-3.5 w-3.5" />
                  사각형
                </button>
                <button
                  type="button"
                  onClick={() => { setTool("lasso"); handleReset(); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-13-bold transition ${
                    tool === "lasso" ? "bg-white-100 text-primary shadow-sm" : "text-black-60"
                  }`}
                >
                  <Lasso className="h-3.5 w-3.5" />
                  자유
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-12-medium text-black-60 hover:bg-black-5 ml-auto"
              >
                <RotateCcw className="h-3 w-3" />
                초기화
              </button>
            </div>
          )}

          {!imageLoadError && !isImageLoading && (
            <p className="text-14-regular text-black-70">
              빨간 영역을 그리면 해당 부분만 편집됩니다. 영역 없이 생성하면 이미지 전체가 편집됩니다.
            </p>
          )}
        </div>

        {/* 우측: 프롬프트 + 생성 + 결과 */}
        <div className="flex flex-col gap-4 w-72 shrink-0">
          <div className="flex flex-col gap-2">
            <span className="text-14-semibold text-black-90">어떻게 바꿀까요?</span>
            <Textarea
              placeholder="예: 배경을 바다로 바꿔줘"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => { void handleGenerate(); }}
            isLoading={isGenerating}
            disabled={!prompt.trim() || isGenerating || imageLoadError || isImageLoading}
          >
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
                <Button variant="primary" size="sm" fullWidth onClick={handleApply}>
                  옆에 추가
                </Button>
                <Button variant="outline" size="sm" fullWidth onClick={() => { void handleGenerate(); }} disabled={isGenerating}>
                  다시 생성 (<span className="text-title-16-semibold text-primary">1</span> 크레딧)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default AiImageEditModal;
