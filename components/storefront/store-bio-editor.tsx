"use client"

import { useEffect, type ReactNode } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  bioLooksLikeHtml,
  plainTextToBioHtml,
  sanitizeBioHtml,
} from "@/lib/branding/sanitize-bio-html"

type StoreBioEditorProps = {
  value: string
  onChange: (html: string) => void
  maxChars?: number
  /** Overrides the TipTap content area classes (min/max height, etc.). */
  contentClassName?: string
}

function toEditorHtml(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (bioLooksLikeHtml(trimmed)) return sanitizeBioHtml(trimmed)
  return plainTextToBioHtml(trimmed)
}

export function StoreBioEditor({
  value,
  onChange,
  maxChars = 500,
  contentClassName,
}: StoreBioEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "underline underline-offset-2",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right"],
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[120px] max-h-[220px] overflow-y-auto px-3 py-2 text-sm leading-relaxed text-foreground outline-none",
          contentClassName
        ),
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = sanitizeBioHtml(current.getHTML())
      const text = current.getText()
      if (text.length > maxChars) {
        return
      }
      onChange(html === "<p></p>" ? "" : html)
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor || editor.isFocused) return
    const next = toEditorHtml(value)
    const current = sanitizeBioHtml(editor.getHTML())
    const normalizedCurrent = current === "<p></p>" ? "" : current
    if (next !== normalizedCurrent) {
      editor.commands.setContent(next || "", { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  const charCount = editor.getText().length

  function setLink() {
    if (!editor) return
    const previous = editor.getAttributes("link").href
    const previousHref =
      typeof previous === "string" && previous.length > 0 ? previous : "https://"
    const url = window.prompt("Link URL", previousHref)
    if (url == null) return
    const trimmed = url.trim()
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run()
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            active={editor.isActive("link")}
            onClick={setLink}
          >
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <ToolbarButton
            label="Align left"
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
      <p className="text-xs text-muted-foreground">
        {charCount}/{maxChars}
      </p>
    </div>
  )
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "h-7 w-7 p-0 text-muted-foreground",
        active ? "bg-accent text-foreground" : null
      )}
    >
      {children}
    </Button>
  )
}
