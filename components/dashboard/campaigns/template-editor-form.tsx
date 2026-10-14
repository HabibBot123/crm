"use client"

import { useRef, useState } from "react"
import { Braces } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SectionCard } from "@/components/dashboard/section-card"
import { CampaignEmailEditor } from "@/components/dashboard/campaigns/campaign-email-editor"
import { cn } from "@/lib/utils"
import {
  buildCampaignVariableToken,
  CAMPAIGN_EMAIL_VARIABLES,
  htmlHasUnsubscribeLink,
  substituteCampaignVariables,
} from "@/schemas/campaign-email-template.schema"

const SUBJECT_VARIABLES = CAMPAIGN_EMAIL_VARIABLES.filter(
  (variable) => variable.key !== "UNSUBSCRIBE_URL"
)

export type TemplateEditorFormValues = {
  name: string
  subject: string
  body_html: string
  body_json: unknown
}

export function TemplateEditorForm({
  initialName = "",
  initialSubject = "",
  initialBodyHtml = "",
  initialBodyJson,
  editorKey,
  saving,
  onSave,
  onCancel,
}: {
  initialName?: string
  initialSubject?: string
  initialBodyHtml?: string
  initialBodyJson?: unknown
  editorKey: string
  saving: boolean
  onSave: (values: TemplateEditorFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [subject, setSubject] = useState(initialSubject)
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml)
  const [bodyJson, setBodyJson] = useState<unknown>(initialBodyJson ?? {})
  const [showPreview, setShowPreview] = useState(false)
  const [subjectVarsOpen, setSubjectVarsOpen] = useState(false)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  const previewHtml = substituteCampaignVariables(bodyHtml, {
    firstName: "Alex",
    lastName: "Doe",
    email: "alex@example.com",
  })

  const canSave = name.trim().length > 0 && htmlHasUnsubscribeLink(bodyHtml)

  function insertSubjectVariable(key: string, defaultFallback: string) {
    const token = buildCampaignVariableToken(key, defaultFallback)
    const input = subjectInputRef.current
    const start = input?.selectionStart ?? subject.length
    const end = input?.selectionEnd ?? subject.length
    const next = `${subject.slice(0, start)}${token}${subject.slice(end)}`
    setSubject(next)
    setSubjectVarsOpen(false)
    requestAnimationFrame(() => {
      if (!input) return
      input.focus()
      const caret = start + token.length
      input.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Monthly update"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subject
            </label>
            <InputGroup>
              <InputGroupInput
                ref={subjectInputRef}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Hi {{{FIRST_NAME|there}}}"
              />
              <InputGroupAddon align="inline-end">
                <Popover open={subjectVarsOpen} onOpenChange={setSubjectVarsOpen}>
                  <PopoverTrigger asChild>
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label="Insert variable"
                      title="Insert variable"
                    >
                      <Braces className="size-3.5" />
                    </InputGroupButton>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-0" sideOffset={6}>
                    <Command>
                      <CommandInput placeholder="Search variables…" />
                      <CommandList>
                        <CommandEmpty>No variable found.</CommandEmpty>
                        <CommandGroup>
                          {SUBJECT_VARIABLES.map((variable) => (
                            <CommandItem
                              key={variable.key}
                              value={`${variable.label} ${variable.key}`}
                              onSelect={() =>
                                insertSubjectVariable(
                                  variable.key,
                                  variable.defaultFallback
                                )
                              }
                            >
                              {variable.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Body
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview((value) => !value)}
              >
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </div>
            {showPreview ? (
              <div
                className={cn(
                  "rounded-xl border border-border px-4 py-3 text-sm leading-relaxed",
                  "[&_img]:max-w-full [&_p]:my-2",
                  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
                  "[&_li]:my-0.5 [&_li_p]:my-0"
                )}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : null}
            <div className={showPreview ? "hidden" : undefined}>
              <CampaignEmailEditor
                key={editorKey}
                initialHtml={initialBodyHtml}
                initialJson={initialBodyJson}
                onChange={(value) => {
                  setBodyHtml(value.html)
                  setBodyJson(value.json ?? {})
                }}
              />
            </div>
            {!htmlHasUnsubscribeLink(bodyHtml) ? (
              <p className="text-sm text-destructive">
                Add the Unsubscribe variable before saving.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={saving || !canSave}
          onClick={() => {
            void onSave({
              name: name.trim(),
              subject: subject.trim(),
              body_html: bodyHtml,
              body_json: bodyJson,
            })
          }}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
