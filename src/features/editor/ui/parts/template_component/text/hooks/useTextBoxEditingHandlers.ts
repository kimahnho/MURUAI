import {
  useEffect,
  useRef,
  type ClipboardEventHandler,
  type FormEventHandler,
  type KeyboardEventHandler,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type MutableRefObject,
  type RefObject,
} from "react";
import { isTextEmpty } from "../textContentUtils";
import type { TextBoxProps } from "../textBoxTypes";

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

// Check if a point is within the toolbar area
const isPointInToolbar = (x: number, y: number): boolean => {
  const toolbarRoot = document.getElementById("text-toolbar-root");
  const toolbarElements = document.querySelectorAll("[data-textbox-toolbar]");

  // Check toolbar root
  if (toolbarRoot) {
    const rect = toolbarRoot.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      // Also check if there's actual content (not just the container)
      const children = toolbarRoot.querySelectorAll(".pointer-events-auto");
      for (const child of children) {
        const childRect = child.getBoundingClientRect();
        if (x >= childRect.left && x <= childRect.right && y >= childRect.top && y <= childRect.bottom) {
          return true;
        }
      }
    }
  }

  // Check direct toolbar elements
  for (const el of toolbarElements) {
    const rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true;
    }
  }

  return false;
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
  // Selection snapshot for restoring after toolbar actions
  const savedRangeRef = useRef<Range | null>(null);
  // Track mouse position for blur detection
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  };

  // Track mouse position and auto-save selection when it changes
  useEffect(() => {
    if (!isEditing) return;

    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const editableNode = editableRef.current;
      if (!editableNode) return;

      // Only save if selection is within the editable element
      if (editableNode.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [isEditing, editableRef]);

  const beginEditing = (
    event: BeginEditingEvent,
    options?: BeginEditingOptions
  ) => {
    if (!editable || locked) return;
    // Allow native selection when requested.
    if (!options?.allowDefault) {
      event.preventDefault();
    }
    event.stopPropagation();
    const shouldResetSelection =
      isSelected && !event.shiftKey && selectionCount > 1;
    if (!isSelected || shouldResetSelection) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
    // Enter editing without selecting all text.
    onStartEditing?.();
  };

  const applyStyleToSelection = (command: string, value?: string) => {
    if (!isEditing) return;

    // Restore selection if it was lost (e.g., due to toolbar click)
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Check if there's an actual selection (not just cursor)
    const hasSelection = !selection.isCollapsed;

    document.execCommand(command, false, value);

    // After execCommand, save the new selection state
    // (DOM may have changed, so we need to capture the new range)
    if (hasSelection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }

    const editableNode = editableRef.current;
    if (!editableNode) return;

    const plainText = editableNode.innerText;
    const html = editableNode.innerHTML;
    onTextChange?.(plainText, html);
  };

  const handleToggleBold = () => {
    if (isEditing) {
      applyStyleToSelection("bold");
    } else {
      toolbar?.onToggleBold();
    }
  };

  const handleToggleUnderline = () => {
    if (isEditing) {
      applyStyleToSelection("underline");
    } else {
      toolbar?.onToggleUnderline();
    }
  };

  const handleToggleItalic = () => {
    if (isEditing) {
      applyStyleToSelection("italic");
    } else {
      toolbar?.onToggleItalic();
    }
  };

  const handleToggleStrikethrough = () => {
    if (isEditing) {
      applyStyleToSelection("strikeThrough");
    } else {
      toolbar?.onToggleStrikethrough();
    }
  };

  const handleColorChange = (color: string) => {
    if (isEditing) {
      applyStyleToSelection("foreColor", color);
    } else {
      toolbar?.onColorChange(color);
    }
  };

  const handleFontSizeChange = (size: number) => {
    if (isEditing) {
      // Restore selection if it was lost (e.g., due to toolbar click)
      restoreSelection();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        toolbar?.onFontSizeChange(size);
        return;
      }

      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        toolbar?.onFontSizeChange(size);
        return;
      }

      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      range.surroundContents(span);

      // Select the contents of the new span to maintain selection
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);

      // Save the new selection state
      savedRangeRef.current = newRange.cloneRange();

      const editableNode = editableRef.current;
      if (!editableNode) return;

      const plainText = editableNode.innerText;
      const html = editableNode.innerHTML;
      onTextChange?.(plainText, html);
    } else {
      toolbar?.onFontSizeChange(size);
    }
  };

  const insertPlainText = (value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, value);
      return;
    }
    const range = selection.getRangeAt(0);
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
    }
  };

  const handleEditingBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (isComposingRef.current) return;

    // Check if mouse is over toolbar area using tracked position
    const { x, y } = mousePositionRef.current;
    if (isPointInToolbar(x, y)) {
      // Mouse is over toolbar, refocus and maintain editing mode
      requestAnimationFrame(() => {
        editableRef.current?.focus();
        restoreSelection();
      });
      return;
    }

    // Check if focus is moving to toolbar area - if so, don't finish editing
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (relatedTarget) {
      const isToolbarClick =
        relatedTarget.closest("#text-toolbar-root") ||
        relatedTarget.closest("[data-textbox-toolbar]");
      if (isToolbarClick) {
        requestAnimationFrame(() => {
          editableRef.current?.focus();
          restoreSelection();
        });
        return;
      }
    }

    // If relatedTarget is null, check if activeElement is within toolbar
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement) {
      const isToolbarActive =
        activeElement.closest("#text-toolbar-root") ||
        activeElement.closest("[data-textbox-toolbar]");
      if (isToolbarActive) {
        requestAnimationFrame(() => {
          editableRef.current?.focus();
          restoreSelection();
        });
        return;
      }
    }

    const editableNode = editableRef.current;
    const nextText = editableNode?.innerText ?? text;
    const nextRichText = editableNode?.innerHTML ?? richText;
    if (isTextEmpty(nextText, nextRichText)) {
      if (onRequestDelete) {
        onRequestDelete();
      } else {
        onFinishEditing?.();
      }
      return;
    }
    onFinishEditing?.();
  };

  const handleInput: FormEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    const plainText = target.innerText;
    const html = target.innerHTML;
    onTextChange?.(plainText, html);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    // Skip key handling during IME composition.
    if (event.nativeEvent.isComposing || isComposingRef.current) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
      // Prevent underline shortcuts while editing.
      event.preventDefault();
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLDivElement> = (event) => {
    // Sanitize paste: insert text/plain only.
    event.preventDefault();
    event.stopPropagation();
    const pastedText = event.clipboardData?.getData("text/plain") ?? "";
    if (!pastedText) return;
    insertPlainText(pastedText);
    const editableNode = editableRef.current;
    if (!editableNode) return;
    onTextChange?.(editableNode.innerText, editableNode.innerHTML);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
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
    handleFontSizeChange,
  };
};
