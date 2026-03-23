/**
 * 텍스트 입력/포맷/키보드 편집 이벤트를 처리하는 텍스트 편집 훅.
 * 편집 세션/selection/toolbar intent는 전용 controller로 위임한다.
 */
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEventHandler,
  type FocusEvent,
  type FormEventHandler,
  type KeyboardEventHandler,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  isTextEmpty,
  normalizeInlineFontSizeOverrides,
  resolveInlineFontSize,
} from "../textContentUtils";
import type { TextBoxProps } from "../textBoxTypes";
import {
  resolveFontSizeUiStateFromRange,
  resolveFontFamilyFromRange,
  type FontSizeUiState,
  type FontFamilyUiState,
} from "../textSelectionSession";
import { useTextFormattingCommands } from "./useTextFormattingCommands";
import { useTextSelectionSession } from "./useTextSelectionSession";
import { useToolbarFontSizeInput } from "./useToolbarFontSizeInput";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";
import { getFontLabel, matchFontFamily } from "@/shared/utils/fontOptions";

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

const FALLBACK_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 120;

const clampFontSize = (size: number, toolbar?: TextBoxProps["toolbar"]) => {
  const min = toolbar?.minFontSize ?? MIN_FONT_SIZE;
  const max = toolbar?.maxFontSize ?? MAX_FONT_SIZE;
  return Math.min(max, Math.max(min, size));
};

const resolveFontSizeUiStateFromRichText = ({
  richText,
  fallback,
  clamp,
}: {
  richText?: string;
  fallback: number;
  clamp: (value: number) => number;
}): FontSizeUiState => {
  const normalizedFallback = clamp(fallback);
  if (
    !richText ||
    typeof window === "undefined" ||
    typeof DOMParser === "undefined"
  ) {
    return {
      resolvedSize: normalizedFallback,
      isMixed: false,
      displayValue: String(normalizedFallback),
    };
  }

  const doc = new DOMParser().parseFromString(richText, "text/html");
  const sizes = new Set<number>();
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (textNode.textContent && textNode.textContent.trim().length > 0) {
      sizes.add(clamp(resolveInlineFontSize(textNode, normalizedFallback)));
      if (sizes.size > 1) {
        return {
          resolvedSize: normalizedFallback,
          isMixed: true,
          displayValue: "--",
        };
      }
    }
    current = walker.nextNode();
  }

  if (sizes.size === 1) {
    const [size] = Array.from(sizes);
    return { resolvedSize: size, isMixed: false, displayValue: String(size) };
  }

  return {
    resolvedSize: normalizedFallback,
    isMixed: false,
    displayValue: String(normalizedFallback),
  };
};

const resolveWholeContentFontSizeUiState = ({
  isEditing,
  editableRef,
  richText,
  fallback,
  clamp,
}: {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  richText?: string;
  fallback: number;
  clamp: (value: number) => number;
}): FontSizeUiState => {
  const sourceRichText = isEditing
    ? (editableRef.current?.innerHTML ?? richText)
    : richText;
  return resolveFontSizeUiStateFromRichText({
    richText: sourceRichText,
    fallback,
    clamp,
  });
};

// 노드에서 가장 가까운 인라인 font-family를 읽는다.
const resolveInlineFontFamily = (node: Node, fallback: string): string => {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement;
      if (el.style.fontFamily) {
        return el.style.fontFamily;
      }
    }
    current = current.parentNode;
  }
  return fallback;
};

const normalizeFontFamilyKey = (ff: string): string =>
  ff.replace(/["']/g, "").split(",")[0].trim().toLowerCase();

const resolveFontFamilyUiStateFromRichText = ({
  richText,
  fallback,
}: {
  richText?: string;
  fallback: string;
}): FontFamilyUiState => {
  if (
    !richText ||
    typeof window === "undefined" ||
    typeof DOMParser === "undefined"
  ) {
    return { fontFamily: fallback, isMixed: false };
  }

  const doc = new DOMParser().parseFromString(richText, "text/html");
  const families = new Set<string>();
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (textNode.textContent && textNode.textContent.trim().length > 0) {
      families.add(normalizeFontFamilyKey(resolveInlineFontFamily(textNode, fallback)));
      if (families.size > 1) {
        return { fontFamily: fallback, isMixed: true };
      }
    }
    current = walker.nextNode();
  }

  if (families.size === 1) {
    const [family] = Array.from(families);
    // 원본 fontFamily 값을 복원한다
    const raw = resolveInlineFontFamily(
      doc.body.querySelector("*") ?? doc.body,
      fallback,
    );
    return {
      fontFamily: normalizeFontFamilyKey(raw) === family ? raw : fallback,
      isMixed: false,
    };
  }

  return { fontFamily: fallback, isMixed: false };
};

const resolveWholeContentFontFamilyUiState = ({
  isEditing,
  editableRef,
  richText,
  fallback,
}: {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  richText?: string;
  fallback: string;
}): FontFamilyUiState => {
  const sourceRichText = isEditing
    ? (editableRef.current?.innerHTML ?? richText)
    : richText;
  return resolveFontFamilyUiStateFromRichText({
    richText: sourceRichText,
    fallback,
  });
};

const hasLiveExpandedSelectionInEditable = (
  editable: HTMLDivElement | null,
): boolean => {
  if (!editable || typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return false;
  return editable.contains(range.commonAncestorContainer);
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
  const [fontSizeUiState, setFontSizeUiState] = useState<FontSizeUiState>({
      resolvedSize: clampFontSize(toolbar?.fontSize ?? FALLBACK_FONT_SIZE, toolbar),
      isMixed: false,
      displayValue: String(
        clampFontSize(toolbar?.fontSize ?? FALLBACK_FONT_SIZE, toolbar),
      ),
    });

  const fallbackFontFamily = toolbar?.fontFamily ?? "Pretendard";
  const [fontFamilyUiState, setFontFamilyUiState] = useState<FontFamilyUiState>({
    fontFamily: fallbackFontFamily,
    isMixed: false,
  });

  const fontSizeInputStartedInEditingRef = useRef(false);
  const lastResolvedFontSizeRef = useRef(
    clampFontSize(toolbar?.fontSize ?? FALLBACK_FONT_SIZE, toolbar),
  );

  const selectionSession = useTextSelectionSession({
    isEditing,
    editableRef,
  });

  const fallbackFontSize = clampFontSize(
    toolbar?.fontSize ?? FALLBACK_FONT_SIZE,
    toolbar,
  );

  const syncFontSizeUiState = () => {
    if (!isEditing) {
      const next = resolveWholeContentFontSizeUiState({
        isEditing,
        editableRef,
        richText,
        fallback: fallbackFontSize,
        clamp: (value) => clampFontSize(value, toolbar),
      });
      lastResolvedFontSizeRef.current = next.resolvedSize;
      setFontSizeUiState(next);

      const nextFF = resolveWholeContentFontFamilyUiState({
        isEditing,
        editableRef,
        richText,
        fallback: fallbackFontFamily,
      });
      setFontFamilyUiState(nextFF);
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const isToolbarInputFocused =
      activeElement?.tagName === "INPUT" &&
      Boolean(activeElement.closest("[data-textbox-toolbar]"));
    if (isToolbarInputFocused) {
      return;
    }

    const normalized = selectionSession.getSelectionRange();
    const next = normalized
      ? resolveFontSizeUiStateFromRange({
          range: normalized.range,
          fallback: fallbackFontSize,
          clamp: (value) => clampFontSize(value, toolbar),
        })
      : resolveWholeContentFontSizeUiState({
          isEditing,
          editableRef,
          richText,
          fallback: fallbackFontSize,
          clamp: (value) => clampFontSize(value, toolbar),
        });

    lastResolvedFontSizeRef.current = next.resolvedSize;
    setFontSizeUiState(next);

    const nextFF = normalized
      ? resolveFontFamilyFromRange({
          range: normalized.range,
          fallback: fallbackFontFamily,
        })
      : resolveWholeContentFontFamilyUiState({
          isEditing,
          editableRef,
          richText,
          fallback: fallbackFontFamily,
        });
    setFontFamilyUiState(nextFF);
  };

  const syncFontSizeUiStateRef = useRef(syncFontSizeUiState);
  useEffect(() => {
    syncFontSizeUiStateRef.current = syncFontSizeUiState;
  });

  const emitTextChange = () => {
    const editableNode = editableRef.current;
    if (!editableNode) return;
    onTextChange?.(editableNode.innerText, editableNode.innerHTML);
  };

  const formattingCommands = useTextFormattingCommands({
    isEditing,
    editableRef,
    fallbackFontSize,
    clampFontSize: (value) => clampFontSize(value, toolbar),
    selectionSession,
    emitTextChange,
    syncFontSizeUiState,
  });
  const captureSelectionIfInsideEditable =
    selectionSession.captureSelectionIfInsideEditable;
  const setToolbarInputActive = selectionSession.setToolbarInputActive;

  useEffect(() => {
    if (!isEditing) return;

    const handleSelectionChange = () => {
      captureSelectionIfInsideEditable();
      syncFontSizeUiStateRef.current();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    const rafId = requestAnimationFrame(() => {
      syncFontSizeUiStateRef.current();
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [isEditing, captureSelectionIfInsideEditable]);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      syncFontSizeUiStateRef.current();
    });
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isEditing, toolbar?.fontSize, richText, text]);

  useEffect(() => {
    if (isEditing) return;
    fontSizeInputStartedInEditingRef.current = false;
    setToolbarInputActive(false);
  }, [isEditing, setToolbarInputActive]);

  const handleToolbarInputFocus = () => {
    if (!isEditing) return;
    setToolbarInputActive(true);
  };

  const handleToolbarInputBlur = () => {
    if (!isEditing) return;
    requestAnimationFrame(() => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isToolbarInput =
        activeElement?.tagName === "INPUT" &&
        Boolean(activeElement.closest("[data-textbox-toolbar]"));
      if (isToolbarInput) return;
      setToolbarInputActive(false);
    });
  };

  const beginEditing = (
    event: BeginEditingEvent,
    options?: BeginEditingOptions,
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

    selectionSession.beginEditingSession();
    onStartEditing?.();
  };

  const handleFontSizeCommitValue = (value: number) => {
    const clamped = clampFontSize(value, toolbar);
    const shouldApplyInline =
      isEditing || fontSizeInputStartedInEditingRef.current;

    if (shouldApplyInline) {
      // input에서 editable로 focus가 돌아올 때 발생하는 selectionchange에서
      // 스냅샷이 collapsed로 덮어씌워지지 않도록 toolbar intent guard를 갱신한다.
      selectionSession.handleToolbarPointerDown();
      const applied = formattingCommands.applyFontSizeChange(clamped, {
        requireExpandedSelection: true,
      });
      if (!applied) {
        toolbar?.onFontSizeChange(clamped);
      }
      return;
    }

    toolbar?.onFontSizeChange(clamped);
  };

  const fontSizeInputState = useToolbarFontSizeInput({
    displayValue: fontSizeUiState.displayValue,
    min: toolbar?.minFontSize ?? MIN_FONT_SIZE,
    max: toolbar?.maxFontSize ?? MAX_FONT_SIZE,
    onCommitValue: handleFontSizeCommitValue,
  });

  const handleFontSizeStep = (delta: number) => {
    if (isEditing) {
      formattingCommands.clearPendingInlineStyle();
      const hasLiveExpandedSelection = hasLiveExpandedSelectionInEditable(
        editableRef.current,
      );
      if (hasLiveExpandedSelection) {
        selectionSession.handleToolbarPointerDown();
        const applied = formattingCommands.applyFontSizeStep(delta, {
          requireExpandedSelection: true,
        });
        if (applied) return;
      } else {
        const applied = formattingCommands.applyFontSizeStepToWholeContent(delta);
        if (applied) return;
      }
    }
    toolbar?.onFontSizeStep(delta);
  };

  const handleToggleBold = () => {
    if (isEditing) {
      formattingCommands.toggleBold();
      return;
    }
    toolbar?.onToggleBold();
  };

  const handleToggleUnderline = () => {
    if (isEditing) {
      formattingCommands.toggleUnderline();
      return;
    }
    toolbar?.onToggleUnderline();
  };

  const handleToggleItalic = () => {
    if (isEditing) {
      formattingCommands.toggleItalic();
      return;
    }
    toolbar?.onToggleItalic();
  };

  const handleToggleStrikethrough = () => {
    if (isEditing) {
      formattingCommands.toggleStrikethrough();
      return;
    }
    toolbar?.onToggleStrikethrough();
  };

  const handleColorChange = (color: string) => {
    if (isEditing) {
      formattingCommands.applyColor(color);
      return;
    }
    toolbar?.onColorChange(color);
  };

  // 편집 중 폰트 패널에서 폰트 선택 시 인라인 적용
  const handleFontFamilyChange = (family: string, _weight: number) => {
    formattingCommands.applyFontFamily(family);
  };

  const insertPlainText = (value: string) => {
    const normalized = selectionSession.getSelectionRange();
    if (!normalized) return;

    const { selection, range } = normalized;
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
      selectionSession.setSelectionSnapshot(range);
    }
  };

  const handleEditingBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (isComposingRef.current) return;

    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const shouldFinish = selectionSession.shouldFinishEditingOnBlur({
      relatedTarget,
    });

    if (!shouldFinish) {
      // 툴바/입력 포커스로 넘어가는 경우에는 editable 재포커스를 하지 않는다.
      // 선택 하이라이트는 사라져도 snapshot 기반으로 툴바 명령 대상을 복원한다.
      return;
    }

    formattingCommands.clearPendingInlineStyle();
    setToolbarInputActive(false);

    const editableNode = editableRef.current;
    if (editableNode) {
      normalizeInlineFontSizeOverrides({
        editable: editableNode,
        baseFontSize: fallbackFontSize,
      });
    }
    const nextText = editableNode?.innerText ?? text;
    const nextRichText = editableNode?.innerHTML ?? richText;

    if (isTextEmpty(nextText, nextRichText)) {
      if (onRequestDelete) onRequestDelete();
      else onFinishEditing?.();
      return;
    }

    // 편집 종료 전 최종 DOM 상태를 store에 반영해 인라인 스타일 유실을 방지한다.
    onTextChange?.(nextText, nextRichText);
    onFinishEditing?.();
  };

  const handleBeforeInput: FormEventHandler<HTMLDivElement> = (event) => {
    formattingCommands.handleBeforeInput(event);
  };

  const handleInput: FormEventHandler<HTMLDivElement> = (event) => {
    selectionSession.captureSelectionIfInsideEditable();
    formattingCommands.handleInputPostProcess();

    const target = event.currentTarget;
    onTextChange?.(target.innerText, target.innerHTML);

    selectionSession.captureSelectionIfInsideEditable();
    syncFontSizeUiState();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.nativeEvent.isComposing || isComposingRef.current) return;

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

  // 편집 시작/종료에 따라 사이드바 텍스트 패널에 인라인 편집 콜백을 등록/해제한다.
  // 자주 바뀌는 UI 값(fontSize, fontFamily 등)은 ref로 관리하여
  // effect 재실행 없이 getter를 통해 최신 값을 읽는다.
  const setTextEditingCallbacks = useElementPanelStore((s) => s.setTextEditingCallbacks);

  const callbacksUiRef = useRef({
    fontSizeUiState,
    fontSizeInputState,
    fontFamilyUiState,
    toolbar,
    handleToggleBold,
    handleToggleUnderline,
    handleToggleItalic,
    handleToggleStrikethrough,
    handleColorChange,
    handleFontSizeStep,
    handleFontFamilyChange,
    handleToolbarInputFocus,
    handleToolbarInputBlur,
    isEditing,
    fontSizeInputStartedInEditingRef,
  });
  callbacksUiRef.current = {
    fontSizeUiState,
    fontSizeInputState,
    fontFamilyUiState,
    toolbar,
    handleToggleBold,
    handleToggleUnderline,
    handleToggleItalic,
    handleToggleStrikethrough,
    handleColorChange,
    handleFontSizeStep,
    handleFontFamilyChange,
    handleToolbarInputFocus,
    handleToolbarInputBlur,
    isEditing,
    fontSizeInputStartedInEditingRef,
  };

  const hasToolbar = !!toolbar;
  useEffect(() => {
    if (!isEditing || !hasToolbar) {
      setTextEditingCallbacks(null);
      return;
    }

    const ui = () => callbacksUiRef.current;

    setTextEditingCallbacks({
      onToggleBold: () => ui().handleToggleBold(),
      onToggleUnderline: () => ui().handleToggleUnderline(),
      onToggleItalic: () => ui().handleToggleItalic(),
      onToggleStrikethrough: () => ui().handleToggleStrikethrough(),
      onColorChange: (color: string) => ui().handleColorChange(color),
      onFontSizeStep: (delta: number) => ui().handleFontSizeStep(delta),
      onFontSizeInputChange: (value: string) => ui().fontSizeInputState.onChange(value),
      onFontSizeInputCommit: () => ui().fontSizeInputState.onCommit(),
      onFontSizeInputCancel: () => ui().fontSizeInputState.onCancel(),
      onFontSizeInputFocus: () => {
        ui().fontSizeInputStartedInEditingRef.current = ui().isEditing;
        ui().handleToolbarInputFocus();
        ui().fontSizeInputState.onFocus();
      },
      onFontSizeInputBlur: () => {
        ui().fontSizeInputStartedInEditingRef.current = false;
      },
      onToolbarInputFocus: () => ui().handleToolbarInputFocus(),
      onToolbarInputBlur: () => ui().handleToolbarInputBlur(),
      onLineHeightChange: (value: number) => ui().toolbar?.onLineHeightChange(value),
      onLetterSpacingChange: (value: number) => ui().toolbar?.onLetterSpacingChange(value),
      onAlignChange: (value: "left" | "center" | "right" | "justify") => ui().toolbar?.onAlignChange(value),
      onAlignYChange: (value: "top" | "middle" | "bottom") => ui().toolbar?.onAlignYChange(value),
      onFontFamilyClick: () => ui().toolbar?.onFontFamilyClick(),
      onFontFamilyChange: (family: string, weight: number) => ui().handleFontFamilyChange(family, weight),
      get fontSizeDisplay() { return ui().fontSizeUiState.displayValue; },
      get fontSizeInputValue() { return ui().fontSizeInputState.value; },
      get isFontSizeMixed() { return ui().fontSizeUiState.isMixed; },
      get isFontSizeInputDirty() { return ui().fontSizeInputState.isDirty; },
      get fontSize() { return ui().toolbar?.fontSize ?? 14; },
      get minFontSize() { return ui().toolbar?.minFontSize ?? MIN_FONT_SIZE; },
      get maxFontSize() { return ui().toolbar?.maxFontSize ?? MAX_FONT_SIZE; },
      get fontFamily() {
        const { fontFamilyUiState: ff, toolbar: tb } = ui();
        return ff.isMixed ? (tb?.fontFamily ?? "Pretendard") : matchFontFamily(ff.fontFamily);
      },
      get fontLabel() {
        const { fontFamilyUiState: ff } = ui();
        return ff.isMixed ? "--" : getFontLabel(matchFontFamily(ff.fontFamily));
      },
      get isFontFamilyMixed() { return ui().fontFamilyUiState.isMixed; },
      get lineHeight() { return ui().toolbar?.lineHeight ?? 1.5; },
      get letterSpacing() { return ui().toolbar?.letterSpacing ?? 0; },
      get color() { return ui().toolbar?.color ?? "#000000"; },
      get isBold() { return ui().toolbar?.isBold ?? false; },
      get isUnderline() { return ui().toolbar?.isUnderline ?? false; },
      get isItalic() { return ui().toolbar?.isItalic ?? false; },
      get isStrikethrough() { return ui().toolbar?.isStrikethrough ?? false; },
      get align() { return ui().toolbar?.align ?? "left"; },
      get alignY() { return ui().toolbar?.alignY ?? "top"; },
    });

    return () => setTextEditingCallbacks(null);
  }, [isEditing, hasToolbar, setTextEditingCallbacks]);

  // getter 기반 UI 값이 변경될 때 사이드바 리렌더를 트리거한다
  const bumpTextEditingRevision = useElementPanelStore((s) => s.bumpTextEditingRevision);
  useEffect(() => {
    if (!isEditing) return;
    bumpTextEditingRevision();
  }, [
    isEditing,
    bumpTextEditingRevision,
    fontSizeUiState.displayValue,
    fontSizeUiState.isMixed,
    fontSizeInputState.value,
    fontSizeInputState.isDirty,
    fontFamilyUiState.fontFamily,
    fontFamilyUiState.isMixed,
    toolbar?.fontSize,
    toolbar?.color,
    toolbar?.isBold,
    toolbar?.isUnderline,
    toolbar?.isItalic,
    toolbar?.isStrikethrough,
    toolbar?.align,
    toolbar?.alignY,
    toolbar?.lineHeight,
    toolbar?.letterSpacing,
  ]);

  return {
    beginEditing,
    handleEditingBlur,
    handleBeforeInput,
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
    handleToolbarPointerDown: selectionSession.handleToolbarPointerDown,
    handleToolbarInputFocus,
    handleToolbarInputBlur,
    fontSizeUiState,
    fontSizeInput: {
      value: fontSizeInputState.value,
      isDirty: fontSizeInputState.isDirty,
      onChange: fontSizeInputState.onChange,
      onCommit: fontSizeInputState.onCommit,
      onCancel: fontSizeInputState.onCancel,
      onFocus: () => {
        fontSizeInputStartedInEditingRef.current = isEditing;
        handleToolbarInputFocus();
        fontSizeInputState.onFocus();
      },
      onBlur: () => {
        fontSizeInputStartedInEditingRef.current = false;
      },
    },
  };
};
