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

// 텍스트 편집 흐림 처리 시 툴바 클릭을 "편집 유지"로 처리하기 위해
// 현재 포인터가 툴바 영역에 있는지 판별한다.
const isPointInToolbar = (x: number, y: number): boolean => {
  const toolbarRoot = document.getElementById("text-toolbar-root");
  const toolbarElements = document.querySelectorAll("[data-textbox-toolbar]");

  if (toolbarRoot) {
    const rect = toolbarRoot.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      // 툴바 루트만 있는 빈 상태를 제외하기 위해 실제 인터랙션 가능한 자식만 검사한다.
      const children = toolbarRoot.querySelectorAll(".pointer-events-auto");
      for (const child of children) {
        const childRect = child.getBoundingClientRect();
        if (x >= childRect.left && x <= childRect.right && y >= childRect.top && y <= childRect.bottom) {
          return true;
        }
      }
    }
  }

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
  // 툴바 클릭으로 편집 영역 포커스가 잠깐 이동해도
  // 선택 범위를 복원할 수 있도록 마지막 선택 범위를 보관한다.
  const savedRangeRef = useRef<Range | null>(null);
  // 흐림 이벤트의 relatedTarget이 비어 있는 브라우저 케이스를 보완하기 위해
  // 최신 포인터 위치를 함께 추적한다.
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  };

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

      // 외부 영역 선택은 복원 대상이 아니므로 편집 노드 내부 선택만 저장한다.
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
    // 리사이즈 핸들 등에서 기본 선택 동작이 필요한 경우를 위해 옵션으로 분기한다.
    if (!options?.allowDefault) {
      event.preventDefault();
    }
    event.stopPropagation();
    const shouldResetSelection =
      isSelected && !event.shiftKey && selectionCount > 1;
    if (!isSelected || shouldResetSelection) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
    onStartEditing?.();
  };

  const applyStyleToSelection = (command: string, value?: string) => {
    if (!isEditing) return;

    // 툴바 클릭 후 선택이 사라진 경우를 복원해 스타일 적용 대상을 유지한다.
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const hasSelection = !selection.isCollapsed;

    document.execCommand(command, false, value);

    // execCommand 이후 DOM 구조가 바뀔 수 있어 최신 선택 범위를 다시 저장한다.
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

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);

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

    const { x, y } = mousePositionRef.current;
    if (isPointInToolbar(x, y)) {
      requestAnimationFrame(() => {
        editableRef.current?.focus();
        restoreSelection();
      });
      return;
    }

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
    // IME 조합 중에는 키 입력을 가로채면 한글 조합이 깨질 수 있어 무시한다.
    if (event.nativeEvent.isComposing || isComposingRef.current) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
      // 툴바 상태와 충돌을 막기 위해 기본 underline 단축키를 차단한다.
      event.preventDefault();
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLDivElement> = (event) => {
    // 외부 스타일이 유입되면 툴바 상태와 DOM이 어긋나므로 텍스트만 붙여넣는다.
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
