import sanitizeHtml from "sanitize-html"

const ALLOWED_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "b", "i", "u", "s",
    "ul", "ol", "li",
    "a",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    "*": ["class", "style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
}

export function sanitizeRichHtml(dirty: string): string {
  return sanitizeHtml(dirty, ALLOWED_HTML_OPTIONS)
}
