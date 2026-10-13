"use client"

import { useState, type ComponentProps } from "react"
import { Plus } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { SearchSelect } from "@/components/ui/search-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useUpdateBusinessUnitStatus,
} from "@/hooks/use-business-units"
import { useTeamMembers } from "@/hooks/use-team"
import type { BuSettlementBasis } from "@/schemas/crm.schema"

function isSettlementBasis(value: string): value is BuSettlementBasis {
  return value === "of_revenue" || value === "of_residual"
}

function AffixedNumberInput({
  suffix,
  className,
  inputClassName,
  ...props
}: Omit<ComponentProps<typeof InputGroupInput>, "className"> & {
  suffix: string
  className?: string
  inputClassName?: string
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <InputGroupInput className={cn("min-w-0 tabular-nums", inputClassName)} {...props} />
      <InputGroupAddon align="inline-end" className="pr-2.5">
        <InputGroupText className="text-xs text-muted-foreground">{suffix}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

export function BusinessUnitsPanel({ organizationId }: { organizationId: number }) {
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
  const [settlementBasis, setSettlementBasis] = useState<BuSettlementBasis>("of_residual")
  const [payoutDelayMonths, setPayoutDelayMonths] = useState("0")

  const activeMembers = teamData.items.filter((member) => member.status === "active")

  return (
    <div className="space-y-4">
      <SectionCard
        title="Business units & BU Owners"
        subtitle="Branches of your org, and who gets paid on them."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">What they are</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                A business unit is a branch (e.g. Students vs Seniors): packs,
                scope, and reporting.
              </li>
              <li>
                A BU Owner is the member who runs that unit. Not a separate
                invite role.
              </li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">How they earn</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Monthly settlement on packs linked to the unit: % of revenue or
                residual (after team and coaching commissions).
              </li>
              <li>
                Due on the 1st of the next month + payout delay. Pay from
                Payouts → BU Owners.
              </li>
              <li>
                No unit on the offer: no settlement. Lead unit is CRM filter
                only.
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Add business unit"
        subtitle="Branches of your org. Link offers to a unit for BU Owner settlement, scope, and reporting."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Market Finance"
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
            <Label>Owner %</Label>
            <AffixedNumberInput
              suffix="%"
              className="w-full"
              placeholder="5"
              inputMode="decimal"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Settlement base</Label>
            <Select
              value={settlementBasis}
              onValueChange={(value) => {
                if (isSettlementBasis(value)) setSettlementBasis(value)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="of_residual">
                  Residual (revenue − team − coaching)
                </SelectItem>
                <SelectItem value="of_revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payout delay</Label>
            <AffixedNumberInput
              suffix="mo"
              className="w-full"
              placeholder="0"
              inputMode="numeric"
              value={payoutDelayMonths}
              onChange={(e) => setPayoutDelayMonths(e.target.value)}
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
                const delayRaw = payoutDelayMonths.trim()
                const delay = delayRaw === "" ? 0 : Number(delayRaw)
                if (!Number.isInteger(delay) || delay < 0 || delay > 24) {
                  toast.error("Payout delay must be an integer from 0 to 24")
                  return
                }
                await createUnit.mutateAsync({
                  name: unitName.trim(),
                  owner_member_id: ownerMemberId === "none" ? null : Number(ownerMemberId),
                  default_commission_rate: rate,
                  settlement_basis: settlementBasis,
                  payout_delay_months: delay,
                })
                setUnitName("")
                setOwnerMemberId("none")
                setDefaultRate("")
                setSettlementBasis("of_residual")
                setPayoutDelayMonths("0")
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

      <SectionCard title="Your units">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No business units yet.</p>
        ) : (
          <ul className="space-y-2">
            {units.map((unit) => {
              const owner = activeMembers.find((member) => member.id === unit.owner_member_id)
              const basis = unit.settlement_basis ?? "of_residual"
              const delay = unit.payout_delay_months ?? 0
              return (
                <li
                  key={unit.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
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
                      {` · ${basis === "of_residual" ? "Residual" : "Revenue"}`}
                      {delay > 0 ? ` · +${delay} mo delay` : ""}
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
                      <AffixedNumberInput
                        suffix="%"
                        className="h-8 w-[4.75rem]"
                        inputClassName="h-8"
                        defaultValue={
                          unit.default_commission_rate == null
                            ? ""
                            : String(unit.default_commission_rate)
                        }
                        placeholder="0"
                        inputMode="decimal"
                        aria-label="Owner percent"
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
                      <Select
                        value={basis}
                        disabled={updateUnit.isPending}
                        onValueChange={(value) => {
                          if (!isSettlementBasis(value) || value === basis) return
                          updateUnit.mutate({
                            id: unit.id,
                            patch: { settlement_basis: value },
                          })
                        }}
                      >
                        <SelectTrigger className="h-8 w-[10.5rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="of_residual">Residual</SelectItem>
                          <SelectItem value="of_revenue">Revenue</SelectItem>
                        </SelectContent>
                      </Select>
                      <AffixedNumberInput
                        suffix="mo"
                        className="h-8 w-[4.75rem]"
                        inputClassName="h-8"
                        defaultValue={String(delay)}
                        placeholder="0"
                        inputMode="numeric"
                        aria-label="Payout delay months"
                        title="Payout delay months"
                        onBlur={(event) => {
                          const raw = event.target.value.trim()
                          const next = raw === "" ? 0 : Number(raw)
                          if (!Number.isInteger(next) || next < 0 || next > 24) {
                            toast.error("Payout delay must be an integer from 0 to 24")
                            return
                          }
                          if (next === delay) return
                          updateUnit.mutate({
                            id: unit.id,
                            patch: { payout_delay_months: next },
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
