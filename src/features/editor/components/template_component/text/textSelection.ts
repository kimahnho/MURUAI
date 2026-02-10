type Point = { x: number; y: number };

type CaretDocument = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const getCaretRangeFromPoint = (point: Point) => {
  if (typeof document === "undefined") return null;
  const doc = document as CaretDocument;
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(point.x, point.y);
    if (!position) return null;
    const nextRange = document.createRange();
    nextRange.setStart(position.offsetNode, position.offset);
    nextRange.collapse(true);
    return nextRange;
  }
  return doc.caretRangeFromPoint?.(point.x, point.y) ?? null;
};

export const placeCaretAtPoint = (editable: HTMLElement | null, point: Point) => {
  if (!editable || typeof window === "undefined") return false;
  const selection = window.getSelection();
  const range = getCaretRangeFromPoint(point);
  if (selection && range && editable.contains(range.startContainer)) {
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }
  return false;
};

export const placeCaretAtEnd = (editable: HTMLElement | null) => {
  if (!editable || typeof window === "undefined") return false;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editable);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
};

export const selectWordAtPoint = (editable: HTMLElement | null, point: Point) => {
  if (!editable || typeof window === "undefined") return false;
  const selection = window.getSelection();
  if (!selection) return false;
  const doc = document as CaretDocument;

  let node: Node | null = null;
  let offset = 0;

  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(point.x, point.y);
    if (position) {
      node = position.offsetNode;
      offset = position.offset;
    }
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(point.x, point.y);
    if (range) {
      node = range.startContainer;
      offset = range.startOffset;
    }
  }

  if (!node || !editable.contains(node)) return false;

  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent || "";
    if (offset > textContent.length) {
      offset = textContent.length;
    }
    const isWordEndBoundary =
      offset > 0 &&
      !/\s/.test(textContent[offset - 1]) &&
      (offset === textContent.length || /\s/.test(textContent[offset]));
    if (isWordEndBoundary && offset < textContent.length) {
      const isWhitespace = /\s/.test(textContent[offset]);
      if (isWhitespace) {
        let spaceEnd = offset;
        while (spaceEnd < textContent.length && /\s/.test(textContent[spaceEnd])) {
          spaceEnd++;
        }
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, spaceEnd);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
    }

    let wordStart = offset;
    let wordEnd = offset;

    while (wordStart > 0 && !/\s/.test(textContent[wordStart - 1])) {
      wordStart--;
    }
    while (wordEnd < textContent.length && !/\s/.test(textContent[wordEnd])) {
      wordEnd++;
    }

    if (wordStart !== wordEnd) {
      const range = document.createRange();
      range.setStart(node, wordStart);
      range.setEnd(node, wordEnd);
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    }
  }

  const selectionWithModify = selection as Selection & {
    modify?: (
      alter: "move" | "extend",
      direction: "backward" | "forward",
      granularity: "word" | "character"
    ) => void;
  };
  if (selectionWithModify.modify) {
    const range = document.createRange();
    const safeOffset =
      node.nodeType === Node.TEXT_NODE
        ? Math.min(offset, node.textContent?.length ?? 0)
        : Math.min(offset, node.childNodes.length);
    range.setStart(node, safeOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    // Use Selection.modify when caret lands on element nodes (spans, breaks).
    selectionWithModify.modify("move", "backward", "word");
    selectionWithModify.modify("extend", "forward", "word");
    return true;
  }

  return false;
};
