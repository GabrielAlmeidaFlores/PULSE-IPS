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
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
}

const LEGAL_DOCUMENT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "b", "i",
    "ul", "ol", "li",
    "a",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
}

export function sanitizeRichHtml(dirty: string): string {
  const sanitized = sanitizeHtml(dirty, ALLOWED_HTML_OPTIONS)
  return sanitized.replace(/\p{Extended_Pictographic}/gu, "").trim()
}

export function sanitizeLegalDocument(dirty: string): string {
  const sanitized = sanitizeHtml(dirty, LEGAL_DOCUMENT_OPTIONS)
  return sanitized.replace(/\p{Extended_Pictographic}/gu, "").trim()
}
