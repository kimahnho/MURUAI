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
  rectRef,
  editableRef,
  measureRef,
  boxRef,
  isResizingRef,
}: UseTextBoxAutoResizeProps) => {
  // element 모드에서 캔버스 경계 도달 여부를 추적
  const hasReachedBoundaryRef = useRef(false);
  const wasMultiLineRef = useRef(false);

  useEffect(() => {
    if (!onRectChange) return;
    if (isResizingRef.current) return;
    const measure = measureRef.current;
    if (!measure) return;
    const editableNode = editableRef.current;
    const currentRect = rectRef.current ?? rect;
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

    // element 모드: 너비 고정, 캔버스 경계 도달 시에만 줄바꿈 계산
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
          onRectChange({
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
          onRectChange({
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
          onRectChange({
            ...currentRect,
            height: targetHeight,
          });
        }
      }
      wasMultiLineRef.current = isMultiLine;
      return;
    }

    // auto/fixed 모드: 기존 로직
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
          onRectChange({
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
        onRectChange({
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
        onRectChange({
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
    onRectChange,
    rect,
    richText,
    styleSignature,
    text,
    textAlign,
    boxRef,
    editableRef,
    isResizingRef,
    measureRef,
    rectRef,
  ]);
};
