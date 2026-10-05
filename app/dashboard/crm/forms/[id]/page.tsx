"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Check, Copy, Info, ListChecks, Plus, Send, Settings, Trash2 } from "lucide-react"
import { NavList, type NavListItem } from "@/components/dashboard/nav-list"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCrmFields } from "@/hooks/use-crm-fields"
import {
  useAddFormField,
  useCrmFormDetail,
  useRemoveFormField,
  useUpdateForm,
} from "@/hooks/use-crm-forms"
import { toast } from "sonner"

function formatFieldType(value: string) {
  if (value === "multi_select") return "Multiple choice"
  if (value === "select") return "Single choice"
  if (value === "textarea") return "Long text"
  if (value === "text") return "Short text"
  if (value === "number") return "Number"
  if (value === "date") return "Date"
  if (value === "boolean") return "Yes / No"
  return value
}

export default function CrmFormEditorPage() {
  const params = useParams<{ id: string }>()
  const formId = Number(params.id)
  const { currentOrganization } = useCurrentOrganization()
  const [section, setSection] = useState<"metadata" | "fields" | "settings">("metadata")

  const { form, isLoading, error } = useCrmFormDetail(Number.isFinite(formId) ? formId : null)
  const { fields } = useCrmFields(currentOrganization?.id ?? null)
  const updateForm = useUpdateForm(currentOrganization?.id ?? null)
  const addFormField = useAddFormField(Number.isFinite(formId) ? formId : null)
  const removeFormField = useRemoveFormField(Number.isFinite(formId) ? formId : null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [redirectUrl, setRedirectUrl] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [selectedFieldDefId, setSelectedFieldDefId] = useState<string>("")
  const [isRequired, setIsRequired] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)

  const usedFieldIds = useMemo(
    () => new Set((form?.fields ?? []).map((entry) => entry.field_def_id)),
    [form?.fields]
  )
  const availableFields = useMemo(
    () => fields.filter((field) => !usedFieldIds.has(field.id)),
    [fields, usedFieldIds]
  )

  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization to edit CRM forms.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Form editor" subtitle="Loading form..." back="/dashboard/crm/forms" />
        <SectionCard>
          <LoadingRows count={5} />
        </SectionCard>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Form editor" subtitle="Unable to load form" back="/dashboard/crm/forms" />
        <SectionCard>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Form not found"}
          </p>
        </SectionCard>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const appBaseUrl =
    appUrl && appUrl.length > 0
      ? appUrl.replace(/\/$/, "")
      : typeof window !== "undefined"
      ? window.location.origin
      : ""
  const publicLink = `${appBaseUrl}/org/${currentOrganization.slug}/form/${form.slug}`

  const displayedTitle = title || form.title
  const displayedDescription = description || (form.description ?? "")
  const displayedRedirectUrl = redirectUrl || (form.redirect_url ?? "")
  const displayedSuccessMessage = successMessage || (form.success_message ?? "")
  const navItems: NavListItem<"metadata" | "fields" | "settings">[] = [
    { id: "metadata", label: "Metadata", icon: Info },
    { id: "fields", label: "Fields", icon: ListChecks },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Form editor" subtitle={form.title} back="/dashboard/crm/forms">
        {form.status === "draft" && (
          <Button
            size="sm"
            className="gap-2"
            onClick={async () => {
              try {
                await updateForm.mutateAsync({ formId: form.id, status: "active" })
                toast.success("Form published")
              } catch (mutationError) {
                toast.error("Could not publish form", {
                  description:
                    mutationError instanceof Error ? mutationError.message : "Unexpected error",
                })
              }
            }}
            disabled={updateForm.isPending}
          >
            <Send className="h-3.5 w-3.5" />
            {updateForm.isPending ? "Publishing..." : "Publish"}
          </Button>
        )}
      </PageHeader>

      <div className="flex gap-8">
        <NavList items={navItems} value={section} onChange={setSection} />

        <div className="min-w-0 flex-1">
          {section === "metadata" && (
            <SectionCard title="Form metadata">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={displayedTitle} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={displayedDescription}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional description shown on the public form."
                  />
                </div>
                {form.form_type === "default" ? (
                  <div className="space-y-1.5">
                    <Label>Redirect URL</Label>
                    <Input
                      value={displayedRedirectUrl}
                      onChange={(event) => setRedirectUrl(event.target.value)}
                      placeholder="https://example.com/thanks"
                    />
                    <p className="text-xs text-muted-foreground">
                      After submit, show a thank-you screen then redirect here (~3.5s). Not used for
                      webinar or free giveaway forms.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Redirect URL is only available on default forms. Webinar and free giveaway keep
                    the prospect on the thank-you screen so they can access the content.
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Success message</Label>
                  <Textarea
                    value={displayedSuccessMessage}
                    onChange={(event) => setSuccessMessage(event.target.value)}
                    placeholder="Thank you for submitting your information."
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown on the thank-you screen after submit
                    {form.form_type === "default" ? " (before redirect, if set)." : "."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Form type</Label>
                  <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                    {formatFieldType(form.form_type)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    disabled={isSavingMetadata}
                    onClick={async () => {
                      setIsSavingMetadata(true)
                      try {
                        await updateForm.mutateAsync({
                          formId: form.id,
                          title: displayedTitle.trim(),
                          description: displayedDescription.trim() || null,
                          redirect_url:
                            form.form_type === "default"
                              ? displayedRedirectUrl.trim() || null
                              : null,
                          success_message: displayedSuccessMessage.trim() || null,
                        })
                        setTitle("")
                        setDescription("")
                        setRedirectUrl("")
                        setSuccessMessage("")
                        toast.success("Metadata saved successfully")
                      } catch (mutationError) {
                        toast.error("Could not save metadata", {
                          description:
                            mutationError instanceof Error
                              ? mutationError.message
                              : "Unexpected error",
                        })
                      } finally {
                        setIsSavingMetadata(false)
                      }
                    }}
                  >
                    {isSavingMetadata ? "Saving…" : "Save metadata"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(publicLink)
                      setLinkCopied(true)
                      window.setTimeout(() => setLinkCopied(false), 1800)
                      toast.success("Link copied", { description: publicLink })
                    }}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        Link copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy public link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {section === "fields" && (
            <SectionCard title="Fields">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-sm text-foreground">
                    Default fields on every form: <strong>Name</strong>, <strong>Email</strong>,{" "}
                    <strong>Phone number</strong>.
                  </p>
                </div>

                {form.fields.length === 0 ? (
                  <EmptyState
                    title="No custom fields yet"
                    description="Add fields from your CRM fields library to enrich lead collection."
                  />
                ) : (
                  <ul className="space-y-2">
                    {form.fields.map((field) => (
                      <li
                        key={field.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {field.client_question} - {formatFieldType(field.field_type)}
                            {field.is_required ? " - required" : ""}
                            {field.visibility === "hidden" ? " - hidden (link prefill)" : ""}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            removeFormField.mutate(field.id, {
                              onSuccess: () => {
                                toast.success("Field removed")
                              },
                              onError: (mutationError) => {
                                toast.error("Could not remove field", {
                                  description:
                                    mutationError instanceof Error
                                      ? mutationError.message
                                      : "Unexpected error",
                                })
                              },
                            })
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-3 rounded-lg border border-border p-3">
                  <Label>Add field</Label>
                  <Select value={selectedFieldDefId} onValueChange={setSelectedFieldDefId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a CRM field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field.id} value={String(field.id)}>
                          {field.label} - {formatFieldType(field.field_type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <Label htmlFor="required-toggle">Required</Label>
                    <Switch
                      id="required-toggle"
                      checked={isRequired}
                      onCheckedChange={(checked) => setIsRequired(checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <Label htmlFor="hidden-toggle">Hidden field</Label>
                      <p className="text-xs text-muted-foreground">
                        Not shown publicly; filled from share link defaults.
                      </p>
                    </div>
                    <Switch
                      id="hidden-toggle"
                      checked={isHidden}
                      onCheckedChange={(checked) => setIsHidden(checked)}
                    />
                  </div>
                  <Button
                    className="gap-2"
                    disabled={!selectedFieldDefId}
                    onClick={() => {
                      addFormField.mutate(
                        {
                          fieldDefId: Number(selectedFieldDefId),
                          position: form.fields.length,
                          isRequired: isHidden ? false : isRequired,
                          visibility: isHidden ? "hidden" : "visible",
                        },
                        {
                          onSuccess: () => {
                            setSelectedFieldDefId("")
                            setIsRequired(false)
                            setIsHidden(false)
                            toast.success("Field added")
                          },
                          onError: (mutationError) => {
                            toast.error("Could not add field", {
                              description:
                                mutationError instanceof Error
                                  ? mutationError.message
                                  : "Unexpected error",
                            })
                          },
                        }
                      )
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add field
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {section === "settings" && (
            <div className="max-w-lg space-y-4">
              <SectionCard
                title="Archive form"
                subtitle="Archived forms are hidden publicly and can no longer collect new leads."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await updateForm.mutateAsync({ formId: form.id, status: "archived" })
                        toast.success("Form archived")
                      } catch (mutationError) {
                        toast.error("Could not archive form", {
                          description:
                            mutationError instanceof Error ? mutationError.message : "Unexpected error",
                        })
                      }
                    }}
                    disabled={updateForm.isPending || form.status === "archived"}
                  >
                    {form.status === "archived"
                      ? "Archived"
                      : updateForm.isPending
                      ? "Archiving..."
                      : "Archive"}
                  </Button>
                }
              >
                <span />
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
