import { useRef, type FormEvent, type RefObject } from "react";
import {
  applyPendingInlineStyleInPlace,
  applyRichTextCommandInPlace,
  hasPendingInlineStyle,
  type PendingInlineStyle,
  type RichTextCommand,
} from "../textContentUtils";
import {
  deserializeRangeSnapshot,
  type SerializedRangeSnapshot,
} from "../textSelectionSession";

type SelectionSessionLike = {
  selectionSnapshotRef: { current: SerializedRangeSnapshot | null };
  ensureToolbarSelection: () => { selection: Selection; range: Range } | null;
  getSelectionRange: () => { selection: Selection; range: Range } | null;
  setSelectionSnapshot: (range: Range | null) => void;
  captureSelectionIfInsideEditable: () => void;
};

const cloneSnapshot = (
  snapshot: SerializedRangeSnapshot,
): SerializedRangeSnapshot => ({
  ...snapshot,
  start: { ...snapshot.start, path: [...snapshot.start.path] },
  end: { ...snapshot.end, path: [...snapshot.end.path] },
});

const getComputedElement = (node: Node): HTMLElement | null =>
  node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement;

const resolveComputedFontSizeAtNode = (node: Node, fallback: number): number => {
  const element = getComputedElement(node);
  if (!element) return fallback;
  const parsed = Number.parseFloat(window.getComputedStyle(element).fontSize);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
};

const isBoldAtNode = (node: Node) => {
  const element = getComputedElement(node);
  if (!element) return false;
  const weight = window.getComputedStyle(element).fontWeight;
  if (weight === "bold") return true;
  const parsed = Number.parseInt(weight, 10);
  return Number.isFinite(parsed) && parsed >= 600;
};

const isItalicAtNode = (node: Node) => {
  const element = getComputedElement(node);
  if (!element) return false;
  return window.getComputedStyle(element).fontStyle === "italic";
};

const hasDecorationAtNode = (node: Node, target: "underline" | "line-through") => {
  const element = getComputedElement(node);
  if (!element) return false;
  const lines = window
    .getComputedStyle(element)
    .textDecorationLine.split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
  return lines.includes(target);
};

export const useTextFormattingCommands = ({
  isEditing,
  editableRef,
  fallbackFontSize,
  clampFontSize,
  selectionSession,
  emitTextChange,
  syncFontSizeUiState,
}: {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  fallbackFontSize: number;
  clampFontSize: (value: number) => number;
  selectionSession: SelectionSessionLike;
  emitTextChange: () => void;
  syncFontSizeUiState: () => void;
}) => {
  const pendingInlineStyleRef = useRef<PendingInlineStyle>({});
  const pendingInputStartRef = useRef<SerializedRangeSnapshot | null>(null);

  const applyCommandToSelection = (command:
    | { type: "setFontSize"; size: number }
    | { type: "setFontSizeStep"; delta: number }
    | { type: "setColor"; color: string }
    | { type: "toggleBold" }
    | { type: "toggleItalic" }
    | { type: "toggleUnderline" }
    | { type: "toggleStrikethrough" },
    options?: { requireExpandedSelection?: boolean },
  ): boolean => {
    const normalized = selectionSession.ensureToolbarSelection();
    if (!normalized) return false;

    const { selection, range } = normalized;
    if (options?.requireExpandedSelection && range.collapsed) {
      return false;
    }

    if (range.collapsed) {
      const nextPending = { ...pendingInlineStyleRef.current };

      if (command.type === "setFontSize") {
        nextPending.fontSize = command.size;
      }
      if (command.type === "setFontSizeStep") {
        const base =
          nextPending.fontSize ??
          resolveComputedFontSizeAtNode(range.startContainer, fallbackFontSize);
        nextPending.fontSize = clampFontSize(base + command.delta);
      }
      if (command.type === "setColor") {
        nextPending.color = command.color;
      }
      if (command.type === "toggleBold") {
        const current = nextPending.fontWeight ?? (isBoldAtNode(range.startContainer) ? "bold" : "normal");
        nextPending.fontWeight = current === "bold" ? "normal" : "bold";
      }
      if (command.type === "toggleItalic") {
        const current = nextPending.fontStyle ?? (isItalicAtNode(range.startContainer) ? "italic" : "normal");
        nextPending.fontStyle = current === "italic" ? "normal" : "italic";
      }
      if (command.type === "toggleUnderline") {
        const current =
          nextPending.underline ??
          hasDecorationAtNode(range.startContainer, "underline");
        nextPending.underline = !current;
      }
      if (command.type === "toggleStrikethrough") {
        const current =
          nextPending.strikethrough ??
          hasDecorationAtNode(range.startContainer, "line-through");
        nextPending.strikethrough = !current;
      }

      pendingInlineStyleRef.current = nextPending;
      syncFontSizeUiState();
      return true;
    }

    const editable = editableRef.current;
    if (!editable) return false;

    const richTextCommand: RichTextCommand =
      command.type === "setFontSize"
        ? { type: "setFontSize", size: command.size, fallback: fallbackFontSize }
        : command.type === "setFontSizeStep"
          ? {
              type: "setFontSizeStep",
              delta: command.delta,
              fallback: fallbackFontSize,
              clamp: clampFontSize,
            }
          : command;

    const nextRange = applyRichTextCommandInPlace({
      range,
      editable,
      command: richTextCommand,
    });

    if (!nextRange) return false;

    selection.removeAllRanges();
    selection.addRange(nextRange);
    selectionSession.setSelectionSnapshot(nextRange);
    pendingInlineStyleRef.current = {};
    emitTextChange();
    syncFontSizeUiState();
    return true;
  };

  const handleBeforeInput = (event: FormEvent<HTMLDivElement>) => {
    if (!isEditing || !hasPendingInlineStyle(pendingInlineStyleRef.current)) return;
    const nativeEvent = event.nativeEvent as InputEvent;
    if (!nativeEvent.inputType.startsWith("insert")) return;

    selectionSession.captureSelectionIfInsideEditable();
    const snapshot = selectionSession.selectionSnapshotRef.current;
    if (!snapshot || !snapshot.collapsed) return;
    pendingInputStartRef.current = cloneSnapshot(snapshot);
  };

  const handleInputPostProcess = () => {
    if (!isEditing || !hasPendingInlineStyle(pendingInlineStyleRef.current)) return;
    if (!pendingInputStartRef.current) return;

    const editable = editableRef.current;
    if (!editable) return;

    const normalized = selectionSession.getSelectionRange();
    if (!normalized) {
      pendingInputStartRef.current = null;
      return;
    }

    const startRange = deserializeRangeSnapshot({
      snapshot: pendingInputStartRef.current,
      editable,
    });
    pendingInputStartRef.current = null;
    if (!startRange) return;

    const insertedRange = document.createRange();
    insertedRange.setStart(startRange.startContainer, startRange.startOffset);
    insertedRange.setEnd(normalized.range.endContainer, normalized.range.endOffset);

    if (insertedRange.collapsed || !insertedRange.toString()) {
      return;
    }

    const nextRange = applyPendingInlineStyleInPlace(
      insertedRange,
      editable,
      pendingInlineStyleRef.current,
    );

    if (!nextRange) return;

    const caret = document.createRange();
    caret.setStart(nextRange.endContainer, nextRange.endOffset);
    caret.collapse(true);

    normalized.selection.removeAllRanges();
    normalized.selection.addRange(caret);
    selectionSession.setSelectionSnapshot(caret);
    emitTextChange();
    syncFontSizeUiState();
  };

  const clearPendingInlineStyle = () => {
    pendingInlineStyleRef.current = {};
  };

  return {
    applyFontSizeChange: (
      size: number,
      options?: { requireExpandedSelection?: boolean },
    ) => applyCommandToSelection({ type: "setFontSize", size }, options),
    applyFontSizeStep: (delta: number) =>
      applyCommandToSelection({ type: "setFontSizeStep", delta }),
    applyColor: (color: string) =>
      applyCommandToSelection({ type: "setColor", color }),
    toggleBold: () => applyCommandToSelection({ type: "toggleBold" }),
    toggleItalic: () => applyCommandToSelection({ type: "toggleItalic" }),
    toggleUnderline: () => applyCommandToSelection({ type: "toggleUnderline" }),
    toggleStrikethrough: () =>
      applyCommandToSelection({ type: "toggleStrikethrough" }),
    handleBeforeInput,
    handleInputPostProcess,
    clearPendingInlineStyle,
    hasPendingInlineStyle: () =>
      hasPendingInlineStyle(pendingInlineStyleRef.current),
  };
};
