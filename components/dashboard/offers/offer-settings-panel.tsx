"use client"

import { useState } from "react"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBusinessUnits } from "@/hooks/use-business-units"
import type { OfferWithDetails, UpdateOfferInput } from "@/lib/services/offers"

type OfferSettingsPanelProps = {
  offer: OfferWithDetails
  organizationId: number | null
  onSave: (
    input: UpdateOfferInput,
    options?: { onError?: () => void }
  ) => void
  savePending: boolean
}

export function OfferSettingsPanel({
  offer,
  organizationId,
  onSave,
  savePending,
}: OfferSettingsPanelProps) {
  const { units: businessUnits } = useBusinessUnits(organizationId)
  const [businessUnitId, setBusinessUnitId] = useState(
    offer.business_unit_id == null ? "none" : String(offer.business_unit_id)
  )
  const canEditBu = offer.status !== "archived"

  function handleBusinessUnitChange(next: string) {
    const previous = businessUnitId
    if (next === previous) return
    setBusinessUnitId(next)
    onSave(
      { business_unit_id: next === "none" ? null : Number(next) },
      { onError: () => setBusinessUnitId(previous) }
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Business unit">
        <Select
          value={businessUnitId}
          onValueChange={handleBusinessUnitChange}
          disabled={!canEditBu || savePending}
        >
          <SelectTrigger id="offer-settings-bu" aria-label="Business unit" className="max-w-md">
            <SelectValue placeholder="Organization-wide" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (organization-wide)</SelectItem>
            {businessUnits.map((unit) => (
              <SelectItem key={unit.id} value={String(unit.id)}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Enrollments for this offer inherit this BU for permissions and reporting.
        </p>
      </SectionCard>

      <SectionCard title="Archive offer">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Archived offers are hidden from your catalog. Existing enrollments remain
            active, but the underlying Stripe product and prices will be deactivated.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => onSave({ status: "archived" })}
            disabled={savePending || offer.status === "archived"}
          >
            {offer.status === "archived"
              ? "Archived"
              : savePending
                ? "Archiving..."
                : "Archive"}
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
