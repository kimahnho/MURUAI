import { useCallback, type MutableRefObject } from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import { measureTextBoxSize } from "../../../utils/textMeasure";
import { DEFAULT_TEXT_LINE_HEIGHT } from "../../../utils/designPaperUtils";

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
      } catch {
        // ignore clipboard failures
      }
    },
    [pageId]
  );

  const getClipboard = useCallback((): CanvasElement[] | null => {
    try {
      const raw = sessionStorage.getItem("copiedElements");
      if (!raw) return null;
      return JSON.parse(raw) as CanvasElement[];
    } catch {
      return null;
    }
  }, []);

  const getClipboardMeta = useCallback((): { pageId?: string } | null => {
    try {
      const raw = sessionStorage.getItem("copiedElementsMeta");
      if (!raw) return null;
      return JSON.parse(raw) as { pageId?: string };
    } catch {
      return null;
    }
  }, []);

  const copySelectedElements = useCallback(() => {
    const ids = selectedIdsRef.current;
    const selected = elements.filter((element) => ids.includes(element.id));
    if (selected.length === 0) return;
    setClipboard(selected);
    clearContextMenu();
  }, [elements, selectedIdsRef, setClipboard, clearContextMenu]);

  const pasteElements = useCallback((position?: { x: number; y: number }) => {
    if (readOnly || !onElementsChange) return;
    const clipboard = getClipboard();
    if (!clipboard || clipboard.length === 0) return;
    const meta = getClipboardMeta();
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
    const groupIdMap = new Map<string, string>();
    const nextElements = clipboard.map((element) => {
      const id = crypto.randomUUID();
      const nextGroupId =
        element.groupId != null
          ? groupIdMap.get(element.groupId) ??
            (() => {
              const newId = crypto.randomUUID();
              groupIdMap.set(element.groupId, newId);
              return newId;
            })()
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
            h: Math.max(height, 1),
            widthMode,
          };
        }
        return {
          ...element,
          id,
          groupId: nextGroupId,
          x: element.x + offsetX,
          y: element.y + offsetY,
        };
      }
      return { ...element, id, groupId: nextGroupId };
    });
    onElementsChange([...elements, ...nextElements]);
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
