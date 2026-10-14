"use client"

import { useId, useState } from "react"
import { Node, mergeAttributes } from "@tiptap/core"
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildCampaignVariableToken } from "@/schemas/campaign-email-template.schema"
import { cn } from "@/lib/utils"

type CampaignVariableAttrs = {
  key: string
  label: string
  fallback: string
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    campaignVariable: {
      insertCampaignVariable: (attrs: CampaignVariableAttrs) => ReturnType
    }
  }
}

function CampaignVariableChipView({
  node,
  updateAttributes,
  selected,
}: ReactNodeViewProps) {
  const [open, setOpen] = useState(false)
  const inputId = useId()
  const key = typeof node.attrs.key === "string" ? node.attrs.key : ""
  const label =
    typeof node.attrs.label === "string" && node.attrs.label.length > 0
      ? node.attrs.label
      : key
  const fallback =
    typeof node.attrs.fallback === "string" ? node.attrs.fallback : ""

  return (
    <NodeViewWrapper as="span" className="inline align-baseline">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            contentEditable={false}
            className={cn(
              "campaign-email-var mx-0.5 inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5",
              "text-xs font-semibold text-primary ring-1 ring-primary/25 align-baseline",
              selected ? "ring-2 ring-ring" : null
            )}
            title={fallback ? `If empty: ${fallback}` : "If empty: (blank)"}
            onMouseDown={(event) => event.preventDefault()}
          >
            {fallback ? `${label} | ${fallback}` : label}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-56 space-y-1.5 p-3"
          sideOffset={6}
        >
          <Label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            If empty
          </Label>
          <Input
            id={inputId}
            value={fallback}
            placeholder="Leave blank"
            className="focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border"
            onChange={(event) =>
              updateAttributes({ fallback: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                setOpen(false)
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  )
}

/** Inline atom chip for Resend merge tags. Export via `toCampaignEmailHtml`. */
export const CampaignVariable = Node.create({
  name: "campaignVariable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: { default: "" },
      label: { default: "" },
      fallback: { default: "" },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span[data-campaign-variable]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          const key = element.getAttribute("data-campaign-variable")
          if (!key) return false
          return {
            key,
            label: element.textContent?.trim() || key,
            fallback: element.getAttribute("data-fallback") ?? "",
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    const key = String(node.attrs.key ?? "")
    const fallback = String(node.attrs.fallback ?? "")
    const label = String(node.attrs.label ?? key)
    return [
      "span",
      mergeAttributes({
        "data-campaign-variable": key,
        "data-fallback": fallback,
        class: "campaign-email-var",
        contenteditable: "false",
      }),
      label,
    ]
  },

  addCommands() {
    return {
      insertCampaignVariable:
        (attrs) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({ type: this.name, attrs })
            .run(),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(CampaignVariableChipView)
  },
})

/** Chip spans → Resend `{{{KEY|fallback}}}` for send / preview / save. */
export function toCampaignEmailHtml(html: string): string {
  const withTokens = html.replace(
    /<span[^>]*data-campaign-variable="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (match, key: string) => {
      const fallbackMatch = /data-fallback="([^"]*)"/.exec(match)
      const fallback = fallbackMatch
        ? fallbackMatch[1]
            .replaceAll("&quot;", '"')
            .replaceAll("&amp;", "&")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
        : ""
      return buildCampaignVariableToken(key, fallback)
    }
  )
  // Empty TipTap paragraphs collapse in preview/email clients without a <br>.
  return withTokens.replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "<p><br></p>")
}
