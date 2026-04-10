/**
 * AI 이미지 편집 인라인 오버레이.
 * 선택된 이미지 요소 옆에 플로팅 패널로 표시되며,
 * 도구 선택 + 프롬프트 입력 + 생성 버튼을 제공한다.
 * 생성 완료 시 결과를 바로 옆에 새 요소로 삽입 (미리보기 없이 즉시).
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Lasso, RotateCcw, Square, X } from "lucide-react";
import Button from "@/shared/ui/Button";
import { editImageWithAi } from "../../ai/editImageWithAi";
import { checkAiCredits, recordAiCreditUsage } from "../../utils/aiTemplateUsage";
import { useCreditModalStore } from "../../store/creditModalStore";
import { useToastStore } from "../../store/toastStore";
import { mp } from "@/shared/utils/mixpanel";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { useAiEditInteraction } from "./hooks/useAiEditInteraction";
import type { AiEditTool } from "./hooks/useAiEditInteraction";

interface AiEditOverlayProps {
  /** 편집 대상 요소 ID */
  elementId: string;
  /** 원본 이미지 URL */
  imageUrl: string;
  /** 요소의 캔버스 내 좌표 및 크기 (px, scale 반영 전) */
  elementRect: { x: number; y: number; w: number; h: number };
  /** DesignPaper 컨테이너의 DOM ref */
  paperRef: React.RefObject<HTMLDivElement | null>;
  /** 생성 완료 후 새 이미지 URL을 전달해 요소로 삽입 */
  onInsertResult: (newImageUrl: string) => void;
  /** 편집 모드 종료 */
  onClose: () => void;
}

const PANEL_W = 256; // w-64
const PANEL_GAP = 12; // 요소와 패널 사이 여백

const AiEditOverlay = ({
  elementId,
  imageUrl,
  elementRect,
  paperRef,
  onInsertResult,
  onClose,
}: AiEditOverlayProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const mountedRef = useRef(true);
  // 패널이 뷰포트 기준으로 계산된 절대 위치
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);

  const {
    tool,
    setTool,
    hasSelection,
    svgSelectionJsx,
    pointerHandlers,
    buildMaskedBase64,
    fetchOriginalBase64,
    reset,
  } = useAiEditInteraction({
    elementW: elementRect.w,
    elementH: elementRect.h,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // DesignPaper 기준 좌표 → 뷰포트 절대 좌표로 변환해 패널 위치 계산
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;

    const updatePos = () => {
      const paperRect = paper.getBoundingClientRect();
      // DesignPaper 컨테이너의 CSS transform scale을 고려
      const scale = paper.offsetWidth ? paperRect.width / paper.offsetWidth : 1;

      const elLeft = paperRect.left + elementRect.x * scale;
      const elTop = paperRect.top + elementRect.y * scale;
      const elRight = elLeft + elementRect.w * scale;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 오른쪽에 공간이 있으면 오른쪽, 없으면 왼쪽에 배치
      let left: number;
      if (elRight + PANEL_GAP + PANEL_W <= vw) {
        left = elRight + PANEL_GAP;
      } else {
        left = elLeft - PANEL_GAP - PANEL_W;
      }

      // 요소 상단에 맞추되 뷰포트 밖으로 나가지 않도록 클램핑
      let top = elTop;
      const estimatedPanelH = 320;
      if (top + estimatedPanelH > vh) {
        top = Math.max(8, vh - estimatedPanelH - 8);
      }
      top = Math.max(8, top);

      // 패널이 좌측 뷰포트 밖으로 나가지 않도록
      left = Math.max(8, Math.min(left, vw - PANEL_W - 8));

      setPanelPos({ left, top });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [elementRect, paperRef]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const creditCheck = await checkAiCredits(1);
    if (!creditCheck.canProceed) {
      useCreditModalStore.getState().open("이미지 편집에 크레딧이 필요합니다.");
      return;
    }

    setIsGenerating(true);
    try {
      const base64 = hasSelection
        ? await buildMaskedBase64(imageUrl)
        : await fetchOriginalBase64(imageUrl);

      const resultUrl = await editImageWithAi(base64, prompt, hasSelection);

      void recordAiCreditUsage("emotion", 1);
      mp.track("AI 이미지 편집", {
        has_selection: hasSelection,
        prompt_length: prompt.length,
        element_id: elementId,
      });

      if (!mountedRef.current) return;

      setGenerationCount((c) => c + 1);
      onInsertResult(resultUrl);
    } catch (err) {
      if (!mountedRef.current) return;
      captureSentryError(err, "AI 이미지 편집 인라인");
      useToastStore.getState().showToast("이미지 편집에 실패했어요. 다시 시도해 주세요.");
    } finally {
      if (mountedRef.current) setIsGenerating(false);
    }
  };

  // SVG 오버레이 — 이미지 요소 위에 절대 위치로 렌더링 (DesignPaper 내부)
  const svgOverlay = (
    <svg
      className="absolute pointer-events-auto cursor-crosshair"
      style={{
        left: elementRect.x,
        top: elementRect.y,
        width: elementRect.w,
        height: elementRect.h,
        zIndex: 30,
      }}
      viewBox={`0 0 ${elementRect.w} ${elementRect.h}`}
      {...pointerHandlers}
    >
      {svgSelectionJsx}
    </svg>
  );

  // 플로팅 패널 — body에 portal로 렌더링 (transform/overflow 탈출)
  const floatingPanel = panelPos
    ? createPortal(
        <div
          data-ai-edit-panel
          className="fixed z-50 flex flex-col gap-3 rounded-xl border border-black-25 bg-white-100 shadow-xl p-4"
          style={{ left: panelPos.left, top: panelPos.top, width: PANEL_W }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <span className="text-14-semibold text-black-90">AI 이미지 편집</span>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="flex items-center justify-center w-6 h-6 rounded-md text-black-50 hover:bg-black-5 disabled:opacity-40"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 도구 선택 */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-lg bg-black-5 p-0.5">
              <ToolButton
                active={tool === "rect"}
                onClick={() => setTool("rect" as AiEditTool)}
                label="사각형"
                icon={<Square className="h-3.5 w-3.5" />}
              />
              <ToolButton
                active={tool === "lasso"}
                onClick={() => setTool("lasso" as AiEditTool)}
                label="자유"
                icon={<Lasso className="h-3.5 w-3.5" />}
              />
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-12-medium text-black-60 hover:bg-black-5"
              aria-label="선택 초기화"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 안내 텍스트 */}
          <p className="text-12-regular text-black-50">
            {hasSelection
              ? "선택 영역만 편집됩니다."
              : "이미지 위를 드래그해 영역을 선택하거나,\n선택 없이 전체를 편집할 수 있습니다."}
          </p>

          {/* 프롬프트 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-13-semibold text-black-80">어떻게 바꿀까요?</label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-90 placeholder:text-black-40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="예: 배경을 바다로 바꿔줘"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* 생성 버튼 */}
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => { void handleGenerate(); }}
            isLoading={isGenerating}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating
              ? "생성 중..."
              : generationCount > 0
                ? "다시 생성하기"
                : "생성하기"}
          </Button>

          {/* 크레딧 안내 */}
          {!isGenerating && (
            <p className="text-12-regular text-black-50 text-center">
              <span className="text-13-bold text-primary">1</span> 크레딧 차감
            </p>
          )}

          {/* 다시 생성 시 안내 */}
          {generationCount > 0 && !isGenerating && (
            <p className="text-12-regular text-black-50 text-center">
              결과가 추가되었어요. 계속 생성할 수 있습니다.
            </p>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {svgOverlay}
      {floatingPanel}
    </>
  );
};

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

const ToolButton = ({ active, onClick, label, icon }: ToolButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-13-bold transition ${
      active ? "bg-white-100 text-primary shadow-sm" : "text-black-60 hover:text-black-90"
    }`}
  >
    {icon}
    {label}
  </button>
);

export default AiEditOverlay;
