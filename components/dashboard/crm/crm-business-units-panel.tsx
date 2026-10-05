"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchSelect } from "@/components/ui/search-select"
import { toast } from "sonner"
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useUpdateBusinessUnitStatus,
} from "@/hooks/use-business-units"
import { useTeamMembers } from "@/hooks/use-team"

export function CrmBusinessUnitsPanel({ organizationId }: { organizationId: number }) {
  const { units, isLoading } = useBusinessUnits(organizationId, { includeArchived: true })
  const createUnit = useCreateBusinessUnit(organizationId)
  const updateUnitStatus = useUpdateBusinessUnitStatus(organizationId)
  const updateUnit = useUpdateBusinessUnit(organizationId)
  const { data: teamData } = useTeamMembers({
    organizationId,
    page: 1,
    pageSize: 100,
  })
  const [unitName, setUnitName] = useState("")
  const [ownerMemberId, setOwnerMemberId] = useState<string>("none")
  const [defaultRate, setDefaultRate] = useState("")

  const activeMembers = teamData.items.filter((member) => member.status === "active")

  return (
    <div className="space-y-4">
      <SectionCard title="What are business units?">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Business units let you tag inbound leads by branch of your business — for example Market
            Finance vs Corporate Finance — without asking the prospect on the form.
          </p>
          <p>
            Attach a unit to a <span className="text-foreground">share link</span>; every lead from
            that link inherits it. The BU owner receives the default commission % on activated deals.
          </p>
          <p>
            If you only run one offer line, you can skip this and leave the list empty — nothing else
            changes.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Add business unit"
        subtitle="Optional. Create one per branch you want to track on share links and leads."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Name (e.g. Market Finance)"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <SearchSelect
              value={ownerMemberId}
              onValueChange={setOwnerMemberId}
              placeholder="Select owner"
              searchPlaceholder="Search member…"
              emptyText="No member found."
              noneOption={{ value: "none", label: "No owner" }}
              options={activeMembers.map((member) => ({
                value: String(member.id),
                label: member.full_name ?? member.email ?? `Member #${member.id}`,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default commission %</Label>
            <Input
              placeholder="e.g. 5"
              inputMode="decimal"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            className="gap-2 shrink-0"
            disabled={!unitName.trim() || createUnit.isPending}
            onClick={async () => {
              try {
                const rateRaw = defaultRate.trim()
                const rate = rateRaw === "" ? null : Number(rateRaw)
                if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
                  toast.error("Commission % must be between 0 and 100")
                  return
                }
                await createUnit.mutateAsync({
                  name: unitName.trim(),
                  owner_member_id: ownerMemberId === "none" ? null : Number(ownerMemberId),
                  default_commission_rate: rate,
                })
                setUnitName("")
                setOwnerMemberId("none")
                setDefaultRate("")
                toast.success("Business unit created")
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not create business unit")
              }
            }}
          >
            <Plus className="h-4 w-4" />
            Add unit
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Business units">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : units.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None yet — optional until you need to separate offer lines on share links.
          </p>
        ) : (
          <ul className="space-y-2">
            {units.map((unit) => {
              const owner = activeMembers.find((member) => member.id === unit.owner_member_id)
              return (
                <li
                  key={unit.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">{unit.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {unit.status}
                      {owner
                        ? ` · Owner: ${owner.full_name ?? owner.email ?? `#${owner.id}`}`
                        : " · No owner"}
                      {unit.default_commission_rate != null
                        ? ` · ${unit.default_commission_rate}%`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <SearchSelect
                        className="h-8 w-[180px]"
                        value={unit.owner_member_id == null ? "none" : String(unit.owner_member_id)}
                        onValueChange={(value) =>
                          updateUnit.mutate({
                            id: unit.id,
                            patch: {
                              owner_member_id: value === "none" ? null : Number(value),
                            },
                          })
                        }
                        disabled={updateUnit.isPending}
                        placeholder="Owner"
                        searchPlaceholder="Search member…"
                        emptyText="No member found."
                        noneOption={{ value: "none", label: "No owner" }}
                        options={activeMembers.map((member) => ({
                          value: String(member.id),
                          label: member.full_name ?? member.email ?? `Member #${member.id}`,
                        }))}
                      />
                      <Input
                        className="h-8 w-24"
                        defaultValue={
                          unit.default_commission_rate == null
                            ? ""
                            : String(unit.default_commission_rate)
                        }
                        placeholder="%"
                        onBlur={(event) => {
                          const raw = event.target.value.trim()
                          const rate = raw === "" ? null : Number(raw)
                          if (rate != null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
                            toast.error("Commission % must be between 0 and 100")
                            return
                          }
                          if (rate === unit.default_commission_rate) return
                          updateUnit.mutate({
                            id: unit.id,
                            patch: { default_commission_rate: rate },
                          })
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateUnitStatus.isPending}
                    onClick={() =>
                      updateUnitStatus.mutate({
                        id: unit.id,
                        status: unit.status === "active" ? "archived" : "active",
                      })
                    }
                  >
                    {unit.status === "active" ? "Archive" : "Restore"}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
