"use client"

import { Node, mergeAttributes } from "@tiptap/core"
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react"
import { cn } from "@/lib/utils"

export type CampaignButtonRadius = "round" | "smooth" | "sharp"
export type CampaignButtonSize = "sm" | "md" | "lg"
export type CampaignButtonAlign = "left" | "center" | "right"

export type CampaignButtonAttrs = {
  label: string
  href: string
  radius: CampaignButtonRadius
  size: CampaignButtonSize
  align: CampaignButtonAlign
  bgColor: string
  textColor: string
}

export const CAMPAIGN_BUTTON_DEFAULTS: CampaignButtonAttrs = {
  label: "Click here",
  href: "https://",
  radius: "smooth",
  size: "md",
  align: "center",
  bgColor: "#e07b39",
  textColor: "#ffffff",
}

const RADIUS_PX: Record<CampaignButtonRadius, string> = {
  round: "9999px",
  smooth: "10px",
  sharp: "0",
}

const SIZE_STYLE: Record<
  CampaignButtonSize,
  { padding: string; fontSize: string }
> = {
  sm: { padding: "8px 16px", fontSize: "12px" },
  md: { padding: "12px 24px", fontSize: "14px" },
  lg: { padding: "14px 32px", fontSize: "16px" },
}

export function isCampaignButtonRadius(
  value: string
): value is CampaignButtonRadius {
  return value === "round" || value === "smooth" || value === "sharp"
}

export function isCampaignButtonSize(value: string): value is CampaignButtonSize {
  return value === "sm" || value === "md" || value === "lg"
}

export function isCampaignButtonAlign(
  value: string
): value is CampaignButtonAlign {
  return value === "left" || value === "center" || value === "right"
}

export function campaignButtonInlineStyle(attrs: {
  radius: CampaignButtonRadius
  size: CampaignButtonSize
  bgColor: string
  textColor: string
}): string {
  const size = SIZE_STYLE[attrs.size]
  return [
    "display:inline-block",
    `background:${attrs.bgColor}`,
    `color:${attrs.textColor}`,
    `padding:${size.padding}`,
    `border-radius:${RADIUS_PX[attrs.radius]}`,
    "text-decoration:none",
    "font-weight:600",
    `font-size:${size.fontSize}`,
    "font-family:Arial,Helvetica,sans-serif",
  ].join(";")
}

function parseButtonElement(element: Element): false | CampaignButtonAttrs {
  if (!(element instanceof HTMLElement)) return false
  const radiusRaw = element.getAttribute("data-radius") ?? ""
  const sizeRaw = element.getAttribute("data-size") ?? ""
  const alignRaw = element.getAttribute("data-align") ?? ""
  return {
    label: element.textContent?.trim() || CAMPAIGN_BUTTON_DEFAULTS.label,
    href: element.getAttribute("href") || CAMPAIGN_BUTTON_DEFAULTS.href,
    radius: isCampaignButtonRadius(radiusRaw)
      ? radiusRaw
      : CAMPAIGN_BUTTON_DEFAULTS.radius,
    size: isCampaignButtonSize(sizeRaw)
      ? sizeRaw
      : CAMPAIGN_BUTTON_DEFAULTS.size,
    align: isCampaignButtonAlign(alignRaw)
      ? alignRaw
      : CAMPAIGN_BUTTON_DEFAULTS.align,
    bgColor:
      element.getAttribute("data-bg") || CAMPAIGN_BUTTON_DEFAULTS.bgColor,
    textColor:
      element.getAttribute("data-text-color") ||
      CAMPAIGN_BUTTON_DEFAULTS.textColor,
  }
}

function readAttrs(node: ReactNodeViewProps["node"]): CampaignButtonAttrs {
  const label =
    typeof node.attrs.label === "string" && node.attrs.label.length > 0
      ? node.attrs.label
      : CAMPAIGN_BUTTON_DEFAULTS.label
  const href =
    typeof node.attrs.href === "string" && node.attrs.href.length > 0
      ? node.attrs.href
      : CAMPAIGN_BUTTON_DEFAULTS.href
  const radiusRaw =
    typeof node.attrs.radius === "string" ? node.attrs.radius : ""
  const sizeRaw = typeof node.attrs.size === "string" ? node.attrs.size : ""
  const alignRaw = typeof node.attrs.align === "string" ? node.attrs.align : ""
  const bgColor =
    typeof node.attrs.bgColor === "string" && node.attrs.bgColor.length > 0
      ? node.attrs.bgColor
      : CAMPAIGN_BUTTON_DEFAULTS.bgColor
  const textColor =
    typeof node.attrs.textColor === "string" && node.attrs.textColor.length > 0
      ? node.attrs.textColor
      : CAMPAIGN_BUTTON_DEFAULTS.textColor

  return {
    label,
    href,
    radius: isCampaignButtonRadius(radiusRaw)
      ? radiusRaw
      : CAMPAIGN_BUTTON_DEFAULTS.radius,
    size: isCampaignButtonSize(sizeRaw)
      ? sizeRaw
      : CAMPAIGN_BUTTON_DEFAULTS.size,
    align: isCampaignButtonAlign(alignRaw)
      ? alignRaw
      : CAMPAIGN_BUTTON_DEFAULTS.align,
    bgColor,
    textColor,
  }
}

function CampaignButtonView({ node, selected }: ReactNodeViewProps) {
  const attrs = readAttrs(node)
  return (
    <NodeViewWrapper className="my-4" style={{ textAlign: attrs.align }}>
      <a
        href={attrs.href}
        contentEditable={false}
        className={cn(
          "inline-block cursor-pointer select-none no-underline",
          selected ? "ring-2 ring-ring ring-offset-2" : null
        )}
        style={{
          backgroundColor: attrs.bgColor,
          color: attrs.textColor,
          padding: SIZE_STYLE[attrs.size].padding,
          borderRadius: RADIUS_PX[attrs.radius],
          fontWeight: 600,
          fontSize: SIZE_STYLE[attrs.size].fontSize,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
        onClick={(event) => event.preventDefault()}
      >
        {attrs.label}
      </a>
    </NodeViewWrapper>
  )
}

export const CampaignButton = Node.create({
  name: "campaignButton",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: CAMPAIGN_BUTTON_DEFAULTS.label },
      href: { default: CAMPAIGN_BUTTON_DEFAULTS.href },
      radius: { default: CAMPAIGN_BUTTON_DEFAULTS.radius },
      size: { default: CAMPAIGN_BUTTON_DEFAULTS.size },
      align: { default: CAMPAIGN_BUTTON_DEFAULTS.align },
      bgColor: { default: CAMPAIGN_BUTTON_DEFAULTS.bgColor },
      textColor: { default: CAMPAIGN_BUTTON_DEFAULTS.textColor },
    }
  },

  parseHTML() {
    return [
      {
        tag: "a[data-campaign-button]",
        getAttrs: (element) => parseButtonElement(element),
      },
    ]
  },

  renderHTML({ node }) {
    const attrs = readAttrs(node)

    return [
      "p",
      { style: `text-align:${attrs.align};margin:24px 0;` },
      [
        "a",
        mergeAttributes({
          href: attrs.href,
          "data-campaign-button": "",
          "data-radius": attrs.radius,
          "data-size": attrs.size,
          "data-align": attrs.align,
          "data-bg": attrs.bgColor,
          "data-text-color": attrs.textColor,
          style: campaignButtonInlineStyle({
            radius: attrs.radius,
            size: attrs.size,
            bgColor: attrs.bgColor,
            textColor: attrs.textColor,
          }),
        }),
        attrs.label,
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CampaignButtonView)
  },
})
