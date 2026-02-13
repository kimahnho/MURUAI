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
 * Remove specific inline style tags from richText when applying global style.
 * This ensures partial styles follow the global style setting.
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
          // Unwrap: replace element with its children
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
        } else {
          // Recursively process children
          processNode(el);

          // Clean up empty style attributes
          if (el.getAttribute("style") === "") {
            el.removeAttribute("style");
          }

          // Unwrap span elements that have no attributes
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
