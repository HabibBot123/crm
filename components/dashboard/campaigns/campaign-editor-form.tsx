"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { Braces, FileText, Mail, Send, Users, Settings2 } from "lucide-react"
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
import { SearchSelect } from "@/components/ui/search-select"
import { SectionCard } from "@/components/dashboard/section-card"
import { NavList, type NavListItem } from "@/components/dashboard/nav-list"
import { CampaignEmailEditor } from "@/components/dashboard/campaigns/campaign-email-editor"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { cn } from "@/lib/utils"
import {
  buildCampaignVariableToken,
  CAMPAIGN_EMAIL_VARIABLES,
  DEFAULT_CAMPAIGN_EMAIL_BODY_HTML,
  htmlHasUnsubscribeLink,
  substituteCampaignVariables,
  type CampaignEmailTemplate,
} from "@/schemas/campaign-email-template.schema"
import type { CampaignSegment } from "@/schemas/campaign-segment.schema"
import type { MarketingCampaign } from "@/schemas/marketing-campaign.schema"
import { usePreviewCampaignSegment } from "@/hooks/use-campaign-segments"

const SUBJECT_VARIABLES = CAMPAIGN_EMAIL_VARIABLES.filter(
  (variable) => variable.key !== "UNSUBSCRIBE_URL"
)

const RECIPIENT_SYNC_BADGE = {
  synced: { label: "Synced", variant: "success" as const },
  pending: { label: "Pending", variant: "warning" as const },
}

export type CampaignEditorFormValues = {
  name: string
  segment_id: number
  template_id: number | null
  subject: string
  body_html: string
  body_json: unknown
  preview_text: string
  from_name: string
  from_email: string
  reply_to: string
}

export type CampaignEditorSection =
  | "details"
  | "email"
  | "recipients"
  | "send"

type SendMode = "now" | "schedule"

const BASE_NAV: NavListItem<CampaignEditorSection>[] = [
  { id: "details", label: "Details", icon: Settings2 },
]

const POST_SAVE_NAV: NavListItem<CampaignEditorSection>[] = [
  { id: "email", label: "Email", icon: FileText },
  { id: "recipients", label: "Recipients", icon: Users },
  { id: "send", label: "Send", icon: Send },
]

export function CampaignEditorForm({
  organizationId,
  mode,
  campaign,
  segments,
  templates,
  defaultFromEmail,
  defaultFromName,
  domainReady,
  hasSendingDomain,
  editorKey,
  initialSection = "details",
  saving,
  sending = false,
  testing = false,
  onSave,
  onTestSend,
  onSend,
  onSectionChange,
}: {
  organizationId: number
  mode: "create" | "edit"
  campaign?: MarketingCampaign | null
  segments: CampaignSegment[]
  templates: CampaignEmailTemplate[]
  defaultFromEmail: string
  defaultFromName: string
  domainReady: boolean
  hasSendingDomain: boolean
  editorKey: string
  initialSection?: CampaignEditorSection
  saving: boolean
  sending?: boolean
  testing?: boolean
  onSave: (values: CampaignEditorFormValues) => Promise<void>
  onTestSend?: (to: string, values: CampaignEditorFormValues) => Promise<void>
  onSend?: (
    values: CampaignEditorFormValues,
    scheduledAt: string | null
  ) => Promise<void>
  onSectionChange?: (section: CampaignEditorSection) => void
}) {
  const firstSegment = segments[0]
  const seedTemplate =
    templates.find((item) => item.id === campaign?.template_id) ??
    templates[0]
  const seedBodyHtml = campaign?.body_html?.trim()
    ? campaign.body_html
    : (seedTemplate?.body_html ?? "")
  const seedBodyJson = campaign?.body_html?.trim()
    ? (campaign.body_json ?? {})
    : (seedTemplate?.body_json ?? {})

  const [section, setSection] = useState<CampaignEditorSection>(initialSection)
  const [name, setName] = useState(campaign?.name ?? "")
  const [segmentId, setSegmentId] = useState(
    campaign?.segment_id ?? firstSegment?.id ?? 0
  )
  const [templateId, setTemplateId] = useState<number | null>(
    campaign?.template_id ?? seedTemplate?.id ?? null
  )
  const [subject, setSubject] = useState(
    campaign?.subject ?? seedTemplate?.subject ?? ""
  )
  const [bodyHtml, setBodyHtml] = useState(seedBodyHtml)
  const [bodyJson, setBodyJson] = useState<unknown>(seedBodyJson)
  const [bodyEditorKey, setBodyEditorKey] = useState(editorKey)
  const [previewText, setPreviewText] = useState(campaign?.preview_text ?? "")
  const [fromName, setFromName] = useState(
    campaign?.from_name ?? defaultFromName
  )
  const [fromEmail, setFromEmail] = useState(
    campaign?.from_email ?? defaultFromEmail
  )
  const [replyTo, setReplyTo] = useState(campaign?.reply_to ?? "")
  const [showBodyPreview, setShowBodyPreview] = useState(false)
  const [subjectVarsOpen, setSubjectVarsOpen] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [showTestTo, setShowTestTo] = useState(false)
  const [sendMode, setSendMode] = useState<SendMode>("now")
  const [scheduleLocal, setScheduleLocal] = useState("")
  const subjectInputRef = useRef<HTMLInputElement>(null)
  const testToInputRef = useRef<HTMLInputElement>(null)

  const previewAudience = usePreviewCampaignSegment(organizationId)
  const selectedSegment = segments.find((item) => item.id === segmentId)

  const isDraftLike =
    mode === "create" ||
    campaign?.status === "draft" ||
    campaign?.status === "canceled"

  const showPostSave = mode === "edit"

  const nav = useMemo(() => {
    if (!showPostSave) return BASE_NAV
    return [...BASE_NAV, ...POST_SAVE_NAV]
  }, [showPostSave])

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    if (
      !showPostSave &&
      (section === "email" || section === "recipients" || section === "send")
    ) {
      setSection("details")
    }
  }, [showPostSave, section])

  useEffect(() => {
    if (section !== "recipients") return
    if (!selectedSegment) return
    previewAudience.mutate(selectedSegment.filter_json)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when opening recipients / segment changes
  }, [section, selectedSegment?.id])

  const previewHtml = substituteCampaignVariables(bodyHtml, {
    firstName: "Alex",
    lastName: "Doe",
    email: "alex@example.com",
  })

  const canSave =
    name.trim().length > 0 &&
    segmentId > 0 &&
    fromName.trim().length > 0 &&
    fromEmail.trim().length > 0 &&
    (templateId == null ||
      (subject.trim().length > 0 && htmlHasUnsubscribeLink(bodyHtml)))

  function currentValues(): CampaignEditorFormValues {
    const trimmedName = name.trim()
    let nextSubject = subject.trim()
    let nextHtml = bodyHtml
    let nextJson = bodyJson

    if (templateId == null) {
      if (!nextHtml.trim() || !htmlHasUnsubscribeLink(nextHtml)) {
        nextHtml = DEFAULT_CAMPAIGN_EMAIL_BODY_HTML
        nextJson = {}
      }
      if (!nextSubject) {
        nextSubject = trimmedName || "Campaign"
      }
    }

    return {
      name: trimmedName,
      segment_id: segmentId,
      template_id: templateId,
      subject: nextSubject,
      body_html: nextHtml,
      body_json: nextJson,
      preview_text: previewText.trim(),
      from_name: fromName.trim(),
      from_email: fromEmail.trim(),
      reply_to: replyTo.trim(),
    }
  }

  function changeSection(next: CampaignEditorSection) {
    setSection(next)
    onSectionChange?.(next)
  }

  function applyTemplate(nextTemplateId: number | null) {
    setTemplateId(nextTemplateId)
    if (nextTemplateId == null) return
    const template = templates.find((item) => item.id === nextTemplateId)
    if (!template) return
    setSubject(template.subject)
    setBodyHtml(template.body_html)
    setBodyJson(template.body_json)
    setBodyEditorKey(`${editorKey}-tpl-${nextTemplateId}-${Date.now()}`)
  }

  function insertSubjectVariable(key: string, defaultFallback: string) {
    const token = buildCampaignVariableToken(key, defaultFallback)
    const input = subjectInputRef.current
    const start = input?.selectionStart ?? subject.length
    const end = input?.selectionEnd ?? subject.length
    setSubject(`${subject.slice(0, start)}${token}${subject.slice(end)}`)
    setSubjectVarsOpen(false)
    requestAnimationFrame(() => {
      if (!input) return
      input.focus()
      const caret = start + token.length
      input.setSelectionRange(caret, caret)
    })
  }

  function scheduleToIso(): string | null {
    if (sendMode !== "schedule") return null
    if (!scheduleLocal.trim()) return null
    const date = new Date(scheduleLocal)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  }

  const audience = previewAudience.data
  const audienceContacts = audience?.contacts ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <NavList items={nav} value={section} onChange={changeSection} />

        <div className="min-w-0 flex-1 space-y-4">
          {section === "details" ? (
            <>
              <SectionCard title="Details">
                <div className="space-y-4">
                  <Field label="Name">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. March newsletter"
                      disabled={!isDraftLike}
                    />
                  </Field>
                  <Field label="Segment">
                    <SearchSelect
                      value={segmentId > 0 ? String(segmentId) : ""}
                      onValueChange={(value) => {
                        const parsed = Number(value)
                        if (Number.isFinite(parsed)) setSegmentId(parsed)
                      }}
                      disabled={!isDraftLike}
                      placeholder="Select segment"
                      searchPlaceholder="Search segments…"
                      emptyText="No segment found."
                      options={segments.map((segment) => ({
                        value: String(segment.id),
                        label: segment.name,
                      }))}
                    />
                  </Field>
                  <Field label="Template">
                    <SearchSelect
                      value={templateId != null ? String(templateId) : "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          applyTemplate(null)
                          return
                        }
                        const parsed = Number(value)
                        if (Number.isFinite(parsed)) applyTemplate(parsed)
                      }}
                      disabled={!isDraftLike}
                      placeholder="Select template"
                      searchPlaceholder="Search templates…"
                      emptyText="No template found."
                      noneOption={{ value: "none", label: "No template" }}
                      options={templates.map((template) => ({
                        value: String(template.id),
                        label: template.name,
                      }))}
                    />
                  </Field>
                </div>
              </SectionCard>
            </>
          ) : null}

          {section === "email" && showPostSave ? (
            <SectionCard
              title="Email"
              action={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isDraftLike && onTestSend ? (
                    <>
                      {showTestTo ? (
                        <Input
                          ref={testToInputRef}
                          type="email"
                          value={testTo}
                          onChange={(event) => setTestTo(event.target.value)}
                          placeholder="you@example.com"
                          className="w-48"
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return
                            event.preventDefault()
                            if (
                              testing ||
                              !domainReady ||
                              !testTo.trim() ||
                              !canSave
                            ) {
                              return
                            }
                            void onTestSend(testTo.trim(), currentValues())
                          }}
                        />
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          testing ||
                          !domainReady ||
                          !canSave ||
                          (showTestTo && !testTo.trim())
                        }
                        onClick={() => {
                          if (!showTestTo) {
                            setShowTestTo(true)
                            requestAnimationFrame(() => {
                              testToInputRef.current?.focus()
                            })
                            return
                          }
                          void onTestSend(testTo.trim(), currentValues())
                        }}
                      >
                        <Mail className="size-3.5" />
                        {testing ? "Sending…" : "Send test"}
                      </Button>
                    </>
                  ) : null}
                  {isDraftLike ? (
                    <Button
                      type="button"
                      disabled={saving || !canSave}
                      onClick={() => {
                        void onSave(currentValues())
                      }}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  ) : null}
                </div>
              }
            >
              <div className="space-y-4">
                {!domainReady && isDraftLike ? (
                  <SendingDomainRequiredMessage
                    hasSendingDomain={hasSendingDomain}
                    action="sending a test"
                  />
                ) : null}
                <Field label="Subject">
                  <InputGroup>
                    <InputGroupInput
                      ref={subjectInputRef}
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      disabled={!isDraftLike}
                    />
                    <InputGroupAddon align="inline-end">
                      <Popover
                        open={subjectVarsOpen}
                        onOpenChange={setSubjectVarsOpen}
                      >
                        <PopoverTrigger asChild>
                          <InputGroupButton
                            type="button"
                            size="icon-xs"
                            aria-label="Insert variable"
                            title="Insert variable"
                            disabled={!isDraftLike}
                          >
                            <Braces className="size-3.5" />
                          </InputGroupButton>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-56 p-0"
                          sideOffset={6}
                        >
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
                </Field>

                <Field label="Preview text">
                  <Input
                    value={previewText}
                    onChange={(event) => setPreviewText(event.target.value)}
                    placeholder="Inbox preview line"
                    disabled={!isDraftLike}
                  />
                </Field>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Body
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowBodyPreview((value) => !value)}
                    >
                      {showBodyPreview ? "Edit" : "Preview"}
                    </Button>
                  </div>
                  {showBodyPreview ? (
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
                  <div
                    className={
                      showBodyPreview || !isDraftLike ? "hidden" : undefined
                    }
                  >
                    <CampaignEmailEditor
                      key={bodyEditorKey}
                      initialHtml={bodyHtml}
                      initialJson={bodyJson}
                      onChange={(value) => {
                        setBodyHtml(value.html)
                        setBodyJson(value.json ?? {})
                      }}
                    />
                  </div>
                  {!isDraftLike && !showBodyPreview ? (
                    <div
                      className={cn(
                        "rounded-xl border border-border px-4 py-3 text-sm leading-relaxed",
                        "[&_img]:max-w-full [&_p]:my-2"
                      )}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : null}
                  {!htmlHasUnsubscribeLink(bodyHtml) ? (
                    <p className="text-sm text-destructive">
                      Add the Unsubscribe variable before saving.
                    </p>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {section === "recipients" && showPostSave ? (
            <SectionCard
              title="Recipients preview (max 50 contacts)"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedSegment || previewAudience.isPending}
                    onClick={() => {
                      if (!selectedSegment) return
                      previewAudience.mutate(selectedSegment.filter_json)
                    }}
                  >
                    Refresh
                  </Button>
                  {isDraftLike ? (
                    <Button
                      type="button"
                      disabled={saving || !canSave}
                      onClick={() => {
                        void onSave(currentValues())
                      }}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  ) : null}
                </div>
              }
            >
              <div className="space-y-4">
                <Field label="Segment">
                  <SearchSelect
                    value={segmentId > 0 ? String(segmentId) : ""}
                    onValueChange={(value) => {
                      const parsed = Number(value)
                      if (Number.isFinite(parsed)) setSegmentId(parsed)
                    }}
                    disabled={!isDraftLike}
                    placeholder="Select segment"
                    searchPlaceholder="Search segments…"
                    emptyText="No segment found."
                    options={segments.map((segment) => ({
                      value: String(segment.id),
                      label: segment.name,
                    }))}
                  />
                </Field>

                {!selectedSegment ? (
                  <EmptyState title="Select a segment" />
                ) : previewAudience.isPending && !audience ? (
                  <LoadingRows count={3} />
                ) : previewAudience.isError ? (
                  <p className="text-sm text-destructive">
                    {previewAudience.error instanceof Error
                      ? previewAudience.error.message
                      : "Failed to load recipients"}
                  </p>
                ) : audience ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {audience.total} contact
                      {audience.total === 1 ? "" : "s"}
                      {" · "}
                      {audience.synced} synced
                      {audience.pending > 0
                        ? ` · ${audience.pending} pending sync`
                        : ""}
                    </p>
                    {audienceContacts.length === 0 ? (
                      <EmptyState title="No contacts in this segment" />
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full min-w-[28rem] text-left text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/60">
                              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Email
                              </th>
                              {(audience.columns ?? []).map((column) => (
                                <th
                                  key={column.key}
                                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                  {column.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {audienceContacts.map((contact) => (
                              <tr
                                key={contact.email}
                                className="hover:bg-accent/60"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex min-w-0 max-w-[20rem] items-center gap-2">
                                    <span className="min-w-0 truncate text-foreground">
                                      {contact.email}
                                    </span>
                                    <StatusBadge
                                      status={
                                        contact.synced ? "synced" : "pending"
                                      }
                                      configs={RECIPIENT_SYNC_BADGE}
                                      className="shrink-0"
                                    />
                                  </div>
                                </td>
                                {(audience.columns ?? []).map((column) => (
                                  <td
                                    key={column.key}
                                    className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground"
                                  >
                                    {contact.fields?.[column.key]?.trim()
                                      ? contact.fields[column.key]
                                      : "-"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {audience.total > audienceContacts.length ? (
                      <p className="text-xs text-muted-foreground">
                        Showing first {audienceContacts.length} of{" "}
                        {audience.total}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState title="No preview yet" />
                )}
              </div>
            </SectionCard>
          ) : null}

          {section === "send" && showPostSave ? (
            <SectionCard
              title="Send"
              action={
                isDraftLike ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || !canSave}
                      onClick={() => {
                        void onSave(currentValues())
                      }}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        sending ||
                        !domainReady ||
                        !canSave ||
                        !onSend ||
                        (sendMode === "schedule" && !scheduleToIso())
                      }
                      onClick={() => {
                        if (!onSend) return
                        const when = scheduleToIso()
                        if (sendMode === "schedule" && !when) return
                        void onSend(currentValues(), when)
                      }}
                    >
                      <Send className="size-3.5" />
                      {sending
                        ? "Working…"
                        : sendMode === "schedule"
                          ? "Schedule"
                          : "Send campaign"}
                    </Button>
                  </div>
                ) : null
              }
            >
              {isDraftLike ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="From name">
                      <Input
                        value={fromName}
                        onChange={(event) => setFromName(event.target.value)}
                      />
                    </Field>
                    <Field label="From email">
                      <Input
                        type="email"
                        value={fromEmail}
                        onChange={(event) => setFromEmail(event.target.value)}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Reply-to email">
                        <Input
                          type="email"
                          value={replyTo}
                          onChange={(event) => setReplyTo(event.target.value)}
                          placeholder="Optional · name@example.com"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        When
                      </span>
                      <Button
                        type="button"
                        variant={sendMode === "now" ? "default" : "outline"}
                        onClick={() => setSendMode("now")}
                      >
                        Send now
                      </Button>
                      <Button
                        type="button"
                        variant={
                          sendMode === "schedule" ? "default" : "outline"
                        }
                        onClick={() => setSendMode("schedule")}
                      >
                        Schedule
                      </Button>
                    </div>
                    {sendMode === "schedule" ? (
                      <Input
                        type="datetime-local"
                        value={scheduleLocal}
                        onChange={(event) =>
                          setScheduleLocal(event.target.value)
                        }
                        aria-label="Schedule at"
                        className="max-w-xs"
                      />
                    ) : null}
                  </div>

                  {!domainReady ? (
                    <SendingDomainRequiredMessage
                      hasSendingDomain={hasSendingDomain}
                      action="sending"
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This campaign is {campaign?.status ?? "locked"} and cannot be
                  sent again from here.
                </p>
              )}
            </SectionCard>
          ) : null}
        </div>
      </div>

      {section === "details" && isDraftLike ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            disabled={saving || !canSave}
            onClick={() => {
              void onSave(currentValues())
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function SendingDomainRequiredMessage({
  hasSendingDomain,
  action,
}: {
  hasSendingDomain: boolean
  action: "sending" | "sending a test"
}) {
  const verb = hasSendingDomain ? "Verify" : "Add"
  return (
    <p className="text-sm text-destructive">
      {verb} your sending domain in{" "}
      <Link
        href="/dashboard/settings?section=email"
        className="underline underline-offset-2"
      >
        Settings: Email
      </Link>{" "}
      before {action}.
    </p>
  )
}
