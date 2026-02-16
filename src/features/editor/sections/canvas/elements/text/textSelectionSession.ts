/**
 * contentEditable selection 스냅샷/복원과 폰트 크기 UI 계산을 담당하는 세션 유틸.
 */
export type TextSelectionSnapshot = {
  range: Range;
  revision: number;
};

export type FontSizeUiState = {
  resolvedSize: number;
  isMixed: boolean;
  displayValue: string;
};

type ClampFontSize = (value: number) => number;

const resolveNodeElement = (node: Node | null): HTMLElement | null => {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement;
  return node.parentElement;
};

const resolveComputedFontSize = (node: Node | null, fallback: number): number => {
  const element = resolveNodeElement(node);
  if (!element) return fallback;
  const parsed = Number.parseFloat(window.getComputedStyle(element).fontSize);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
};

export const cloneRangeSafely = (range: Range | null): Range | null => {
  if (!range) return null;
  try {
    return range.cloneRange();
  } catch {
    return null;
  }
};

export const isRangeInEditable = (
  range: Range | null,
  editable: HTMLElement | null
): boolean => {
  if (!range || !editable) return false;
  return editable.contains(range.commonAncestorContainer);
};

export const getLiveRangeInEditable = (
  editable: HTMLElement | null
): { selection: Selection; range: Range } | null => {
  if (typeof window === "undefined" || !editable) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!isRangeInEditable(range, editable)) return null;
  return { selection, range };
};

export const restoreSelectionSnapshot = (
  snapshot: TextSelectionSnapshot | null
): Selection | null => {
  if (typeof window === "undefined" || !snapshot) return null;
  const selection = window.getSelection();
  if (!selection) return null;
  const cloned = cloneRangeSafely(snapshot.range);
  if (!cloned) return null;
  selection.removeAllRanges();
  selection.addRange(cloned);
  return selection;
};

export const normalizeSelectionRange = ({
  editable,
  snapshot,
}: {
  editable: HTMLElement | null;
  snapshot: TextSelectionSnapshot | null;
}): { selection: Selection; range: Range } | null => {
  const live = getLiveRangeInEditable(editable);
  if (live) return live;
  if (!editable || !snapshot) return null;
  if (!isRangeInEditable(snapshot.range, editable)) return null;
  const selection = restoreSelectionSnapshot(snapshot);
  if (!selection || selection.rangeCount === 0) return null;
  return { selection, range: selection.getRangeAt(0) };
};

export const resolveFontSizeUiStateFromRange = ({
  range,
  fallback,
  clamp,
}: {
  range: Range;
  fallback: number;
  clamp: ClampFontSize;
}): FontSizeUiState => {
  if (range.collapsed) {
    const size = clamp(resolveComputedFontSize(range.startContainer, fallback));
    return { resolvedSize: size, isMixed: false, displayValue: String(size) };
  }

  const sizes = new Set<number>();
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT
  );
  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    if (text.textContent && text.textContent.length > 0 && range.intersectsNode(text)) {
      sizes.add(clamp(resolveComputedFontSize(text, fallback)));
    }
    current = walker.nextNode();
  }

  if (sizes.size === 0) {
    const size = clamp(resolveComputedFontSize(range.startContainer, fallback));
    return { resolvedSize: size, isMixed: false, displayValue: String(size) };
  }
  if (sizes.size > 1) {
    return { resolvedSize: fallback, isMixed: true, displayValue: "--" };
  }
  const [size] = Array.from(sizes);
  return { resolvedSize: size, isMixed: false, displayValue: String(size) };
};

