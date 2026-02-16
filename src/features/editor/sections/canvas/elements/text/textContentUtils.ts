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
            } else if (el.style.textDecoration?.includes("underline")) {
              el.style.textDecoration = el.style.textDecoration.replace("underline", "").trim();
            }
            break;
          case "strikethrough":
            if (tagName === "s" || tagName === "strike" || tagName === "del") {
              shouldUnwrap = true;
            } else if (el.style.textDecoration?.includes("line-through")) {
              el.style.textDecoration = el.style.textDecoration.replace("line-through", "").trim();
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
  // 1. Range 경계 텍스트 노드를 분할하여 선택 범위를 정확히 맞춘다
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

  // 2. 범위 내 텍스트 노드를 수집 (DOM에서 제거하지 않음)
  const ancestor =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement!
      : range.commonAncestorContainer;
  const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (
      current.textContent &&
      current.textContent.length > 0 &&
      range.intersectsNode(current)
    ) {
      textNodes.push(current as Text);
    }
    current = walker.nextNode();
  }
  if (textNodes.length === 0) return null;

  // 3. 각 텍스트 노드에 font-size를 in-place 적용
  const wrappedNodes: Node[] = [];
  for (const textNode of textNodes) {
    const baseSize = resolveInlineFontSize(textNode, fallback);
    const newSize = resolveSize(baseSize);
    const parent = textNode.parentElement;

    if (
      parent &&
      parent !== editable &&
      parent.tagName === "SPAN" &&
      parent.style.fontSize &&
      parent.childNodes.length === 1
    ) {
      // 부모 span이 font-size를 가지고 유일한 자식이면 직접 갱신
      parent.style.fontSize = `${newSize}px`;
      wrappedNodes.push(parent);
    } else {
      // 새 span으로 감싸기
      const span = document.createElement("span");
      span.style.fontSize = `${newSize}px`;
      textNode.parentNode!.insertBefore(span, textNode);
      span.appendChild(textNode);
      wrappedNodes.push(span);
    }
  }

  if (wrappedNodes.length === 0) return null;

  // 4. 수정된 노드들로 새 Range 생성
  const nextRange = document.createRange();
  nextRange.setStartBefore(wrappedNodes[0]);
  nextRange.setEndAfter(wrappedNodes[wrappedNodes.length - 1]);
  return nextRange;
};
