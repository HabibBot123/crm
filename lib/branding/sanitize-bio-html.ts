import sanitizeHtml from "sanitize-html"

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "a", "ul", "ol", "li"]

/** Sanitize store bio HTML for safe render / persist. */
export function sanitizeBioHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      p: ["style"],
      li: ["style"],
    },
    allowedStyles: {
      p: {
        "text-align": [/^(left|center|right)$/],
      },
      li: {
        "text-align": [/^(left|center|right)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  }).trim()
}

export function bioLooksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/** Plain text → minimal TipTap-compatible HTML paragraphs. */
export function plainTextToBioHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const withBreaks = block
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>")
      return `<p>${withBreaks}</p>`
    })
    .join("")
}

/** Persist TipTap / plain description as sanitized HTML, or null if empty. */
export function toRichTextHtml(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (bioLooksLikeHtml(trimmed)) {
    const html = sanitizeBioHtml(trimmed)
    return html || null
  }
  const html = sanitizeBioHtml(plainTextToBioHtml(trimmed))
  return html || null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
