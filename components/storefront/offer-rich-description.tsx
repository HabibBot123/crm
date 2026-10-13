import {
  bioLooksLikeHtml,
  sanitizeBioHtml,
} from "@/lib/branding/sanitize-bio-html"
import { cn } from "@/lib/utils"

type OfferRichDescriptionProps = {
  description: string | null | undefined
  className?: string
  empty?: string | null
}

/** Renders offer description (HTML TipTap or plain text) with shared styles. */
export function OfferRichDescription({
  description,
  className,
  empty = null,
}: OfferRichDescriptionProps) {
  const trimmed = description?.trim() ?? ""
  if (!trimmed) {
    if (!empty) return null
    return <p className={cn("text-sm text-neutral-400", className)}>{empty}</p>
  }

  if (bioLooksLikeHtml(trimmed)) {
    const html = sanitizeBioHtml(trimmed)
    if (!html) {
      if (!empty) return null
      return <p className={cn("text-sm text-neutral-400", className)}>{empty}</p>
    }
    return (
      <>
        <div
          className={cn(
            "offer-rich-desc text-sm leading-relaxed text-neutral-600",
            className
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <style>{OFFER_RICH_DESC_CSS}</style>
      </>
    )
  }

  return (
    <p
      className={cn(
        "text-sm leading-relaxed text-neutral-600 whitespace-pre-line",
        className
      )}
    >
      {trimmed}
    </p>
  )
}

const OFFER_RICH_DESC_CSS = `
  .offer-rich-desc p { margin: 0; }
  .offer-rich-desc p + p { margin-top: 0.55rem; }
  .offer-rich-desc ul,
  .offer-rich-desc ol {
    margin: 0.55rem 0 0;
    padding-left: 1.15rem;
  }
  .offer-rich-desc a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .offer-rich-desc strong { color: #0a0a0a; font-weight: 650; }
`
