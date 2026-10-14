"use client"

import {
  forwardRef,
  useReducer,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Image from "@tiptap/extension-image"
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style"
import type { Editor, JSONContent } from "@tiptap/core"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MousePointerClick,
  Underline as UnderlineIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  CampaignVariable,
  toCampaignEmailHtml,
} from "@/components/dashboard/campaigns/campaign-variable-chip"
import {
  CampaignButton,
  CAMPAIGN_BUTTON_DEFAULTS,
  isCampaignButtonAlign,
  isCampaignButtonRadius,
  isCampaignButtonSize,
  type CampaignButtonAlign,
  type CampaignButtonRadius,
  type CampaignButtonSize,
} from "@/components/dashboard/campaigns/campaign-button"
import {
  CAMPAIGN_EMAIL_VARIABLES,
  DEFAULT_CAMPAIGN_EMAIL_BODY_HTML,
  UNSUBSCRIBE_TOKEN,
} from "@/schemas/campaign-email-template.schema"

const selectClassName =
  "h-8 rounded-xl border border-border bg-background px-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"

const FONT_SIZES = [
  { label: "S", value: "12px" },
  { label: "M", value: "14px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "24px" },
  { label: "2XL", value: "32px" },
] as const

const editorBodyClassName = cn(
  "min-h-[320px] px-4 py-3 text-sm leading-relaxed text-foreground outline-none",
  "[&_img]:max-w-full [&_img]:rounded-lg",
  "[&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5 [&_li_p]:my-0",
  "[&_a.campaign-email-var-link]:rounded-md [&_a.campaign-email-var-link]:bg-primary/15",
  "[&_a.campaign-email-var-link]:px-1.5 [&_a.campaign-email-var-link]:py-0.5 [&_a.campaign-email-var-link]:text-xs",
  "[&_a.campaign-email-var-link]:font-semibold [&_a.campaign-email-var-link]:text-primary",
  "[&_a.campaign-email-var-link]:ring-1 [&_a.campaign-email-var-link]:ring-primary/25 [&_a.campaign-email-var-link]:no-underline"
)

export type CampaignEmailEditorChange = {
  html: string
  json: unknown
}

function isTipTapDoc(value: unknown): value is JSONContent {
  if (!value || typeof value !== "object") return false
  if (!("type" in value)) return false
  return value.type === "doc"
}

function emitChange(
  editorHtml: string,
  json: unknown,
  onChange?: (value: CampaignEmailEditorChange) => void
) {
  onChange?.({
    html: toCampaignEmailHtml(editorHtml),
    json,
  })
}

export function CampaignEmailEditor({
  initialHtml,
  initialJson,
  onChange,
}: {
  initialHtml?: string
  initialJson?: unknown
  onChange?: (value: CampaignEmailEditorChange) => void
}) {
  const [, bump] = useReducer((n: number) => n + 1, 0)

  const initialContent = isTipTapDoc(initialJson)
    ? initialJson
    : initialHtml?.trim()
      ? initialHtml
      : DEFAULT_CAMPAIGN_EMAIL_BODY_HTML

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        code: false,
        blockquote: false,
        heading: false,
      }),
      CampaignVariable,
      CampaignButton,
      Underline,
      TextStyle,
      Color,
      FontSize,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          style: "max-width:100%;height:auto;display:block;margin:16px auto;",
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          style: "color:#e07b39;text-decoration:underline;",
        },
      }),
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right"],
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: editorBodyClassName,
      },
    },
    onUpdate: ({ editor: current }) => {
      bump()
      emitChange(current.getHTML(), current.getJSON(), onChange)
    },
    onSelectionUpdate: () => bump(),
    onCreate: ({ editor: current }) => {
      emitChange(current.getHTML(), current.getJSON(), onChange)
    },
    immediatelyRender: false,
  })

  if (!editor) {
    return (
      <div className="min-h-[360px] w-full rounded-xl border border-border bg-muted/30" />
    )
  }

  const activeEditor = editor

  function insertVariable(
    key: string,
    label: string,
    defaultFallback: string
  ) {
    if (key === "UNSUBSCRIBE_URL") {
      activeEditor
        .chain()
        .focus()
        .insertContent(
          `<a href="${UNSUBSCRIBE_TOKEN}" class="campaign-email-var-link">Unsubscribe</a>`
        )
        .run()
      return
    }
    activeEditor
      .chain()
      .focus()
      .insertCampaignVariable({
        key,
        label,
        fallback: defaultFallback,
      })
      .run()
  }

  function applyLink(url: string) {
    const trimmed = url.trim()
    if (trimmed === "") {
      activeEditor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    activeEditor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run()
  }

  function applyImage(url: string) {
    const trimmed = url.trim()
    if (!trimmed) return
    activeEditor.chain().focus().setImage({ src: trimmed }).run()
  }

  function currentLinkHref(): string {
    const previous = activeEditor.getAttributes("link").href
    return typeof previous === "string" && previous.length > 0
      ? previous
      : "https://"
  }

  function updateButtonAttr(
    key: keyof typeof CAMPAIGN_BUTTON_DEFAULTS,
    value: string
  ) {
    // No .focus(): it clears the node selection before update.
    activeEditor
      .chain()
      .updateAttributes("campaignButton", { [key]: value })
      .run()
  }

  const textStyleColor = activeEditor.getAttributes("textStyle").color
  const currentColor =
    typeof textStyleColor === "string" ? textStyleColor : ""

  const buttonAttrs = activeEditor.getAttributes("campaignButton")
  const buttonLabel =
    typeof buttonAttrs.label === "string"
      ? buttonAttrs.label
      : CAMPAIGN_BUTTON_DEFAULTS.label
  const buttonHref =
    typeof buttonAttrs.href === "string"
      ? buttonAttrs.href
      : CAMPAIGN_BUTTON_DEFAULTS.href
  const buttonRadiusRaw =
    typeof buttonAttrs.radius === "string" ? buttonAttrs.radius : ""
  const buttonSizeRaw =
    typeof buttonAttrs.size === "string" ? buttonAttrs.size : ""
  const buttonAlignRaw =
    typeof buttonAttrs.align === "string" ? buttonAttrs.align : ""
  const buttonRadius: CampaignButtonRadius = isCampaignButtonRadius(
    buttonRadiusRaw
  )
    ? buttonRadiusRaw
    : CAMPAIGN_BUTTON_DEFAULTS.radius
  const buttonSize: CampaignButtonSize = isCampaignButtonSize(buttonSizeRaw)
    ? buttonSizeRaw
    : CAMPAIGN_BUTTON_DEFAULTS.size
  const buttonAlign: CampaignButtonAlign = isCampaignButtonAlign(buttonAlignRaw)
    ? buttonAlignRaw
    : CAMPAIGN_BUTTON_DEFAULTS.align
  const buttonBg =
    typeof buttonAttrs.bgColor === "string"
      ? buttonAttrs.bgColor
      : CAMPAIGN_BUTTON_DEFAULTS.bgColor
  const buttonText =
    typeof buttonAttrs.textColor === "string"
      ? buttonAttrs.textColor
      : CAMPAIGN_BUTTON_DEFAULTS.textColor

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
          <VariableInsertButton onInsert={insertVariable} />

          <ToolbarSep />

          <ToolbarButton
            label="Bullet list"
            active={activeEditor.isActive("bulletList")}
            onAction={() =>
              activeEditor.chain().focus().toggleBulletList().run()
            }
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={activeEditor.isActive("orderedList")}
            onAction={() =>
              activeEditor.chain().focus().toggleOrderedList().run()
            }
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>

          <ToolbarSep />

          <ToolbarButton
            label="Align left"
            active={activeEditor.isActive({ textAlign: "left" })}
            onAction={() =>
              activeEditor.chain().focus().setTextAlign("left").run()
            }
          >
            <AlignLeft className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={activeEditor.isActive({ textAlign: "center" })}
            onAction={() =>
              activeEditor.chain().focus().setTextAlign("center").run()
            }
          >
            <AlignCenter className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={activeEditor.isActive({ textAlign: "right" })}
            onAction={() =>
              activeEditor.chain().focus().setTextAlign("right").run()
            }
          >
            <AlignRight className="size-3.5" />
          </ToolbarButton>

          <ToolbarSep />

          <UrlPopover
            label="Image URL"
            placeholder="https://"
            initialUrl="https://"
            submitLabel="Insert"
            onSubmit={applyImage}
            trigger={
              <ToolbarButton label="Image URL" active={false}>
                <ImageIcon className="size-3.5" />
              </ToolbarButton>
            }
          />
          <ToolbarButton
            label="Button"
            active={activeEditor.isActive("campaignButton")}
            onAction={() =>
              activeEditor
                .chain()
                .focus()
                .insertContent({
                  type: "campaignButton",
                  attrs: { ...CAMPAIGN_BUTTON_DEFAULTS },
                })
                .run()
            }
          >
            <MousePointerClick className="size-3.5" />
          </ToolbarButton>
        </div>

        <BubbleMenu
          editor={activeEditor}
          options={{ placement: "top" }}
          shouldShow={({ editor: current, state }) => {
            const { empty } = state.selection
            if (empty) return false
            if (current.isActive("campaignVariable")) return false
            if (current.isActive("campaignButton")) return false
            return current.isEditable
          }}
          className="flex items-center gap-0.5 rounded-xl border border-border bg-background p-1"
        >
          <ToolbarButton
            label="Bold"
            active={activeEditor.isActive("bold")}
            onAction={() => activeEditor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={activeEditor.isActive("italic")}
            onAction={() => activeEditor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={activeEditor.isActive("underline")}
            onAction={() =>
              activeEditor.chain().focus().toggleUnderline().run()
            }
          >
            <UnderlineIcon className="size-3.5" />
          </ToolbarButton>
          <FontSizeButton editor={activeEditor} />
          <UrlPopover
            label="Link URL"
            placeholder="https://"
            initialUrl={currentLinkHref()}
            submitLabel="Apply"
            removeLabel={activeEditor.isActive("link") ? "Remove" : undefined}
            onSubmit={applyLink}
            onRemove={() =>
              activeEditor
                .chain()
                .focus()
                .extendMarkRange("link")
                .unsetLink()
                .run()
            }
            trigger={
              <ToolbarButton
                label="Link"
                active={activeEditor.isActive("link")}
              >
                <Link2 className="size-3.5" />
              </ToolbarButton>
            }
          />

          <ToolbarSep />

          <label
            title="Text color"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg hover:bg-accent/60"
          >
            <input
              type="color"
              aria-label="Text color"
              value={/^#[0-9A-Fa-f]{6}$/.test(currentColor) ? currentColor : "#111827"}
              onChange={(event) => {
                activeEditor.chain().focus().setColor(event.target.value).run()
              }}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </BubbleMenu>

        <BubbleMenu
          editor={activeEditor}
          options={{ placement: "top" }}
          shouldShow={({ editor: current }) =>
            current.isEditable && current.isActive("campaignButton")
          }
          className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background p-1.5"
        >
          <Input
            value={buttonLabel}
            onChange={(event) => updateButtonAttr("label", event.target.value)}
            className="h-8 w-40"
            placeholder="Button label"
            aria-label="Button label"
          />
          <select
            aria-label="Corner style"
            className={selectClassName}
            value={buttonRadius}
            onChange={(event) => {
              if (isCampaignButtonRadius(event.target.value)) {
                updateButtonAttr("radius", event.target.value)
              }
            }}
          >
            <option value="round">Round</option>
            <option value="smooth">Smooth</option>
            <option value="sharp">Sharp</option>
          </select>
          <select
            aria-label="Size"
            className={selectClassName}
            value={buttonSize}
            onChange={(event) => {
              if (isCampaignButtonSize(event.target.value)) {
                updateButtonAttr("size", event.target.value)
              }
            }}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
          <ToolbarButton
            label="Align left"
            active={buttonAlign === "left"}
            onAction={() => updateButtonAttr("align", "left")}
          >
            <AlignLeft className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={buttonAlign === "center"}
            onAction={() => updateButtonAttr("align", "center")}
          >
            <AlignCenter className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={buttonAlign === "right"}
            onAction={() => updateButtonAttr("align", "right")}
          >
            <AlignRight className="size-3.5" />
          </ToolbarButton>
          <Input
            value={buttonHref}
            onChange={(event) => updateButtonAttr("href", event.target.value)}
            className="h-8 w-44 focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border"
            placeholder="https://"
            aria-label="Button link"
          />
          <label
            title="Background color"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl hover:bg-accent/60"
          >
            <input
              type="color"
              aria-label="Background color"
              value={/^#[0-9A-Fa-f]{6}$/.test(buttonBg) ? buttonBg : "#e07b39"}
              onChange={(event) =>
                updateButtonAttr("bgColor", event.target.value)
              }
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
          <label
            title="Text color"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl hover:bg-accent/60"
          >
            <input
              type="color"
              aria-label="Button text color"
              value={
                /^#[0-9A-Fa-f]{6}$/.test(buttonText) ? buttonText : "#ffffff"
              }
              onChange={(event) =>
                updateButtonAttr("textColor", event.target.value)
              }
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </BubbleMenu>

      <EditorContent className="w-full" editor={activeEditor} />
    </div>
  )
}

function VariableInsertButton({
  onInsert,
}: {
  onInsert: (key: string, label: string, defaultFallback: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton label="Insert variable" active={open}>
          <Braces className="size-3.5" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0" sideOffset={6}>
        <Command>
          <CommandInput placeholder="Search variables…" />
          <CommandList>
            <CommandEmpty>No variable found.</CommandEmpty>
            <CommandGroup>
              {CAMPAIGN_EMAIL_VARIABLES.map((variable) => (
                <CommandItem
                  key={variable.key}
                  value={`${variable.label} ${variable.key}`}
                  onSelect={() => {
                    onInsert(
                      variable.key,
                      variable.label,
                      variable.defaultFallback
                    )
                    setOpen(false)
                  }}
                >
                  {variable.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FontSizeButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const fontSizeRaw = editor.getAttributes("textStyle").fontSize
  const current = typeof fontSizeRaw === "string" ? fontSizeRaw : ""
  const activeLabel =
    FONT_SIZES.find((size) => size.value === current)?.label ?? "M"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          label="Font size"
          active={open || current !== ""}
          className="w-auto min-w-7 px-1.5 text-xs font-semibold tabular-nums"
        >
          {activeLabel}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-36 p-1" sideOffset={6}>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent",
            current === "" && "bg-accent font-medium"
          )}
          onMouseDown={(event) => {
            event.preventDefault()
            editor.chain().focus().unsetFontSize().run()
            setOpen(false)
          }}
        >
          <span>Default</span>
          <span className="text-xs text-muted-foreground">14px</span>
        </button>
        {FONT_SIZES.map((size) => (
          <button
            key={size.value}
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent",
              current === size.value && "bg-accent font-medium"
            )}
            onMouseDown={(event) => {
              event.preventDefault()
              editor.chain().focus().setFontSize(size.value).run()
              setOpen(false)
            }}
          >
            <span>{size.label}</span>
            <span className="text-xs text-muted-foreground">{size.value}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function ToolbarSep() {
  return <span className="mx-1 h-4 w-px bg-border" aria-hidden />
}

function UrlPopover({
  trigger,
  label,
  placeholder,
  initialUrl,
  submitLabel,
  removeLabel,
  onSubmit,
  onRemove,
}: {
  trigger: ReactElement
  label: string
  placeholder: string
  initialUrl: string
  submitLabel: string
  removeLabel?: string
  onSubmit: (url: string) => void
  onRemove?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(initialUrl)

  function submit() {
    onSubmit(url)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setUrl(initialUrl)
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3" sideOffset={6}>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        <Input
          aria-label={label}
          value={url}
          placeholder={placeholder}
          className="focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            }
          }}
        />
        <div className="flex items-center justify-end gap-1">
          {removeLabel && onRemove ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
            >
              {removeLabel}
            </Button>
          ) : null}
          <Button type="button" onClick={submit}>
            {submitLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const ToolbarButton = forwardRef<
  HTMLButtonElement,
  {
    label: string
    active: boolean
    /** Run on mousedown so TipTap keeps the current selection. */
    onAction?: () => void
    children: ReactNode
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type">
>(function ToolbarButton(
  { label, active, onAction, className, onMouseDown, children, ...props },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault()
        onMouseDown?.(event)
        onAction?.()
      }}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-accent text-foreground" : null,
        className
      )}
    >
      {children}
    </button>
  )
})
