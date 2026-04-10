/**
 * 자유형 도형 그리기 세션을 관리하는 훅.
 * drawingModeStore.isDrawing이 true일 때 캔버스 포인터 이벤트로 경로를 수집하고,
 * pointerUp 시 FreeformElement를 생성한다.
 */
import { useState, useRef, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CanvasElement, FreeformElement } from "@/features/editor/model/canvasTypes";
import { useDrawingModeStore } from "@/features/editor/store/drawingModeStore";
import { simplifyPath } from "@/features/editor/utils/pathSimplify";

const CLOSE_THRESHOLD = 10; // px — 시작/끝점이 이 거리 이내이면 닫힌 도형
const MIN_POINTS = 3;
const MIN_BBOX_SIZE = 5; // px

type Point = { x: number; y: number };

interface UseFreeformDrawingProps {
  elements: CanvasElement[];
  readOnly?: boolean;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  getPointerPosition: (event: PointerEvent | ReactPointerEvent<HTMLElement>) => Point;
}

export const useFreeformDrawing = ({
  elements,
  readOnly,
  onElementsChange,
  onSelectedIdsChange,
  getPointerPosition,
}: UseFreeformDrawingProps) => {
  const isDrawing = useDrawingModeStore((s) => s.isDrawing);

  // 그리기 모드 진입 시 기존 선택 해제
  useEffect(() => {
    if (isDrawing) {
      onSelectedIdsChange?.([]);
    }
  }, [isDrawing, onSelectedIdsChange]);

  // rAF 기반 라이브 프리뷰용 상태
  const [previewPoints, setPreviewPoints] = useState<Point[] | null>(null);
  const rawPointsRef = useRef<Point[]>([]);
  const rafRef = useRef<number>(0);
  const isActiveRef = useRef(false);
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const handleDrawingPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (readOnly || !isDrawing || event.button !== 0) return false;

    event.stopPropagation();
    event.preventDefault();

    const startPos = getPointerPosition(event);
    rawPointsRef.current = [startPos];
    setPreviewPoints([startPos]);
    isActiveRef.current = true;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const handleMove = (e: globalThis.PointerEvent) => {
      if (!isActiveRef.current) return;
      const pos = getPointerPosition(e);
      rawPointsRef.current.push(pos);

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPreviewPoints([...rawPointsRef.current]);
      });
    };

    const handleUp = () => {
      if (!isActiveRef.current) return;
      isActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);

      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerup", handleUp);
      target.removeEventListener("pointercancel", handleUp);

      finalizePath();
    };

    target.addEventListener("pointermove", handleMove);
    target.addEventListener("pointerup", handleUp);
    target.addEventListener("pointercancel", handleUp);

    return true;
  };

  const finalizePath = () => {
    const raw = rawPointsRef.current;
    setPreviewPoints(null);
    rawPointsRef.current = [];

    useDrawingModeStore.getState().setIsDrawing(false);

    if (raw.length < MIN_POINTS) return;

    // 경로 단순화
    const simplified = simplifyPath(raw, 2);
    if (simplified.length < 2) return;

    // 바운딩 박스 계산
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of simplified) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    if (bboxW < MIN_BBOX_SIZE && bboxH < MIN_BBOX_SIZE) return;

    const w = Math.max(bboxW, 1);
    const h = Math.max(bboxH, 1);

    // 시작/끝점 거리 → 닫힌 도형 판별
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    const dist = Math.hypot(last.x - first.x, last.y - first.y);
    const closed = dist <= CLOSE_THRESHOLD;

    // 좌표 정규화 (0~1)
    const normalizedPoints = simplified.map((p) => ({
      x: bboxW > 0 ? (p.x - minX) / w : 0.5,
      y: bboxH > 0 ? (p.y - minY) / h : 0.5,
    }));

    const newId = crypto.randomUUID();
    const newElement: FreeformElement = {
      id: newId,
      type: "freeform",
      x: minX,
      y: minY,
      w,
      h,
      points: normalizedPoints,
      closed,
      fill: closed ? "#b7c3ff" : "transparent",
      // 닫힌 도형: 테두리 없음(채우기로 표시), 열린 경로: 선 2px(안 보이면 안 됨)
      stroke: { color: "#000000", width: closed ? 0 : 2, style: "solid" as const },
      border: { enabled: false, color: "#000000", width: 2, style: "solid" as const },
    };

    onElementsChange?.([...elementsRef.current, newElement]);
    onSelectedIdsChange?.([newId]);

    // 생성 직후 "매끈하게" 팝업 표시
    useDrawingModeStore.getState().setSmoothPromptElementId(newId);
  };

  return {
    isDrawing,
    previewPoints,
    handleDrawingPointerDown,
  };
};
