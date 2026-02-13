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
  styleType: "bold" | "italic" | "underline" | "strikethrough" | "color"
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
