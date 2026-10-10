"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useCreateOrganizationLeadStatus,
  useDeleteOrganizationLeadStatus,
  useOrganizationLeadStatuses,
  useUpdateOrganizationLeadStatus,
} from "@/hooks/use-organization-lead-statuses"
import {
  LEAD_STATUS_LABEL_MAX,
  LEAD_STATUS_MAX_PER_ORG,
  leadStatusKeyFromLabel,
} from "@/schemas/crm.schema"

const STATUS_COLOR_PALETTE = [
  "#3B82F6", // blue
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#22C55E", // green
  "#84CC16", // lime
  "#EAB308", // yellow
  "#F59E0B", // amber
  "#F97316", // orange
  "#EF4444", // red
  "#F43F5E", // rose
  "#EC4899", // pink
  "#D946EF", // fuchsia
  "#A855F7", // purple
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#64748B", // slate
  "#78716C", // stone
  "#171717", // near black
] as const

const DEFAULT_COLOR = STATUS_COLOR_PALETTE[12]

function ColorPastillePicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const normalized = value.toUpperCase()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Choose color"
          className={cn(
            "h-7 w-7 rounded-full border border-border shadow-sm transition-opacity",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          )}
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="grid grid-cols-6 gap-2">
          {STATUS_COLOR_PALETTE.map((swatch) => {
            const selected = normalized === swatch.toUpperCase()
            return (
              <button
                key={swatch}
                type="button"
                aria-label={`Select color ${swatch}`}
                aria-pressed={selected}
                onClick={() => {
                  onChange(swatch)
                  setOpen(false)
                }}
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center rounded-full transition-transform",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "scale-110 ring-2 ring-foreground/30" : "hover:scale-105"
                )}
                style={{ backgroundColor: swatch }}
              >
                {selected ? <Check className="h-3 w-3 text-white drop-shadow" /> : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function CrmStatusesPanel({ organizationId }: { organizationId: number }) {
  const { statuses, isLoading } = useOrganizationLeadStatuses(organizationId)
  const createStatus = useCreateOrganizationLeadStatus(organizationId)
  const updateStatus = useUpdateOrganizationLeadStatus(organizationId)
  const deleteStatus = useDeleteOrganizationLeadStatus(organizationId)

  const [label, setLabel] = useState("")
  const [color, setColor] = useState<string>(DEFAULT_COLOR)

  const previewKey = useMemo(() => leadStatusKeyFromLabel(label), [label])
  const canAdd =
    statuses.length < LEAD_STATUS_MAX_PER_ORG &&
    label.trim().length > 0 &&
    label.trim().length <= LEAD_STATUS_LABEL_MAX &&
    previewKey.length > 0 &&
    !createStatus.isPending

  async function handleCreate() {
    try {
      await createStatus.mutateAsync({ label: label.trim(), color })
      setLabel("")
      setColor(DEFAULT_COLOR)
      toast.success("Status created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create status")
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Add status"
        subtitle={`Up to ${LEAD_STATUS_MAX_PER_ORG} statuses. New, Lost, and Converted are always available.`}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </p>
              <Input
                value={label}
                maxLength={LEAD_STATUS_LABEL_MAX}
                placeholder="e.g. Booked"
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Color
              </p>
              <ColorPastillePicker
                value={color}
                onChange={setColor}
                disabled={createStatus.isPending}
              />
            </div>
            <Button className="gap-2 sm:shrink-0" disabled={!canAdd} onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </SectionCard>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      ) : statuses.length === 0 ? (
        <EmptyState title="No statuses" description="Default statuses will appear after setup." />
      ) : (
        <SectionCard noPadding title="Pipeline statuses">
          <ul className="divide-y divide-border">
            {statuses.map((status) => (
              <li
                key={status.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ColorPastillePicker
                    value={status.color}
                    disabled={updateStatus.isPending}
                    onChange={async (nextColor) => {
                      if (nextColor.toUpperCase() === status.color.toUpperCase()) return
                      try {
                        await updateStatus.mutateAsync({
                          id: status.id,
                          color: nextColor,
                        })
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not update color"
                        )
                      }
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{status.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {status.is_system ? "System" : "Custom"}
                    </p>
                  </div>
                </div>
                {!status.is_system ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={deleteStatus.isPending}
                    onClick={async () => {
                      try {
                        await deleteStatus.mutateAsync(status.id)
                        toast.success("Status deleted")
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not delete status"
                        )
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
