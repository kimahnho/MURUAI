/**
 * contentEditable selection 스냅샷/복원과 폰트 크기 UI 계산을 담당하는 세션 유틸.
 */
export type SerializedPosition = {
  path: number[];
  offset: number;
};

export type SerializedRangeSnapshot = {
  start: SerializedPosition;
  end: SerializedPosition;
  collapsed: boolean;
  revision: number;
};

export type SelectionRestoreResult = {
  selection: Selection;
  range: Range;
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

const getNodeIndex = (node: Node): number => {
  let index = 0;
  let current = node.previousSibling;
  while (current) {
    index += 1;
    current = current.previousSibling;
  }
  return index;
};

const serializePosition = (
  editable: HTMLElement,
  node: Node,
  offset: number,
): SerializedPosition | null => {
  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== editable) {
    const parentNode: Node | null = current.parentNode;
    if (!parentNode) return null;
    path.push(getNodeIndex(current));
    current = parentNode;
  }

  if (current !== editable) return null;
  path.reverse();

  const normalizedOffset = (() => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Math.min(offset, (node as Text).length);
    }
    return Math.min(offset, node.childNodes.length);
  })();

  return { path, offset: Math.max(0, normalizedOffset) };
};

const resolvePositionNode = (
  editable: HTMLElement,
  position: SerializedPosition,
): { node: Node; offset: number } | null => {
  let node: Node = editable;

  for (const index of position.path) {
    const child = node.childNodes.item(index);
    if (!child) return null;
    node = child;
  }

  const offset = node.nodeType === Node.TEXT_NODE
    ? Math.min(position.offset, (node as Text).length)
    : Math.min(position.offset, node.childNodes.length);

  return { node, offset: Math.max(0, offset) };
};

export const isRangeInEditable = (
  range: Range | null,
  editable: HTMLElement | null,
): boolean => {
  if (!range || !editable) return false;
  return editable.contains(range.commonAncestorContainer);
};

export const getLiveRangeInEditable = (
  editable: HTMLElement | null,
): { selection: Selection; range: Range } | null => {
  if (typeof window === "undefined" || !editable) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!isRangeInEditable(range, editable)) return null;
  return { selection, range };
};

export const serializeRangeSnapshot = ({
  range,
  editable,
  revision,
}: {
  range: Range;
  editable: HTMLElement;
  revision: number;
}): SerializedRangeSnapshot | null => {
  if (!isRangeInEditable(range, editable)) return null;

  const start = serializePosition(editable, range.startContainer, range.startOffset);
  const end = serializePosition(editable, range.endContainer, range.endOffset);
  if (!start || !end) return null;

  return {
    start,
    end,
    collapsed: range.collapsed,
    revision,
  };
};

export const deserializeRangeSnapshot = ({
  snapshot,
  editable,
}: {
  snapshot: SerializedRangeSnapshot;
  editable: HTMLElement;
}): Range | null => {
  const start = resolvePositionNode(editable, snapshot.start);
  const end = resolvePositionNode(editable, snapshot.end);
  if (!start || !end) return null;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
};

export const restoreSerializedSelection = ({
  snapshot,
  editable,
}: {
  snapshot: SerializedRangeSnapshot | null;
  editable: HTMLElement | null;
}): SelectionRestoreResult | null => {
  if (typeof window === "undefined" || !snapshot || !editable) return null;
  const selection = window.getSelection();
  if (!selection) return null;

  const range = deserializeRangeSnapshot({ snapshot, editable });
  if (!range || !isRangeInEditable(range, editable)) return null;

  selection.removeAllRanges();
  selection.addRange(range);
  return { selection, range };
};

export const normalizeSelectionRange = ({
  editable,
  snapshot,
}: {
  editable: HTMLElement | null;
  snapshot: SerializedRangeSnapshot | null;
}): SelectionRestoreResult | null => {
  const live = getLiveRangeInEditable(editable);
  if (live) return live;
  return restoreSerializedSelection({ snapshot, editable });
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
    NodeFilter.SHOW_TEXT,
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

// 선택 범위 내 fontFamily 혼합 여부를 계산한다.
const resolveComputedFontFamily = (node: Node, fallback: string): string => {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  if (!element) return fallback;
  const computed = window.getComputedStyle(element).fontFamily;
  return computed || fallback;
};

// 동일 시스템 폰트도 브라우저에 따라 따옴표 포함/미포함 차이가 있으므로 정규화한다.
const normalizeFontFamily = (ff: string): string =>
  ff.replace(/["']/g, "").split(",")[0].trim().toLowerCase();

export type FontFamilyUiState = {
  fontFamily: string;
  isMixed: boolean;
};

// collapsed 커서에서 왼쪽 문자가 속한 노드를 반환한다.
// offset > 0이면 같은 텍스트 노드, offset === 0이면 직전 텍스트 노드를 탐색한다.
const resolveLeftCharNode = (container: Node, offset: number): Node | null => {
  if (container.nodeType === Node.TEXT_NODE && offset > 0) {
    return container;
  }

  // offset === 0이거나 element 노드인 경우 — 직전 텍스트 노드를 찾는다
  const findPrevTextNode = (node: Node): Text | null => {
    let current: Node | null = node;
    while (current) {
      // 이전 형제부터 탐색
      let sibling = current.previousSibling;
      while (sibling) {
        const last = findLastTextNode(sibling);
        if (last) return last;
        sibling = sibling.previousSibling;
      }
      current = current.parentNode;
    }
    return null;
  };

  const findLastTextNode = (node: Node): Text | null => {
    if (node.nodeType === Node.TEXT_NODE && (node as Text).length > 0) {
      return node as Text;
    }
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const found = findLastTextNode(node.childNodes[i]);
      if (found) return found;
    }
    return null;
  };

  // element 노드이고 offset > 0이면, offset 위치 직전 자식에서 마지막 텍스트 노드를 찾는다
  if (container.nodeType === Node.ELEMENT_NODE && offset > 0) {
    const child = container.childNodes[offset - 1];
    if (child) {
      const last = findLastTextNode(child);
      if (last) return last;
    }
  }

  return findPrevTextNode(container);
};

export const resolveFontFamilyFromRange = ({
  range,
  fallback,
}: {
  range: Range;
  fallback: string;
}): FontFamilyUiState => {
  if (range.collapsed) {
    // 커서 왼쪽 문자의 폰트를 우선 사용한다
    const leftNode = resolveLeftCharNode(range.startContainer, range.startOffset);
    const targetNode = leftNode ?? range.startContainer;
    const raw = resolveComputedFontFamily(targetNode, fallback);
    return { fontFamily: raw, isMixed: false };
  }

  const families = new Set<string>();
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
  );
  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    if (text.textContent && text.textContent.length > 0 && range.intersectsNode(text)) {
      families.add(normalizeFontFamily(resolveComputedFontFamily(text, fallback)));
    }
    current = walker.nextNode();
  }

  if (families.size === 0) {
    return { fontFamily: fallback, isMixed: false };
  }
  if (families.size > 1) {
    return { fontFamily: fallback, isMixed: true };
  }
  const [family] = Array.from(families);
  // 정규화된 값에서 원본 fontFamily를 복원한다 — computed style에서 가져온 값을 사용
  const raw = resolveComputedFontFamily(range.startContainer, fallback);
  return { fontFamily: normalizeFontFamily(raw) === family ? raw : fallback, isMixed: false };
};
