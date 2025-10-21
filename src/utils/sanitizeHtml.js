const DEFAULT_ALLOWED_TAGS = new Set([
  "a",
  "b",
  "br",
  "code",
  "em",
  "i",
  "strong",
  "u",
  "ul",
  "ol",
  "li",
  "p",
  "span",
]);

const URL_ATTRS = new Set(["href", "src"]);

function isSafeUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  return !(
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:text") ||
    trimmed.startsWith("vbscript:")
  );
}

const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;

function sanitizeNode(node, allowedTags) {
  const childNodes = Array.from(node.childNodes);
  childNodes.forEach((child) => {
    if (child.nodeType === ELEMENT_NODE) {
      const tagName = child.tagName.toLowerCase();
      if (!allowedTags.has(tagName)) {
        if (child.childNodes.length) {
          // Replace the disallowed element with its children
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
        }
        node.removeChild(child);
        return;
      }

      // Clean attributes
      Array.from(child.attributes).forEach(({ name, value }) => {
        const lowerName = name.toLowerCase();
        if (lowerName.startsWith("on")) {
          child.removeAttribute(name);
          return;
        }
        if (URL_ATTRS.has(lowerName) && !isSafeUrl(value)) {
          child.removeAttribute(name);
          return;
        }
        if (lowerName === "style") {
          child.removeAttribute(name);
        }
      });

      sanitizeNode(child, allowedTags);
    } else if (child.nodeType === COMMENT_NODE) {
      node.removeChild(child);
    }
  });
}

export function sanitizeHtml(input, { allowedTags = DEFAULT_ALLOWED_TAGS } = {}) {
  if (typeof input !== "string" || input.trim() === "") {
    return "";
  }

  if (typeof window === "undefined") {
    return input;
  }

  const template = document.createElement("template");
  template.innerHTML = input;
  sanitizeNode(template.content, allowedTags);
  return template.innerHTML;
}

export default sanitizeHtml;
