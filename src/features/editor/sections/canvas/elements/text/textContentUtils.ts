/**
 * 텍스트 편집 시 HTML/텍스트 정규화와 포맷 보조 처리를 담당하는 유틸 모듈.
 */
const stripHtml = (value: string) => {
  if (!value) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return value.replace(/<[^>]*>/g, "");
  }
  const doc = new DOMParser().parseFromString(value, "text/html");
  return doc.body.textContent ?? "";
};

const normalizeTextValue = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isTextEmpty = (text?: string, richText?: string) =>
  normalizeTextValue(text ?? "") === "" &&
  normalizeTextValue(stripHtml(richText ?? "")) === "";

export const DEFAULT_LINE_HEIGHT = 1.2;

/**
 * 전역 텍스트 스타일을 적용할 때 richText 내부의 해당 인라인 스타일만 제거한다.
 * 부분 스타일이 전역 스타일보다 우선하지 않도록 정리하는 용도다.
 */
export const stripStyleTags = (
  richText: string,
  styleType:
    | "bold"
    | "italic"
    | "underline"
    | "strikethrough"
    | "color"
    | "fontFamily"
    | "fontSize"
): string => {
  if (!richText || typeof window === "undefined" || typeof DOMParser === "undefined") {
    return richText;
  }

  const doc = new DOMParser().parseFromString(richText, "text/html");
  const body = doc.body;

  const processNode = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        let shouldUnwrap = false;

        switch (styleType) {
          case "bold":
            if (tagName === "b" || tagName === "strong") {
              shouldUnwrap = true;
            } else if (el.style.fontWeight) {
              el.style.fontWeight = "";
            }
            break;
          case "italic":
            if (tagName === "i" || tagName === "em") {
              shouldUnwrap = true;
            } else if (el.style.fontStyle) {
              el.style.fontStyle = "";
            }
            break;
          case "underline":
            if (tagName === "u") {
              shouldUnwrap = true;
            } else {
              // textDecorationLine(inline 적용 경로)과 textDecoration(shorthand) 모두 처리한다.
              if (el.style.textDecorationLine?.includes("underline")) {
                el.style.textDecorationLine = el.style.textDecorationLine.replace("underline", "").trim() || "none";
                if (el.style.textDecorationLine === "none") el.style.textDecorationLine = "";
              }
              if (el.style.textDecoration?.includes("underline")) {
                el.style.textDecoration = el.style.textDecoration.replace("underline", "").trim();
              }
            }
            break;
          case "strikethrough":
            if (tagName === "s" || tagName === "strike" || tagName === "del") {
              shouldUnwrap = true;
            } else {
              // textDecorationLine(inline 적용 경로)과 textDecoration(shorthand) 모두 처리한다.
              if (el.style.textDecorationLine?.includes("line-through")) {
                el.style.textDecorationLine = el.style.textDecorationLine.replace("line-through", "").trim() || "none";
                if (el.style.textDecorationLine === "none") el.style.textDecorationLine = "";
              }
              if (el.style.textDecoration?.includes("line-through")) {
                el.style.textDecoration = el.style.textDecoration.replace("line-through", "").trim();
              }
            }
            break;
          case "color":
            if (tagName === "font" && el.hasAttribute("color")) {
              el.removeAttribute("color");
            }
            if (el.style.color) {
              el.style.color = "";
            }
            break;
          case "fontFamily":
            if (tagName === "font" && el.hasAttribute("face")) {
              el.removeAttribute("face");
            }
            if (el.style.font || el.style.fontFamily) {
              // font shorthand가 남아 있어도 최종 font-family는 상위 스타일을 따르도록 강제한다.
              el.style.fontFamily = "inherit";
            }
            break;
          case "fontSize":
            if (tagName === "font" && el.hasAttribute("size")) {
              el.removeAttribute("size");
            }
            if (el.style.fontSize) {
              el.style.fontSize = "";
            }
            break;
        }

        if (shouldUnwrap) {
          // 스타일 태그만 제거하고 내부 텍스트 노드는 유지한다.
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        } else {
          // 하위 노드도 동일 규칙으로 재귀 처리한다.
          processNode(el);

          // 비어 있는 스타일 속성은 정리한다.
          if (el.getAttribute("style") === "") {
            el.removeAttribute("style");
          }

          // 속성이 없는 인라인 래퍼는 불필요하므로 벗겨낸다.
          if (tagName === "span" && el.attributes.length === 0) {
            const parent = el.parentNode;
            if (parent) {
              while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
              }
              parent.removeChild(el);
            }
          }
        }
      }
    }
  };

  processNode(body);
  return body.innerHTML;
};

/**
 * richText 내부의 인라인 font-size 값을 delta만큼 증감한다.
 * 요소 기본 폰트 크기(style.fontSize)는 호출부에서 별도로 갱신한다.
 */
export const applyFontSizeDeltaToRichText = ({
  richText,
  delta,
  clamp,
}: {
  richText: string;
  delta: number;
  clamp: (value: number) => number;
}): string => {
  if (!richText) {
    return richText;
  }

  const htmlFontSizeMap: Record<string, number> = {
    "1": 10,
    "2": 13,
    "3": 16,
    "4": 18,
    "5": 24,
    "6": 32,
    "7": 48,
  };

  const withSteppedInlineSizes = richText.replace(
    /font-size\s*:\s*([0-9]*\.?[0-9]+)\s*(px|pt)?/gi,
    (match, value: string, unit?: string) => {
      const parsed = Number.parseFloat(value);
      if (!Number.isFinite(parsed) || parsed <= 0) return match;
      const sizeInPx =
        (unit ?? "px").toLowerCase() === "pt"
          ? Math.round(parsed * (96 / 72))
          : Math.round(parsed);
      const next = clamp(sizeInPx + delta);
      return `font-size: ${next}px`;
    },
  );

  return withSteppedInlineSizes.replace(
    /<font([^>]*?)\s+size=["']?([1-7])["']?([^>]*)>/gi,
    (_match, before: string, sizeValue: string, after: string) => {
      const mapped = htmlFontSizeMap[sizeValue];
      if (!mapped) return _match;
      const next = clamp(mapped + delta);
      const rawAttrs = `${before}${after}`;
      const styleMatch = rawAttrs.match(/\sstyle=["']([^"']*)["']/i);
      const existingStyle = styleMatch?.[1] ?? "";
      const cleanedStyle = existingStyle
        .replace(/font-size\s*:[^;]+;?/gi, "")
        .trim();
      const stylePrefix =
        cleanedStyle.length > 0
          ? cleanedStyle.endsWith(";")
            ? `${cleanedStyle} `
            : `${cleanedStyle}; `
          : "";
      const nextStyle = `${stylePrefix}font-size: ${next}px;`;
      const attrsWithoutStyle = rawAttrs.replace(
        /\sstyle=["'][^"']*["']/i,
        "",
      );
      return `<font${attrsWithoutStyle} style="${nextStyle}">`;
    },
  );
};

/**
 * 노드에서 가장 가까운 인라인 font-size를 읽는다.
 * 조상 element의 style.fontSize를 순회하며, 없으면 fallback을 반환한다.
 */
export const resolveInlineFontSize = (
  node: Node,
  fallback: number,
): number => {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      const inlineSize = Number.parseFloat(element.style.fontSize);
      if (Number.isFinite(inlineSize) && inlineSize > 0) {
        return Math.round(inlineSize);
      }
    }
    current = current.parentNode;
  }
  return fallback;
};

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

const splitRangeBoundaries = (range: Range) => {
  if (
    range.startContainer.nodeType === Node.TEXT_NODE &&
    range.startOffset > 0
  ) {
    const startText = range.startContainer as Text;
    const newNode = startText.splitText(range.startOffset);
    range.setStart(newNode, 0);
  }
  if (
    range.endContainer.nodeType === Node.TEXT_NODE &&
    range.endOffset < (range.endContainer as Text).length
  ) {
    (range.endContainer as Text).splitText(range.endOffset);
  }
};

const collectTextNodesInRange = (range: Range): Text[] => {
  const ancestor =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;
  if (!ancestor) return [];

  const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (textNode.textContent && textNode.textContent.length > 0 && range.intersectsNode(textNode)) {
      textNodes.push(textNode);
    }
    current = walker.nextNode();
  }

  return textNodes;
};

const normalizeStyleString = (value: string | null): string =>
  (value ?? "")
    .split(";")
    .map((token) => token.trim())
    .filter(Boolean)
    .sort()
    .join(";");

const normalizeAdjacentSpans = (span: HTMLElement): HTMLElement => {
  let current = span;
  const styleSignature = normalizeStyleString(current.getAttribute("style"));

  const mergePrev = () => {
    const prev = current.previousSibling;
    if (!(prev instanceof HTMLElement) || prev.tagName !== "SPAN") return false;
    if (normalizeStyleString(prev.getAttribute("style")) !== styleSignature) return false;

    while (current.firstChild) {
      prev.appendChild(current.firstChild);
    }
    current.remove();
    current = prev;
    return true;
  };

  const mergeNext = () => {
    const next = current.nextSibling;
    if (!(next instanceof HTMLElement) || next.tagName !== "SPAN") return false;
    if (normalizeStyleString(next.getAttribute("style")) !== styleSignature) return false;

    while (next.firstChild) {
      current.appendChild(next.firstChild);
    }
    next.remove();
    return true;
  };

  while (mergePrev()) {
    // no-op
  }
  while (mergeNext()) {
    // no-op
  }

  return current;
};

const createRangeFromNodes = (nodes: Node[]): Range | null => {
  if (nodes.length === 0) return null;
  const range = document.createRange();
  range.setStartBefore(nodes[0]);
  range.setEndAfter(nodes[nodes.length - 1]);
  return range;
};

const applyStylePatchInPlace = ({
  range,
  editable,
  patcher,
}: {
  range: Range;
  editable: HTMLElement;
  patcher: (args: { textNode: Text; target: HTMLElement }) => void;
}): Range | null => {
  splitRangeBoundaries(range);
  const textNodes = collectTextNodesInRange(range);
  if (textNodes.length === 0) return null;

  const styledNodes: HTMLElement[] = [];

  for (const textNode of textNodes) {
    const parent = textNode.parentElement;
    let target: HTMLElement;

    if (
      parent &&
      parent !== editable &&
      parent.tagName === "SPAN" &&
      parent.childNodes.length === 1
    ) {
      target = parent;
    } else {
      target = document.createElement("span");
      textNode.parentNode?.insertBefore(target, textNode);
      target.appendChild(textNode);
    }

    patcher({ textNode, target });
    styledNodes.push(normalizeAdjacentSpans(target));
  }

  const dedupedNodes = styledNodes.filter(
    (node, index) => styledNodes.indexOf(node) === index,
  );

  return createRangeFromNodes(dedupedNodes);
};

const getComputedDecorationLines = (node: Node): Set<string> => {
  const element = getComputedElement(node);
  if (!element) return new Set();
  const line = window.getComputedStyle(element).textDecorationLine;
  return new Set(
    line
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token && token !== "none"),
  );
};

const isNodeBold = (node: Node) => {
  const element = getComputedElement(node);
  if (!element) return false;
  const computed = window.getComputedStyle(element).fontWeight;
  if (computed === "bold") return true;
  const numeric = Number.parseInt(computed, 10);
  return Number.isFinite(numeric) && numeric >= 600;
};

const isNodeItalic = (node: Node) => {
  const element = getComputedElement(node);
  if (!element) return false;
  return window.getComputedStyle(element).fontStyle === "italic";
};

/**
 * 편집 중 inline font-size 중 기본 폰트 크기와 같은 값은 제거한다.
 * 기본값과 다른 크기만 명시적으로 유지해 richText를 안정적으로 정규화한다.
 */
export const normalizeInlineFontSizeOverrides = ({
  editable,
  baseFontSize,
}: {
  editable: HTMLElement;
  baseFontSize: number;
}) => {
  const normalizedBase = Math.round(baseFontSize);

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      walk(child);
    }

    if (!(node instanceof HTMLElement)) return;
    if (node === editable || node.tagName !== "SPAN") return;

    if (node.style.fontSize) {
      const parsed = Number.parseFloat(node.style.fontSize);
      if (Number.isFinite(parsed) && Math.round(parsed) === normalizedBase) {
        node.style.fontSize = "";
      }
    }

    if (node.getAttribute("style") === "") {
      node.removeAttribute("style");
    }

    if (node.tagName === "SPAN" && node.attributes.length === 0) {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      parent.removeChild(node);
      return;
    }

    if (node.tagName === "SPAN" && node.hasAttribute("style")) {
      normalizeAdjacentSpans(node);
    }
  };

  walk(editable);
};

export type PendingInlineStyle = {
  fontSize?: number;
  color?: string;
  fontWeight?: "bold" | "normal";
  fontStyle?: "italic" | "normal";
  underline?: boolean;
  strikethrough?: boolean;
};

export type RichTextCommand =
  | { type: "setFontSize"; size: number; fallback: number }
  | {
      type: "setFontSizeStep";
      delta: number;
      fallback: number;
      clamp: (value: number) => number;
    }
  | { type: "setColor"; color: string }
  | { type: "toggleBold" }
  | { type: "toggleItalic" }
  | { type: "toggleUnderline" }
  | { type: "toggleStrikethrough" };

export const hasPendingInlineStyle = (pending: PendingInlineStyle) =>
  pending.fontSize != null ||
  pending.color != null ||
  pending.fontWeight != null ||
  pending.fontStyle != null ||
  pending.underline != null ||
  pending.strikethrough != null;

const applyPendingPatch = (target: HTMLElement, pending: PendingInlineStyle) => {
  if (pending.fontSize != null) {
    target.style.fontSize = `${pending.fontSize}px`;
  }
  if (pending.color != null) {
    target.style.color = pending.color;
  }
  if (pending.fontWeight != null) {
    target.style.fontWeight = pending.fontWeight;
  }
  if (pending.fontStyle != null) {
    target.style.fontStyle = pending.fontStyle;
  }

  const shouldTouchDecoration =
    pending.underline != null || pending.strikethrough != null;

  if (shouldTouchDecoration) {
    const lines = getComputedDecorationLines(target);

    if (pending.underline != null) {
      if (pending.underline) lines.add("underline");
      else lines.delete("underline");
    }

    if (pending.strikethrough != null) {
      if (pending.strikethrough) lines.add("line-through");
      else lines.delete("line-through");
    }

    target.style.textDecorationLine = lines.size > 0
      ? Array.from(lines).join(" ")
      : "none";
  }
};

/**
 * Range 내 선택된 텍스트의 font-size를 in-place로 변경한다.
 * extractContents를 사용하지 않아 DOM 구조와 Range 참조를 보존한다.
 *
 * @returns 수정된 영역을 감싸는 새 Range, 실패 시 null
 */
export const applyFontSizeInPlace = (
  range: Range,
  editable: HTMLElement,
  resolveSize: (baseSize: number) => number,
  fallback: number,
): Range | null => {
  return applyStylePatchInPlace({
    range,
    editable,
    patcher: ({ textNode, target }) => {
      const baseSize = resolveInlineFontSize(textNode, fallback);
      const newSize = resolveSize(baseSize);
      target.style.fontSize = `${newSize}px`;
    },
  });
};

export const applyPendingInlineStyleInPlace = (
  range: Range,
  editable: HTMLElement,
  pending: PendingInlineStyle,
): Range | null => {
  return applyStylePatchInPlace({
    range,
    editable,
    patcher: ({ target }) => {
      applyPendingPatch(target, pending);
    },
  });
};

export const applyRichTextCommandInPlace = ({
  range,
  editable,
  command,
}: {
  range: Range;
  editable: HTMLElement;
  command: RichTextCommand;
}): Range | null => {
  const textNodes = collectTextNodesInRange(range);

  if (command.type === "setFontSize") {
    return applyFontSizeInPlace(
      range,
      editable,
      () => command.size,
      command.fallback,
    );
  }

  if (command.type === "setFontSizeStep") {
    return applyStylePatchInPlace({
      range,
      editable,
      patcher: ({ textNode, target }) => {
        const base = resolveComputedFontSizeAtNode(textNode, command.fallback);
        const next = command.clamp(base + command.delta);
        target.style.fontSize = `${next}px`;
      },
    });
  }

  if (command.type === "setColor") {
    return applyStylePatchInPlace({
      range,
      editable,
      patcher: ({ target }) => {
        target.style.color = command.color;
      },
    });
  }

  if (command.type === "toggleBold") {
    const allBold = textNodes.length > 0 && textNodes.every((node) => isNodeBold(node));
    const next = allBold ? "normal" : "bold";
    return applyStylePatchInPlace({
      range,
      editable,
      patcher: ({ target }) => {
        target.style.fontWeight = next;
      },
    });
  }

  if (command.type === "toggleItalic") {
    const allItalic = textNodes.length > 0 && textNodes.every((node) => isNodeItalic(node));
    const next = allItalic ? "normal" : "italic";
    return applyStylePatchInPlace({
      range,
      editable,
      patcher: ({ target }) => {
        target.style.fontStyle = next;
      },
    });
  }

  if (command.type === "toggleUnderline" || command.type === "toggleStrikethrough") {
    const lineType = command.type === "toggleUnderline" ? "underline" : "line-through";
    const allHaveLine =
      textNodes.length > 0 &&
      textNodes.every((node) => getComputedDecorationLines(node).has(lineType));

    return applyStylePatchInPlace({
      range,
      editable,
      patcher: ({ target }) => {
        const lines = getComputedDecorationLines(target);
        if (allHaveLine) {
          lines.delete(lineType);
        } else {
          lines.add(lineType);
        }

        target.style.textDecorationLine = lines.size > 0
          ? Array.from(lines).join(" ")
          : "none";
      },
    });
  }

  return null;
};
