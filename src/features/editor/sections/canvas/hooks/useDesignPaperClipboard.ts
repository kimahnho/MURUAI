/**
 * 선택 요소 복사/붙여넣기 단축 동작을 캔버스 상태와 연결하는 훅.
 */
import { useCallback, type MutableRefObject } from "react";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import { useToastStore } from "../../../store/toastStore";
import type { CanvasElement } from "../../../model/canvasTypes";
import { measureTextBoxSize } from "../../../utils/textMeasure";
import { DEFAULT_TEXT_LINE_HEIGHT } from "../../../utils/designPaperUtils";

// 앱 내부 요소 복사 시 시스템 클립보드에 기록하는 마커 — 외부 텍스트 복사와 구분용
export const CLIPBOARD_MARKER = "__MURU_COPIED_ELEMENTS__";

type UseDesignPaperClipboardProps = {
  pageId: string;
  elements: CanvasElement[];
  selectedIdsRef: MutableRefObject<string[]>;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  readOnly: boolean;
  clearContextMenu: () => void;
};

export const useDesignPaperClipboard = ({
  pageId,
  elements,
  selectedIdsRef,
  onElementsChange,
  onSelectedIdsChange,
  readOnly,
  clearContextMenu,
}: UseDesignPaperClipboardProps) => {
  const setClipboard = useCallback(
    (items: CanvasElement[]) => {
      try {
        sessionStorage.setItem("copiedElements", JSON.stringify(items));
        sessionStorage.setItem(
          "copiedElementsMeta",
          JSON.stringify({ pageId })
        );
        sessionStorage.removeItem("copiedPageId");
      } catch (error) {
        // 저장소 접근 실패는 복사만 건너뛰고 편집 동작은 계속 유지한다.
        captureSentryError(error, "클립보드 접근");
      }
    },
    [pageId]
  );

  const getClipboard = useCallback((): CanvasElement[] | null => {
    try {
      const raw = sessionStorage.getItem("copiedElements");
      if (!raw) return null;
      return JSON.parse(raw) as CanvasElement[];
    } catch (error) {
      captureSentryError(error, "클립보드 접근");
      return null;
    }
  }, []);

  const getClipboardMeta = useCallback((): { pageId?: string } | null => {
    try {
      const raw = sessionStorage.getItem("copiedElementsMeta");
      if (!raw) return null;
      return JSON.parse(raw) as { pageId?: string };
    } catch (error) {
      captureSentryError(error, "클립보드 접근");
      return null;
    }
  }, []);

  const copySelectedElements = useCallback(() => {
    const ids = selectedIdsRef.current;
    const selected = elements.filter((element) => ids.includes(element.id));
    if (selected.length === 0) return;
    setClipboard(selected);
    navigator.clipboard.writeText(CLIPBOARD_MARKER).catch(() => {});
    mp.track("요소 복사", { element_count: selected.length });
    useToastStore.getState().showToast("요소가 복사되었습니다");
    clearContextMenu();
  }, [elements, selectedIdsRef, setClipboard, clearContextMenu]);

  const pasteElements = useCallback((position?: { x: number; y: number }) => {
    if (readOnly || !onElementsChange) return;
    const clipboard = getClipboard();
    if (!clipboard || clipboard.length === 0) return;
    const meta = getClipboardMeta();
    // 다른 페이지에서 붙여넣는 경우에는 원래 좌표를 유지하고,
    // 같은 페이지에서는 겹침을 피하기 위해 고정 오프셋을 적용한다.
    const offset = meta?.pageId && meta.pageId !== pageId ? 0 : 10;
    const bounds = position
      ? clipboard.reduce<{ minX: number; minY: number } | null>(
          (acc, element) => {
            const next = acc ?? { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY };
            if (element.type === "line" || element.type === "arrow") {
              return {
                minX: Math.min(next.minX, element.start.x, element.end.x),
                minY: Math.min(next.minY, element.start.y, element.end.y),
              };
            }
            if ("x" in element && "y" in element) {
              return {
                minX: Math.min(next.minX, element.x),
                minY: Math.min(next.minY, element.y),
              };
            }
            return next;
          },
          null
        )
      : null;
    const offsetX =
      position && bounds && Number.isFinite(bounds.minX)
        ? position.x - bounds.minX
        : offset;
    const offsetY =
      position && bounds && Number.isFinite(bounds.minY)
        ? position.y - bounds.minY
        : offset;
    // 1st pass: 모든 요소에 새 ID를 할당하고 매핑을 구성한다 (labelId 리맵용)
    const idMap = new Map<string, string>();
    for (const el of clipboard) {
      idMap.set(el.id, crypto.randomUUID());
    }

    const groupIdMap = new Map<string, string>();
    const nextElements = clipboard.map((element) => {
      const id = idMap.get(element.id) ?? crypto.randomUUID();
      const nextGroupId =
        element.groupId != null
          ? groupIdMap.get(element.groupId) ??
            (() => {
              const newId = crypto.randomUUID();
              groupIdMap.set(element.groupId, newId);
              return newId;
            })()
          : undefined;
      // labelId 리맵: 참조 대상이 클립보드에 포함된 경우 새 ID로 교체한다
      const nextLabelId =
        "labelId" in element &&
        typeof element.labelId === "string" &&
        element.labelId
          ? idMap.get(element.labelId) ?? element.labelId
          : undefined;
      if (element.type === "line" || element.type === "arrow") {
        return {
          ...element,
          id,
          groupId: nextGroupId,
          start: {
            x: element.start.x + offsetX,
            y: element.start.y + offsetY,
          },
          end: { x: element.end.x + offsetX, y: element.end.y + offsetY },
        };
      }
      if ("x" in element && "y" in element) {
        if (element.type === "text") {
          const lineHeight = element.style.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT;
          const letterSpacing = element.style.letterSpacing ?? 0;
          const widthMode = element.widthMode ?? "auto";
          const { width, height } = measureTextBoxSize(
            element.text ?? "",
            element.style.fontSize,
            element.style.fontWeight,
            {
              lineHeight,
              letterSpacing,
              fontFamily: element.style.fontFamily,
              maxWidth: widthMode === "fixed" ? element.w : undefined,
            }
          );
          return {
            ...element,
            id,
            groupId: nextGroupId,
            x: element.x + offsetX,
            y: element.y + offsetY,
            w: widthMode === "fixed" ? element.w : Math.max(width, 1),
            h: element.lockHeight ? element.h : Math.max(height, 1),
            widthMode,
          };
        }
        return {
          ...element,
          id,
          groupId: nextGroupId,
          ...(nextLabelId !== undefined ? { labelId: nextLabelId } : {}),
          x: element.x + offsetX,
          y: element.y + offsetY,
        };
      }
      return { ...element, id, groupId: nextGroupId };
    });
    onElementsChange([...elements, ...nextElements]);
    mp.track("요소 붙여넣기", { element_count: nextElements.length });
    const nextSelectedIds = nextElements.map((element) => element.id);
    selectedIdsRef.current = nextSelectedIds;
    onSelectedIdsChange?.(nextSelectedIds);
    clearContextMenu();
  }, [
    readOnly,
    onElementsChange,
    elements,
    onSelectedIdsChange,
    getClipboard,
    getClipboardMeta,
    pageId,
    selectedIdsRef,
    clearContextMenu,
  ]);

  return {
    copySelectedElements,
    pasteElements,
    getClipboard,
  };
};
