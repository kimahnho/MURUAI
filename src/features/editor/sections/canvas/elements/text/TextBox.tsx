/**
 * 텍스트 요소 본문 렌더링과 편집 진입/선택 상태를 처리하는 컴포넌트.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ResizeHandle } from "../../../../model/canvasTypes";
import TextToolBar from "./TextToolBar";
import { isTextEmpty } from "./textContentUtils";
import { selectWordAtPoint } from "./textSelection";
import type { TextBoxProps } from "./textBoxTypes";
import { useTextBoxAutoResize } from "./hooks/useTextBoxAutoResize";
import { useTextBoxEditingHandlers } from "./hooks/useTextBoxEditingHandlers";
import { useTextBoxInteraction } from "./hooks/useTextBoxInteraction";
import { useTextBoxSelectionEffect } from "./hooks/useTextBoxSelectionEffect";
const TextBox = ({
  text,
  richText,
  editable = false,
  rect,
  minWidth = 1,
  minHeight = 1,
  className = "",
  showChrome = true,
  textClassName = "",
  textStyle,
  textAlign = "center",
  textAlignY = "middle",
  isSelected = false,
  selectionCount = 0,
  isEditing = false,
  locked = false,
  clipOverflow = false,
  widthMode = "auto",
  showToolbar = true,
  toolbar,
  onTextChange,
  onRectChange,
  onWidthModeChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
  onStartEditing,
  onFinishEditing,
  onRequestDelete,
  transformRect,
}: TextBoxProps) => {
  const rectRef = useRef(rect);
  const pendingCaretRef = useRef<{ x: number; y: number } | null>(null);
  const pendingWordSelectRef = useRef<{ x: number; y: number } | null>(null);
  const pendingEditRef = useRef(false);
  const didMoveRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const wasEditingRef = useRef(false);
  const isComposingRef = useRef(false);
  const isResizingRef = useRef(false);
  const toolbarPortal =
    typeof document !== "undefined"
      ? document.getElementById("text-toolbar-root")
      : null;
  const styleSignature = [
    textStyle?.fontSize,
    textStyle?.fontWeight,
    textStyle?.lineHeight,
    textStyle?.letterSpacing,
    textStyle?.fontFamily,
    textStyle?.fontStyle,
  ].join("|");

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    const wasEditing = wasEditingRef.current;
    if (!isEditing && wasEditing && isTextEmpty(text, richText)) {
      onRequestDelete?.();
    }
    if (isEditing && !wasEditing) {
      const editable = editableRef.current;
      if (editable) {
        editable.innerHTML = richText || text;
      }
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, richText, text, onRequestDelete]);

  useTextBoxSelectionEffect({
    isEditing,
    editableRef,
    pendingCaretRef,
    pendingWordSelectRef,
  });

  useTextBoxAutoResize({
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
  });

  const { startAction, cleanup } = useTextBoxInteraction({
    locked,
    editable,
    isEditing,
    text,
    richText,
    minWidth,
    minHeight,
    widthMode,
    isSelected,
    selectionCount,
    toolbar,
    onRequestDelete,
    onFinishEditing,
    onSelectChange,
    onWidthModeChange,
    onDragStateChange,
    onRectChange,
    transformRect,
    rectRef,
    boxRef,
    measureRef,
    editableRef,
    isResizingRef,
    didMoveRef,
  });

  useEffect(() => cleanup, [cleanup]);

  const {
    beginEditing,
    handleEditingBlur,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleCompositionStart,
    handleCompositionEnd,
    handleToggleBold,
    handleToggleUnderline,
    handleToggleItalic,
    handleToggleStrikethrough,
    handleColorChange,
    handleFontSizeStep,
    handleFontSizeTypeStart,
    handleFontSizeTypeCommit,
    handleFontSizeTypeCancel,
    handleFontSizeTypingDigit,
    handleFontSizeTypingBackspace,
    handleToolbarPointerDown,
    fontSizeUiState,
    fontSizeTypingState,
  } = useTextBoxEditingHandlers({
    editable,
    locked,
    isEditing,
    isSelected,
    selectionCount,
    text,
    richText,
    toolbar,
    onTextChange,
    onSelectChange,
    onStartEditing,
    onFinishEditing,
    onRequestDelete,
    isComposingRef,
    editableRef,
  });

  const handleSize = 10;
  const halfHandle = handleSize / 2;

  const renderHandle = (handle: ResizeHandle, cursor: string) => {
    const position =
      handle === "nw"
        ? { left: -halfHandle, top: -halfHandle }
        : handle === "ne"
          ? { right: -halfHandle, top: -halfHandle }
          : handle === "sw"
            ? { left: -halfHandle, bottom: -halfHandle }
            : handle === "se"
              ? { right: -halfHandle, bottom: -halfHandle }
              : handle === "n"
                ? {
                    left: "50%",
                    top: -halfHandle,
                    transform: "translateX(-50%)",
                  }
                : handle === "s"
                  ? {
                      left: "50%",
                      bottom: -halfHandle,
                      transform: "translateX(-50%)",
                    }
                  : handle === "e"
                    ? {
                        right: -halfHandle,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }
                    : {
                        left: -halfHandle,
                        top: "50%",
                        transform: "translateY(-50%)",
                      };

    return (
      <div
        key={handle}
        onPointerDown={(event) => {
          startAction(event, "resize", handle);
        }}
        data-capture-handle="true"
        className="absolute rounded-sm border border-primary bg-white-100"
        style={{
          width: handleSize,
          height: handleSize,
          cursor,
          ...position,
        }}
      />
    );
  };

  const justifyClass =
    textAlign === "left"
      ? "justify-start"
      : textAlign === "right"
        ? "justify-end"
        : "justify-center";
  const alignYClass =
    textAlignY === "top"
      ? "items-start"
      : textAlignY === "bottom"
        ? "items-end"
        : "items-center";
  const showOutline = showChrome && !locked && isSelected;
  const showHandles = showChrome && !locked && isSelected && selectionCount <= 1;
  // 텍스트가 박스 폭을 초과하면 줄바꿈
  const contentWhiteSpace = "pre-wrap";

  return (
    <div
      ref={boxRef}
      data-textbox="true"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (isEditing) {
          event.stopPropagation();
          return;
        }
        didMoveRef.current = false;
        // [인터랙션 플로우] 이미 선택된 상태에서만 편집 진입 가능
        pendingEditRef.current =
          editable && !isEditing && !locked && !event.shiftKey && isSelected;
        if (pendingEditRef.current) {
          pendingCaretRef.current = { x: event.clientX, y: event.clientY };
        }
        if (editable && !isEditing && !isSelected) {
          // 1단계: 첫 클릭은 선택만 수행하고 편집 진입은 보류한다.
          onSelectChange?.(true, { additive: event.shiftKey });
        }
        startAction(event, "drag");
      }}
      onPointerUp={(event) => {
        if (!pendingEditRef.current) return;
        pendingEditRef.current = false;
        if (event.button !== 0) return;
        if (didMoveRef.current) return;
        if (!editable || locked) return;
        // 2단계: 이동이 없는 클릭이면 선택 상태에서 편집 모드로 진입한다.
        pendingCaretRef.current = { x: event.clientX, y: event.clientY };
        onStartEditing?.();
      }}
      onDoubleClick={(event) => {
        // 캔버스 상위 핸들러로 이벤트가 전파되어 선택이 풀리지 않게 차단한다.
        event.stopPropagation();

        if (isEditing) {
          // 편집 중 더블클릭은 브라우저 기본 단어 선택 동작을 사용한다.
          requestAnimationFrame(() => {
            selectWordAtPoint(editableRef.current, {
              x: event.clientX,
              y: event.clientY,
            });
          });
          return;
        }
        // 3단계: 더블클릭 좌표를 저장해 편집 진입 직후 단어 선택을 복원한다.
        pendingWordSelectRef.current = { x: event.clientX, y: event.clientY };
        pendingCaretRef.current = { x: event.clientX, y: event.clientY };
        beginEditing(event, { allowDefault: true });
      }}
      onContextMenu={onContextMenu}
      className={`absolute flex select-none ${justifyClass} ${alignYClass} ${className}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        overflow: clipOverflow ? "hidden" : "visible",
        touchAction: "none",
        pointerEvents: locked ? "none" : "auto",
        cursor:
          isSelected && !isEditing ? "move" : editable ? "text" : "default",
      }}
    >
      {showOutline && (
        <div className="absolute inset-0 border-2 border-primary pointer-events-none" />
      )}
      {editable && isEditing ? (
        <div
          ref={editableRef}
          data-textbox-content="true"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={handleEditingBlur}
          // 편집 중 포인터 이벤트가 상위로 전파되어 선택이 초기화되지 않게 차단한다.
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          // 편집 모드에서 텍스트 선택을 보장한다.
          className={`w-full select-text outline-none no-text-underline textbox-force-font-family ${textClassName}`}
          style={{
            ...textStyle,
            textAlign,
            whiteSpace: contentWhiteSpace,
            padding: 0,
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        />
      ) : (
        <div
          data-textbox-content="true"
          className={`block w-full pointer-events-none textbox-force-font-family ${textClassName}`}
          style={{
            ...textStyle,
            textAlign,
            whiteSpace: contentWhiteSpace,
            padding: 0,
            background: "transparent",
            border: "none",
            boxShadow: "none",
          }}
          dangerouslySetInnerHTML={{ __html: richText || text }}
        />
      )}
      {showHandles && (
        <>
          {renderHandle("nw", "nwse-resize")}
          {renderHandle("ne", "nesw-resize")}
          {renderHandle("sw", "nesw-resize")}
          {renderHandle("se", "nwse-resize")}
          {renderHandle("e", "ew-resize")}
          {renderHandle("w", "ew-resize")}
        </>
      )}
      {showHandles && (
        <div
          className="absolute left-1/2 top-full mt-1 w-32 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap z-50"
          style={{ pointerEvents: "none" }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
      {editable &&
        toolbar &&
        isSelected &&
        !locked &&
        showToolbar &&
        (toolbarPortal ? (
          createPortal(
            <div
              data-textbox-toolbar="true"
              className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto"
              onPointerDownCapture={() => {
                handleToolbarPointerDown();
              }}
              onMouseDown={(event) => {
                // 숫자 입력창 포커스는 유지하고, 그 외 클릭은 포커스 이탈을 막는다.
                const target = event.target as HTMLElement;
                const isFocusableInput =
                  target.tagName === "INPUT" &&
                  target.getAttribute("data-fontsize-readonly") !== "true";
                if (!isFocusableInput) {
                  event.preventDefault();
                }
              }}
            >
              <TextToolBar
                isVisible
                minFontSize={toolbar.minFontSize}
                maxFontSize={toolbar.maxFontSize}
                fontSize={toolbar.fontSize}
                fontSizeDisplay={fontSizeUiState.displayValue}
                isFontSizeMixed={fontSizeUiState.isMixed}
                fontFamily={toolbar.fontFamily}
                fontLabel={toolbar.fontLabel}
                lineHeight={toolbar.lineHeight}
                letterSpacing={toolbar.letterSpacing}
                color={toolbar.color}
                isBold={toolbar.isBold}
                isUnderline={toolbar.isUnderline}
                isItalic={toolbar.isItalic}
                isStrikethrough={toolbar.isStrikethrough}
                align={toolbar.align}
                alignY={toolbar.alignY}
                onFontSizeStep={handleFontSizeStep}
                onFontSizeTypingStart={handleFontSizeTypeStart}
                onFontSizeTypingDigit={handleFontSizeTypingDigit}
                onFontSizeTypingBackspace={handleFontSizeTypingBackspace}
                onFontSizeTypingCommit={handleFontSizeTypeCommit}
                onFontSizeTypingCancel={handleFontSizeTypeCancel}
                fontSizeTypingActive={fontSizeTypingState.active}
                fontSizeTypingBuffer={fontSizeTypingState.buffer}
                onLineHeightChange={toolbar.onLineHeightChange}
                onLetterSpacingChange={toolbar.onLetterSpacingChange}
                onColorChange={handleColorChange}
                onFontFamilyClick={toolbar.onFontFamilyClick}
                onToggleBold={handleToggleBold}
                onToggleUnderline={handleToggleUnderline}
                onToggleItalic={handleToggleItalic}
                onToggleStrikethrough={handleToggleStrikethrough}
                onAlignChange={toolbar.onAlignChange}
                onAlignYChange={toolbar.onAlignYChange}
              />
            </div>,
            toolbarPortal,
          )
        ) : (
          <div
            data-textbox-toolbar="true"
            className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto"
            onPointerDownCapture={() => {
              handleToolbarPointerDown();
            }}
            onMouseDown={(event) => {
              // 숫자 입력창 포커스는 유지하고, 그 외 클릭은 포커스 이탈을 막는다.
              const target = event.target as HTMLElement;
              const isFocusableInput =
                target.tagName === "INPUT" &&
                target.getAttribute("data-fontsize-readonly") !== "true";
              if (!isFocusableInput) {
                event.preventDefault();
              }
            }}
          >
            <TextToolBar
              isVisible
              minFontSize={toolbar.minFontSize}
              maxFontSize={toolbar.maxFontSize}
              fontSize={toolbar.fontSize}
              fontSizeDisplay={fontSizeUiState.displayValue}
              isFontSizeMixed={fontSizeUiState.isMixed}
              fontFamily={toolbar.fontFamily}
              fontLabel={toolbar.fontLabel}
              lineHeight={toolbar.lineHeight}
              letterSpacing={toolbar.letterSpacing}
              color={toolbar.color}
              isBold={toolbar.isBold}
              isUnderline={toolbar.isUnderline}
              isItalic={toolbar.isItalic}
              isStrikethrough={toolbar.isStrikethrough}
              align={toolbar.align}
              alignY={toolbar.alignY}
              onFontSizeStep={handleFontSizeStep}
              onFontSizeTypingStart={handleFontSizeTypeStart}
              onFontSizeTypingDigit={handleFontSizeTypingDigit}
              onFontSizeTypingBackspace={handleFontSizeTypingBackspace}
              onFontSizeTypingCommit={handleFontSizeTypeCommit}
              onFontSizeTypingCancel={handleFontSizeTypeCancel}
              fontSizeTypingActive={fontSizeTypingState.active}
              fontSizeTypingBuffer={fontSizeTypingState.buffer}
              onLineHeightChange={toolbar.onLineHeightChange}
              onLetterSpacingChange={toolbar.onLetterSpacingChange}
              onColorChange={handleColorChange}
              onFontFamilyClick={toolbar.onFontFamilyClick}
              onToggleBold={handleToggleBold}
              onToggleUnderline={handleToggleUnderline}
              onToggleItalic={handleToggleItalic}
              onToggleStrikethrough={handleToggleStrikethrough}
              onAlignChange={toolbar.onAlignChange}
              onAlignYChange={toolbar.onAlignYChange}
            />
          </div>
        ))}
      <div
        ref={measureRef}
        aria-hidden
        className={`absolute left-0 top-0 pointer-events-none opacity-0 ${textClassName}`}
        style={{
          ...textStyle,
          display: "inline-block",
          visibility: "hidden",
          whiteSpace: contentWhiteSpace,
          padding: 0,
          border: "none",
          background: "transparent",
        }}
      />
    </div>
  );
};

export default TextBox;
