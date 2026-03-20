/**
 * 붙여넣기 이벤트를 해석해 요소 복제와 좌표 보정을 수행하는 훅.
 */
import {
  useEffect,
  type MutableRefObject,
  type RefObject,
} from "react";
import { mp } from "@/shared/utils/mixpanel";
import type { CanvasElement, TextElement } from "../../../model/canvasTypes";
import { measureTextBoxSize } from "../../../utils/textMeasure";
import {
  DEFAULT_TEXT_LINE_HEIGHT,
  isEditableTarget,
} from "../../../utils/designPaperUtils";
import { CLIPBOARD_MARKER } from "./useDesignPaperClipboard";

const DEFAULT_TEXT_FONT_SIZE = 14;
const PASTE_TEXT_WIDTH = 400;

type UseDesignPaperPasteProps = {
  readOnly: boolean;
  elements: CanvasElement[];
  onElementsChange?: (elements: CanvasElement[]) => void;
  selectedIdsRef: MutableRefObject<string[]>;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  lastPointerRef: MutableRefObject<{ x: number; y: number } | null>;
  pasteElements: (position?: { x: number; y: number }) => void;
};

export const useDesignPaperPaste = ({
  readOnly,
  elements,
  onElementsChange,
  selectedIdsRef,
  onSelectedIdsChange,
  onEditingTextIdChange,
  containerRef,
  lastPointerRef,
  pasteElements,
}: UseDesignPaperPasteProps) => {
  useEffect(() => {
    if (readOnly || !onElementsChange) return;

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const rawText = event.clipboardData?.getData("text/plain") ?? "";

      // 앱 내부 요소 복사 마커 → 요소 붙여넣기
      if (rawText === CLIPBOARD_MARKER) {
        event.preventDefault();
        pasteElements();
        return;
      }

      if (!rawText.trim()) {
        return;
      }

      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const basePoint = lastPointerRef.current;
      const centerX = basePoint?.x ?? container.offsetWidth / 2;
      const centerY = basePoint?.y ?? container.offsetHeight / 2;

      // 포인터 위치가 있으면 해당 지점, 없으면 캔버스 중앙에 텍스트를 생성한다.
      const { height } = measureTextBoxSize(
        rawText,
        DEFAULT_TEXT_FONT_SIZE,
        "normal",
        {
          lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
          maxWidth: PASTE_TEXT_WIDTH,
        }
      );
      const x = centerX - PASTE_TEXT_WIDTH / 2;
      const y = centerY - Math.max(height, 1) / 2;

      const newTextElement: Omit<TextElement, "id"> = {
        type: "text",
        text: rawText,
        richText: undefined,
        x,
        y,
        w: PASTE_TEXT_WIDTH,
        h: Math.max(height, 1),
        widthMode: "fixed",
        style: {
          fontSize: DEFAULT_TEXT_FONT_SIZE,
          fontWeight: "normal",
          color: "#000000",
          underline: false,
          alignX: "center",
          alignY: "middle",
          lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
          letterSpacing: 0,
        },
        locked: false,
        visible: true,
      };

      const newId = crypto.randomUUID();
      const newElement: TextElement = { ...newTextElement, id: newId };

      onElementsChange([...elements, newElement]);
      mp.track("요소 붙여넣기", { element_count: 1 });
      selectedIdsRef.current = [newId];
      onSelectedIdsChange?.([newId]);
      onEditingTextIdChange?.(null);
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [
    readOnly,
    onElementsChange,
    elements,
    onSelectedIdsChange,
    onEditingTextIdChange,
    containerRef,
    lastPointerRef,
    selectedIdsRef,
    pasteElements,
  ]);
};
