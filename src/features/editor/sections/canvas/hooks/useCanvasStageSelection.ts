/**
 * 스테이지 영역 선택(드래그 선택) 계산과 선택 결과 반영을 담당하는 훅.
 */
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { Page } from "../../../model/pageTypes";
import type { DesignPaperStageActions } from "../../../model/stageActions";
import {
  getElementBoundsForSelection,
  normalizeSelectionRect,
  rectsIntersect,
  type SelectionRect,
} from "../../../utils/designPaperUtils";

type UseCanvasStageSelectionParams = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  padding: number;
  scale: number;
  selectedPage: Page | undefined;
  selectedIds: string[];
  stageActionsRef: RefObject<DesignPaperStageActions | null>;
  onClearSelection: () => void;
  onSelectedIdsChange: (nextIds: string[]) => void;
  onEditingTextIdChange: (nextId: string | null) => void;
};

export const useCanvasStageSelection = ({
  canvasRef,
  padding,
  scale,
  selectedPage,
  selectedIds,
  stageActionsRef,
  onClearSelection,
  onSelectedIdsChange,
  onEditingTextIdChange,
}: UseCanvasStageSelectionParams) => {
  const selectedIdsRef = useRef(selectedIds);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionAdditiveRef = useRef(false);
  const selectionDragRef = useRef(false);
  const selectionPointerIdRef = useRef<number | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [previewSelectedIds, setPreviewSelectedIds] = useState<string[] | null>(
    null
  );
  const previewSelectedIdsRef = useRef<string[] | null>(null);
  const previewFrameRef = useRef<number | null>(null);
  const dragThreshold = 3;

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    return () => {
      if (previewFrameRef.current != null) {
        window.cancelAnimationFrame(previewFrameRef.current);
      }
    };
  }, []);

  const getPointerPosition = (
    event: PointerEvent | ReactPointerEvent<HTMLElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - padding) / scale,
      y: (event.clientY - rect.top - padding) / scale,
    };
  };

  const shouldStartSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return false;
    const target = event.target as HTMLElement;
    // 텍스트 속성 패널 클릭은 선택 로직을 시작하지 않음
    if (target.closest("[data-text-props-panel]")) return false;
    // 컨텍스트 메뉴 portal 클릭은 캔버스 선택으로 처리하지 않음
    if (target.closest("[data-context-menu-portal]")) return false;
    const pageRoot = target.closest("[data-page-id]");
    if (!pageRoot) return true;
    return target === pageRoot;
  };

  const finalizeSelection = (endPoint: { x: number; y: number }) => {
    const startPoint = selectionStartRef.current;
    if (!startPoint) return;
    const nextRect = normalizeSelectionRect(startPoint, endPoint);
    const isAdditive = selectionAdditiveRef.current;
    selectionStartRef.current = null;
    selectionAdditiveRef.current = false;

    const isClick =
      !selectionDragRef.current ||
      (nextRect.width < dragThreshold && nextRect.height < dragThreshold);
    if (isClick) {
      // 드래그 임계값 미만은 빈 영역 클릭으로 처리해 기존 선택 해제 규칙을 유지한다.
      if (!isAdditive) {
        onClearSelection();
      }
      setPreviewSelectedIds(null);
      previewSelectedIdsRef.current = null;
      return;
    }

    const elements = selectedPage?.elements ?? [];
    const hitIds = elements
      .filter((element) => !element.locked && element.selectable !== false)
      .map((element) => ({
        id: element.id,
        rect: getElementBoundsForSelection(element),
      }))
      .filter((item): item is { id: string; rect: SelectionRect } =>
        Boolean(item.rect)
      )
      .filter((item) => rectsIntersect(nextRect, item.rect))
      .map((item) => item.id);

    const baseIds = isAdditive ? selectedIdsRef.current : [];
    const nextSelectedIds = [...new Set([...baseIds, ...hitIds])];
    onSelectedIdsChange(nextSelectedIds);
    if (!isAdditive) {
      onEditingTextIdChange(null);
    }
    setPreviewSelectedIds(null);
    previewSelectedIdsRef.current = null;
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectedPage) return;
    if (!shouldStartSelection(event)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectionPointerIdRef.current = event.pointerId;
    selectionStartRef.current = getPointerPosition(event);
    selectionAdditiveRef.current = event.shiftKey;
    selectionDragRef.current = false;
    setSelectionRect(null);
    setPreviewSelectedIds(null);
    previewSelectedIdsRef.current = null;
    // 새 영역 선택이 시작되면 이전 컨텍스트 액션 상태를 함께 정리한다.
    stageActionsRef.current?.clearContextMenu();
    stageActionsRef.current?.setEditingImageId(null);
    stageActionsRef.current?.setEditingShapeTextId(null);
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selectionPointerIdRef.current !== event.pointerId) return;
    const startPoint = selectionStartRef.current;
    if (!startPoint) return;
    const movePoint = getPointerPosition(event);
    const nextRect = normalizeSelectionRect(startPoint, movePoint);
    if (
      !selectionDragRef.current &&
      nextRect.width < dragThreshold &&
      nextRect.height < dragThreshold
    ) {
      return;
    }
    selectionDragRef.current = true;
    setSelectionRect(nextRect);

    const elements = selectedPage?.elements ?? [];
    const hitIds = elements
      .filter((element) => !element.locked && element.selectable !== false)
      .map((element) => ({
        id: element.id,
        rect: getElementBoundsForSelection(element),
      }))
      .filter((item): item is { id: string; rect: SelectionRect } =>
        Boolean(item.rect)
      )
      .filter((item) => rectsIntersect(nextRect, item.rect))
      .map((item) => item.id);

    const baseIds = selectionAdditiveRef.current
      ? selectedIdsRef.current
      : [];
    const nextPreviewIds = [...new Set([...baseIds, ...hitIds])];

    previewSelectedIdsRef.current = nextPreviewIds;
    // pointermove 빈도를 그대로 setState 하면 리렌더 비용이 커져 frame 단위로만 반영한다.
    if (previewFrameRef.current == null) {
      previewFrameRef.current = window.requestAnimationFrame(() => {
        previewFrameRef.current = null;
        setPreviewSelectedIds(previewSelectedIdsRef.current);
      });
    }
  };

  const handleStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selectionPointerIdRef.current !== event.pointerId) return;
    selectionPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const endPoint = getPointerPosition(event);
    setSelectionRect(null);
    finalizeSelection(endPoint);
    selectionDragRef.current = false;
  };

  const handleStagePointerCancel = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (selectionPointerIdRef.current !== event.pointerId) return;
    selectionPointerIdRef.current = null;
    selectionDragRef.current = false;
    selectionStartRef.current = null;
    selectionAdditiveRef.current = false;
    setSelectionRect(null);
    setPreviewSelectedIds(null);
    previewSelectedIdsRef.current = null;
  };

  return {
    selectionRect,
    previewSelectedIds,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerCancel,
  };
};
