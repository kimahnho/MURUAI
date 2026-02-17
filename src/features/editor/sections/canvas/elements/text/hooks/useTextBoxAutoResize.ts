/**
 * 텍스트 내용 변화에 맞춰 박스 크기를 자동 보정하는 훅.
 */
import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { Rect } from "../../../../../model/canvasTypes";
import { computeTextBoxSize } from "../textBoxMeasure";

type UseTextBoxAutoResizeProps = {
  isEditing: boolean;
  widthMode: "auto" | "fixed" | "element";
  minWidth: number;
  minHeight: number;
  textAlign: "left" | "center" | "right";
  onRectChange?: (rect: Rect) => void;
  rect: Rect;
  richText?: string;
  text: string;
  styleSignature: string;
  rectRef: MutableRefObject<Rect>;
  editableRef: RefObject<HTMLDivElement | null>;
  measureRef: RefObject<HTMLDivElement | null>;
  boxRef: RefObject<HTMLDivElement | null>;
  isResizingRef: MutableRefObject<boolean>;
};

export const useTextBoxAutoResize = ({
  isEditing,
  widthMode,
  minWidth,
  minHeight,
  textAlign,
  onRectChange,
  rect,
  richText,
  text,
  styleSignature,
  rectRef: _rectRef,
  editableRef,
  measureRef,
  boxRef,
  isResizingRef,
}: UseTextBoxAutoResizeProps) => {
  // 요소 기준 폭 모드에서 캔버스 경계 도달 여부를 추적한다.
  const hasReachedBoundaryRef = useRef(false);
  const wasMultiLineRef = useRef(false);
  const lastEmittedRectRef = useRef<Rect | null>(null);
  const lastMeasureKeyRef = useRef("");
  const onRectChangeRef = useRef(onRectChange);

  useEffect(() => {
    onRectChangeRef.current = onRectChange;
  }, [onRectChange]);

  const isRectClose = (a: Rect, b: Rect) =>
    Math.abs(a.x - b.x) <= 0.25 &&
    Math.abs(a.y - b.y) <= 0.25 &&
    Math.abs(a.width - b.width) <= 0.25 &&
    Math.abs(a.height - b.height) <= 0.25;
  const rectWidth = rect.width;

  useEffect(() => {
    if (!onRectChangeRef.current) return;
    if (isResizingRef.current) return;
    const measureKey = `${widthMode}|${styleSignature}|${isEditing ? 1 : 0}|${text}|${richText ?? ""}`;
    if (lastMeasureKeyRef.current !== measureKey) {
      lastMeasureKeyRef.current = measureKey;
      lastEmittedRectRef.current = null;
      hasReachedBoundaryRef.current = false;
      wasMultiLineRef.current = false;
    }
    const measure = measureRef.current;
    if (!measure) return;
    const editableNode = editableRef.current;
    const currentRect = rect;
    if (
      lastEmittedRectRef.current &&
      isRectClose(currentRect, lastEmittedRectRef.current)
    ) {
      return;
    }
    const rectWidth = currentRect.width;
    const rectHeight = currentRect.height;
    const maxWidth = boxRef.current?.parentElement?.clientWidth ?? rectWidth;
    const canvasPadding = 20;
    const maxAllowedWidth = maxWidth - canvasPadding;
    const htmlContent = isEditing ? editableNode?.innerHTML : richText;
    const hasHtmlContent = htmlContent != null && htmlContent !== "";
    const hasLineBreaks = (() => {
      if (hasHtmlContent) {
        return /<br\s*\/?>|<div\b|<p\b/i.test(htmlContent ?? "");
      }
      return (text ?? "").includes("\n");
    })();
    const setMeasureContent = () => {
      if (hasHtmlContent) {
        measure.innerHTML = htmlContent ?? "";
      } else {
        measure.textContent = text ?? "";
      }
    };
    const getSingleLineWidth = () => {
      measure.style.padding = "0";
      measure.style.border = "none";
      measure.style.width = "auto";
      measure.style.whiteSpace = "pre";
      setMeasureContent();
      const widthBuffer = 4;
      return Math.ceil(measure.scrollWidth) + widthBuffer;
    };
    const emitRectChange = (nextRect: Rect) => {
      if (isRectClose(nextRect, currentRect)) return;
      if (lastEmittedRectRef.current && isRectClose(nextRect, lastEmittedRectRef.current)) {
        return;
      }
      lastEmittedRectRef.current = nextRect;
      onRectChangeRef.current?.(nextRect);
    };

    // 요소 기준 폭 모드: 너비 고정, 캔버스 경계 도달 시에만 줄바꿈 계산
    if (widthMode === "element") {
      // 단일 라인 너비 측정
      const singleLineWidth = getSingleLineWidth();

      // 캔버스 경계에 도달했는지 체크
      const reachesBoundary = singleLineWidth > maxAllowedWidth;
      const isMultiLine = reachesBoundary || hasLineBreaks;
      const shouldMeasureHeight = isMultiLine || wasMultiLineRef.current;

      if (reachesBoundary && !hasReachedBoundaryRef.current) {
        // 처음으로 경계에 도달: 줄바꿈 계산 수행
        hasReachedBoundaryRef.current = true;
        const { targetHeight } = computeTextBoxSize({
          measure,
          htmlContent,
          text,
          rect: { ...currentRect, width: maxAllowedWidth },
          minWidth,
          minHeight,
          widthMode: "fixed",
          maxWidth: maxAllowedWidth,
        });
        const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
        if (heightChanged || rectWidth !== maxAllowedWidth) {
          const widthDelta = maxAllowedWidth - rectWidth;
          const newX =
            textAlign === "right"
              ? currentRect.x + (rectWidth - maxAllowedWidth)
              : textAlign === "center"
              ? currentRect.x - widthDelta / 2
              : currentRect.x;
          emitRectChange({
            ...currentRect,
            x: newX,
            width: maxAllowedWidth,
            height: targetHeight,
          });
        }
      } else if (reachesBoundary) {
        // 이미 경계에 도달한 상태: 높이만 재계산
        const { targetHeight } = computeTextBoxSize({
          measure,
          htmlContent,
          text,
          rect: currentRect,
          minWidth,
          minHeight,
          widthMode: "fixed",
          maxWidth: rectWidth,
        });
        const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
        if (heightChanged) {
          emitRectChange({
            ...currentRect,
            height: targetHeight,
          });
        }
      } else {
        // 경계에 도달하지 않음: 필요 시에만 높이 조정 (너비는 고정 유지)
        hasReachedBoundaryRef.current = false;
        if (!shouldMeasureHeight) {
          wasMultiLineRef.current = isMultiLine;
          return;
        }
        const { targetHeight } = computeTextBoxSize({
          measure,
          htmlContent,
          text,
          rect: currentRect,
          minWidth,
          minHeight,
          widthMode: "fixed",
          maxWidth: rectWidth,
        });
        const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
        if (heightChanged) {
          emitRectChange({
            ...currentRect,
            height: targetHeight,
          });
        }
      }
      wasMultiLineRef.current = isMultiLine;
      return;
    }

    // 자동/고정 폭 모드는 폭 변경과 높이 재계산을 함께 처리한다.
    const isAutoWidth = widthMode === "auto";

    if (isAutoWidth) {
      const singleLineWidth = getSingleLineWidth();
      const targetWidth =
        singleLineWidth <= maxAllowedWidth
          ? Math.max(singleLineWidth, minWidth)
          : maxAllowedWidth;
      const isMultiLine = singleLineWidth > maxAllowedWidth || hasLineBreaks;
      const shouldMeasureHeight = isMultiLine || wasMultiLineRef.current;
      if (!shouldMeasureHeight) {
        const widthChanged = Math.abs(targetWidth - rectWidth) > 1;
        if (widthChanged) {
          const widthDelta = targetWidth - rectWidth;
          const newX =
            textAlign === "right"
              ? currentRect.x + (rectWidth - targetWidth)
              : textAlign === "center"
              ? currentRect.x - widthDelta / 2
              : currentRect.x;
          emitRectChange({
            ...currentRect,
            x: newX,
            width: targetWidth,
          });
        }
        wasMultiLineRef.current = isMultiLine;
        return;
      }
      const { targetHeight } = computeTextBoxSize({
        measure,
        htmlContent,
        text,
        rect: currentRect,
        minWidth,
        minHeight,
        widthMode: "auto",
        maxWidth,
      });
      const widthChanged = Math.abs(targetWidth - rectWidth) > 1;
      const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
      if (widthChanged || heightChanged) {
        const widthDelta = targetWidth - rectWidth;
        const newX =
          textAlign === "right"
            ? currentRect.x + (rectWidth - targetWidth)
            : textAlign === "center"
            ? currentRect.x - widthDelta / 2
            : currentRect.x;
        emitRectChange({
          ...currentRect,
          x: newX,
          width: targetWidth,
          height: targetHeight,
        });
      }
      wasMultiLineRef.current = isMultiLine;
    } else {
      const singleLineWidth = getSingleLineWidth();
      const isMultiLine = singleLineWidth > rectWidth || hasLineBreaks;
      const shouldMeasureHeight = isMultiLine || wasMultiLineRef.current;
      if (!shouldMeasureHeight) {
        wasMultiLineRef.current = isMultiLine;
        return;
      }
      const { targetHeight } = computeTextBoxSize({
        measure,
        htmlContent,
        text,
        rect: currentRect,
        minWidth,
        minHeight,
        widthMode: "fixed",
        maxWidth,
      });
      const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
      if (heightChanged) {
        emitRectChange({
          ...currentRect,
          height: targetHeight,
        });
      }
      wasMultiLineRef.current = isMultiLine;
    }
  }, [
    isEditing,
    widthMode,
    minHeight,
    minWidth,
    rectWidth,
    richText,
    styleSignature,
    text,
    textAlign,
    boxRef,
    editableRef,
    isResizingRef,
    measureRef,
  ]);
};
