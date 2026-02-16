/**
 * 텍스트 입력/포맷/키보드 편집 이벤트를 처리하는 텍스트 편집 훅.
 * 편집 세션/selection/toolbar intent는 전용 controller로 위임한다.
 */
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEventHandler,
  type FormEventHandler,
  type KeyboardEventHandler,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type MutableRefObject,
  type RefObject,
} from "react";
import { isTextEmpty, applyFontSizeInPlace } from "../textContentUtils";
import type { TextBoxProps } from "../textBoxTypes";
import {
  getLiveRangeInEditable,
  normalizeSelectionRange,
  resolveFontSizeUiStateFromRange,
  type FontSizeUiState,
} from "../textSelectionSession";
import { useTextEditingSessionController } from "./useTextEditingSessionController";

type UseTextBoxEditingHandlersProps = {
  editable: boolean;
  locked: boolean;
  isEditing: boolean;
  isSelected: boolean;
  selectionCount: number;
  text: string;
  richText?: string;
  toolbar?: TextBoxProps["toolbar"];
  onTextChange?: TextBoxProps["onTextChange"];
  onSelectChange?: TextBoxProps["onSelectChange"];
  onStartEditing?: TextBoxProps["onStartEditing"];
  onFinishEditing?: TextBoxProps["onFinishEditing"];
  onRequestDelete?: TextBoxProps["onRequestDelete"];
  isComposingRef: MutableRefObject<boolean>;
  editableRef: RefObject<HTMLDivElement | null>;
};

type BeginEditingOptions = { allowDefault?: boolean };

type BeginEditingEvent =
  | ReactPointerEvent<HTMLDivElement>
  | ReactMouseEvent<HTMLDivElement>;

type FontSizeTypingState = {
  active: boolean;
  buffer: string;
};

const FALLBACK_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 120;

const clampFontSize = (size: number, toolbar?: TextBoxProps["toolbar"]) => {
  const min = toolbar?.minFontSize ?? MIN_FONT_SIZE;
  const max = toolbar?.maxFontSize ?? MAX_FONT_SIZE;
  return Math.min(max, Math.max(min, size));
};

export const useTextBoxEditingHandlers = ({
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
}: UseTextBoxEditingHandlersProps) => {
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [fontSizeTypingState, setFontSizeTypingState] =
    useState<FontSizeTypingState>({ active: false, buffer: "" });
  const [fontSizeUiState, setFontSizeUiState] = useState<FontSizeUiState>({
    resolvedSize: clampFontSize(toolbar?.fontSize ?? FALLBACK_FONT_SIZE, toolbar),
    isMixed: false,
    displayValue: String(
      clampFontSize(toolbar?.fontSize ?? FALLBACK_FONT_SIZE, toolbar)
    ),
  });
  const lastResolvedFontSizeRef = useRef(
    clampFontSize(toolbar?.fontSize ?? FALLBACK_FONT_SIZE, toolbar)
  );

  const session = useTextEditingSessionController({
    isEditing,
    editableRef,
  });

  const fallbackFontSize = clampFontSize(
    toolbar?.fontSize ?? FALLBACK_FONT_SIZE,
    toolbar
  );

  // ── Selection 헬퍼 ──

  /** editable 내 live selection을 가져오거나, snapshot에서 복원한다 */
  const getSelectionRange = () =>
    normalizeSelectionRange({
      editable: editableRef.current,
      snapshot: session.selectionSnapshotRef.current,
    });

  /**
   * 툴바 조작 전용: snapshot이 non-collapsed이면 우선 사용한다.
   * 툴바 클릭으로 editable이 blur되어 live selection이 collapsed가 되었을 때
   * 이전에 사용자가 선택한 범위를 복원한다.
   */
  const ensureToolbarSelection = (): { selection: Selection; range: Range } | null => {
    const editable = editableRef.current;
    if (!editable) return null;

    // 1. snapshot에 non-collapsed range가 있으면 반드시 복원
    const snapshot = session.selectionSnapshotRef.current;
    if (snapshot && !snapshot.range.collapsed) {
      // editable에 focus를 먼저 잡아야 selection이 제대로 동작
      editable.focus();
      session.restoreSelectionFromSnapshot();
      const live = getLiveRangeInEditable(editable);
      if (live && !live.range.collapsed) return live;
    }

    // 2. live selection 시도
    editable.focus();
    const live = getLiveRangeInEditable(editable);
    if (live) return live;

    // 3. snapshot fallback
    return getSelectionRange();
  };

  // ── Font Size UI 동기화 ──

  const syncFontSizeUiState = () => {
    if (!isEditing) {
      lastResolvedFontSizeRef.current = fallbackFontSize;
      setFontSizeUiState({
        resolvedSize: fallbackFontSize,
        isMixed: false,
        displayValue: String(fallbackFontSize),
      });
      return;
    }
    const normalized = getSelectionRange();
    if (!normalized) {
      const preserved = lastResolvedFontSizeRef.current;
      setFontSizeUiState((prev) => ({
        resolvedSize: preserved,
        isMixed: prev.isMixed,
        displayValue: prev.isMixed ? "--" : String(preserved),
      }));
      return;
    }
    const next = resolveFontSizeUiStateFromRange({
      range: normalized.range,
      fallback: fallbackFontSize,
      clamp: (value) => clampFontSize(value, toolbar),
    });
    lastResolvedFontSizeRef.current = next.resolvedSize;
    setFontSizeUiState(next);
  };

  const syncFontSizeUiStateRef = useRef(syncFontSizeUiState);
  useEffect(() => {
    syncFontSizeUiStateRef.current = syncFontSizeUiState;
  });

  // ── DOM 변경 헬퍼 ──

  const emitTextChange = () => {
    const editableNode = editableRef.current;
    if (!editableNode) return;
    onTextChange?.(editableNode.innerText, editableNode.innerHTML);
  };

  // ── 폰트 크기 in-place 적용 ──

  const applyFontSizeToSelection = (
    resolveSize: (baseSize: number) => number
  ): boolean => {
    const normalized = ensureToolbarSelection();
    if (!normalized) return false;
    const { selection, range } = normalized;
    if (range.collapsed || !range.toString()) return false;

    const editable = editableRef.current;
    if (!editable) return false;

    const nextRange = applyFontSizeInPlace(
      range,
      editable,
      resolveSize,
      fallbackFontSize,
    );
    if (!nextRange) return false;

    selection.removeAllRanges();
    selection.addRange(nextRange);
    session.setSelectionSnapshot(nextRange);
    emitTextChange();
    syncFontSizeUiState();
    return true;
  };

  // ── Effects ──

  useEffect(() => {
    if (!isEditing) return;
    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
    };
    const handleSelectionChange = () => {
      session.captureSelectionIfInsideEditable();
      syncFontSizeUiStateRef.current();
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("selectionchange", handleSelectionChange);
    const rafId = requestAnimationFrame(() => {
      syncFontSizeUiStateRef.current();
    });
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [isEditing, session, session.captureSelectionIfInsideEditable, toolbar]);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      syncFontSizeUiStateRef.current();
    });
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isEditing, toolbar?.fontSize]);

  // ── 편집 시작/종료 ──

  const beginEditing = (
    event: BeginEditingEvent,
    options?: BeginEditingOptions
  ) => {
    if (!editable || locked) return;
    if (!options?.allowDefault) {
      event.preventDefault();
    }
    event.stopPropagation();
    const shouldResetSelection =
      isSelected && !event.shiftKey && selectionCount > 1;
    if (!isSelected || shouldResetSelection) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
    session.beginEditingSession();
    onStartEditing?.();
  };

  // ── 스타일 적용 (bold/italic/underline 등) ──

  const applyStyleToSelection = (command: string, value?: string) => {
    if (!isEditing) return;
    const normalized = ensureToolbarSelection();
    if (!normalized) return;
    const { selection } = normalized;
    const hasSelection = !selection.isCollapsed;
    document.execCommand(command, false, value);
    if (hasSelection && selection.rangeCount > 0) {
      session.setSelectionSnapshot(selection.getRangeAt(0));
    }
    emitTextChange();
  };

  const handleToggleBold = () => {
    if (isEditing) applyStyleToSelection("bold");
    else toolbar?.onToggleBold();
  };

  const handleToggleUnderline = () => {
    if (isEditing) applyStyleToSelection("underline");
    else toolbar?.onToggleUnderline();
  };

  const handleToggleItalic = () => {
    if (isEditing) applyStyleToSelection("italic");
    else toolbar?.onToggleItalic();
  };

  const handleToggleStrikethrough = () => {
    if (isEditing) applyStyleToSelection("strikeThrough");
    else toolbar?.onToggleStrikethrough();
  };

  const handleColorChange = (color: string) => {
    if (isEditing) applyStyleToSelection("foreColor", color);
    else toolbar?.onColorChange(color);
  };

  // ── 폰트 크기 변경 ──

  const handleFontSizeChange = (size: number) => {
    const clamped = clampFontSize(size, toolbar);
    if (isEditing) {
      const applied = applyFontSizeToSelection(() => clamped);
      if (!applied) toolbar?.onFontSizeChange(clamped);
      return;
    }
    toolbar?.onFontSizeChange(clamped);
  };

  const handleFontSizeStep = (delta: number) => {
    if (isEditing) {
      const applied = applyFontSizeToSelection((baseSize) =>
        clampFontSize(baseSize + delta, toolbar)
      );
      if (!applied) {
        const baseSize = fontSizeUiState.resolvedSize;
        toolbar?.onFontSizeChange(clampFontSize(baseSize + delta, toolbar));
      }
      return;
    }
    toolbar?.onFontSizeStep(delta);
  };

  // ── 폰트 크기 직접 입력 ──

  const applyFontSizeFromBuffer = (buffer: string) => {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    const next = Number(trimmed);
    if (!Number.isFinite(next) || next <= 0) return;
    handleFontSizeChange(next);
  };

  const handleFontSizeTypeStart = () => {
    if (!isEditing) return;
    // 현재 selection을 snapshot으로 확정
    const normalized = ensureToolbarSelection();
    if (normalized) {
      session.setSelectionSnapshot(normalized.range);
    }
    session.startToolbarTyping("fontSize");
    setFontSizeTypingState({ active: true, buffer: "" });
  };

  const handleFontSizeTypingDigit = (digit: string) => {
    if (!/^\d$/.test(digit)) return;
    setFontSizeTypingState((prev) => {
      const nextBuffer = `${prev.buffer}${digit}`.slice(0, 3);
      applyFontSizeFromBuffer(nextBuffer);
      return { active: true, buffer: nextBuffer };
    });
  };

  const handleFontSizeTypingBackspace = () => {
    setFontSizeTypingState((prev) => {
      const nextBuffer = prev.buffer.slice(0, -1);
      applyFontSizeFromBuffer(nextBuffer);
      return { active: true, buffer: nextBuffer };
    });
  };

  const handleFontSizeTypeCancel = () => {
    setFontSizeTypingState({ active: false, buffer: "" });
    session.endToolbarTyping();
    editableRef.current?.focus();
    session.restoreSelectionFromSnapshot();
  };

  const handleFontSizeTypeCommit = () => {
    const buffer = fontSizeTypingState.buffer;
    setFontSizeTypingState({ active: false, buffer: "" });
    session.endToolbarTyping();
    if (buffer.length > 0) {
      applyFontSizeFromBuffer(buffer);
    }
    editableRef.current?.focus();
    session.restoreSelectionFromSnapshot();
  };

  // ── 텍스트 입력/붙여넣기 ──

  const insertPlainText = (value: string) => {
    const normalized = getSelectionRange();
    if (!normalized) return;
    const { selection, range } = normalized;
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, value);
      session.captureSelectionIfInsideEditable();
      return;
    }
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    const lines = value.split(/\r?\n/);
    let lastNode: ChildNode | null = null;
    lines.forEach((line, index) => {
      if (index > 0) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastNode = br;
      }
      if (line.length > 0) {
        const textNode = document.createTextNode(line);
        fragment.appendChild(textNode);
        lastNode = textNode;
      }
    });
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      session.setSelectionSnapshot(range);
    }
  };

  // ── 이벤트 핸들러 ──

  const handleEditingBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (isComposingRef.current) return;
    const shouldFinish = session.shouldFinishEditingOnBlur({
      relatedTarget: event.relatedTarget as HTMLElement | null,
      pointer: mousePositionRef.current,
    });

    if (!shouldFinish) {
      requestAnimationFrame(() => {
        editableRef.current?.focus();
        session.restoreSelectionFromSnapshot();
      });
      return;
    }

    if (fontSizeTypingState.active) {
      if (fontSizeTypingState.buffer.length > 0) {
        applyFontSizeFromBuffer(fontSizeTypingState.buffer);
      }
      setFontSizeTypingState({ active: false, buffer: "" });
      session.endToolbarTyping();
    }

    const editableNode = editableRef.current;
    const nextText = editableNode?.innerText ?? text;
    const nextRichText = editableNode?.innerHTML ?? richText;
    if (isTextEmpty(nextText, nextRichText)) {
      if (onRequestDelete) onRequestDelete();
      else onFinishEditing?.();
      return;
    }
    onFinishEditing?.();
  };

  const handleInput: FormEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    onTextChange?.(target.innerText, target.innerHTML);
    session.captureSelectionIfInsideEditable();
    syncFontSizeUiState();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.nativeEvent.isComposing || isComposingRef.current) return;

    if (fontSizeTypingState.active) {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        handleFontSizeTypingDigit(event.key);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        handleFontSizeTypingBackspace();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        handleFontSizeTypeCommit();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        handleFontSizeTypeCancel();
        return;
      }
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
      event.preventDefault();
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const pastedText = event.clipboardData?.getData("text/plain") ?? "";
    if (!pastedText) return;
    insertPlainText(pastedText);
    emitTextChange();
    syncFontSizeUiState();
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  /**
   * 툴바 포인터다운: selection을 snapshot에 저장하고 toolbar intent를 설정한다.
   * focus 복원은 rAF가 아니라 각 액션 함수(ensureToolbarSelection) 내에서 동기적으로 처리한다.
   */
  const handleToolbarPointerDown = () => {
    if (!isEditing) return;
    session.captureSelectionIfInsideEditable();
    session.setToolbarIntent({ insideToolbar: true });
  };

  return {
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
  };
};
