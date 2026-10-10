"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Copy, Plus } from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { CreateFormDialog } from "@/components/dashboard/crm/create-form-dialog"
import { Button } from "@/components/ui/button"
import { useCrmForms, useCreateForm } from "@/hooks/use-crm-forms"
import { useOrganizationLeadStatuses } from "@/hooks/use-organization-lead-statuses"
import { toast } from "sonner"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function CrmFormsListPage() {
  const router = useRouter()
  const { currentOrganization } = useCurrentOrganization()
  const [openCreate, setOpenCreate] = useState(false)
  const [copiedFormId, setCopiedFormId] = useState<number | null>(null)
  const { forms, isLoading, error } = useCrmForms(currentOrganization?.id ?? null)
  const { statuses: leadStatuses } = useOrganizationLeadStatuses(currentOrganization?.id ?? null)
  const createForm = useCreateForm(currentOrganization?.id ?? null)

  const absoluteBaseUrl = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (appUrl) return appUrl.replace(/\/$/, "")
    if (typeof window !== "undefined") return window.location.origin
    return ""
  }, [])

  const basePublicPath = useMemo(() => {
    if (!currentOrganization?.slug) return ""
    return `${absoluteBaseUrl}/org/${currentOrganization.slug}/form`
  }, [absoluteBaseUrl, currentOrganization?.slug])

  if (!currentOrganization) {
    return <p className="text-sm text-muted-foreground">Select an organization to manage forms.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" />
          Create form
        </Button>
      </div>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : error ? (
        <SectionCard>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load forms"}
          </p>
        </SectionCard>
      ) : forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Create your first form to start collecting inbound leads."
          action={
            <Button onClick={() => setOpenCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create form
            </Button>
          }
        />
      ) : (
        <SectionCard noPadding>
          <TableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Arrival status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Leads
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id} className="transition-colors hover:bg-accent/60">
                    <td className="px-4 py-3 font-medium text-foreground">{form.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {leadStatuses.find((status) => status.key === form.initial_status)?.label ??
                        form.initial_status}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{form.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{form.leads_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(form.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/crm/forms/${form.id}`}>Edit</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={async () => {
                            const publicUrl = `${basePublicPath}/${form.slug}`
                            await navigator.clipboard.writeText(publicUrl)
                            setCopiedFormId(form.id)
                            window.setTimeout(
                              () => setCopiedFormId((prev) => (prev === form.id ? null : prev)),
                              1800
                            )
                            toast.success("Link copied", { description: publicUrl })
                          }}
                        >
                          {copiedFormId === form.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Link copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copy link
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </SectionCard>
      )}

      <CreateFormDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        leadStatuses={leadStatuses}
        isPending={createForm.isPending}
        onSubmit={async (input) => {
          try {
            const formId = await createForm.mutateAsync(input)
            toast.success("Form created", {
              description: "You can now configure its fields.",
            })
            router.push(`/dashboard/crm/forms/${formId}`)
          } catch (submissionError) {
            toast.error("Could not create form", {
              description:
                submissionError instanceof Error ? submissionError.message : "Unexpected error",
            })
          }
        }}
      />
    </div>
  )
}
