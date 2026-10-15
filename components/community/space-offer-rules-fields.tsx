"use client"

import { useOffers } from "@/hooks/use-offers"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CommunitySpaceOfferRuleInput } from "@/schemas/community.schema"

export type OfferRuleDraft = {
  selected: boolean
  remove_on_expire: boolean
}

export function offerRulesFromDrafts(
  drafts: Record<number, OfferRuleDraft>
): CommunitySpaceOfferRuleInput[] {
  return Object.entries(drafts)
    .filter(([, draft]) => draft.selected)
    .map(([offerId, draft]) => ({
      offer_id: Number(offerId),
      remove_on_expire: draft.remove_on_expire,
    }))
}

export function draftsFromOfferRules(
  rules: { offer_id: number; remove_on_expire: boolean }[]
): Record<number, OfferRuleDraft> {
  const next: Record<number, OfferRuleDraft> = {}
  for (const rule of rules) {
    next[rule.offer_id] = {
      selected: true,
      remove_on_expire: rule.remove_on_expire,
    }
  }
  return next
}

type SpaceOfferRulesFieldsProps = {
  organizationId: number
  value: Record<number, OfferRuleDraft>
  onChange: (next: Record<number, OfferRuleDraft>) => void
  idPrefix?: string
}

export function SpaceOfferRulesFields({
  organizationId,
  value,
  onChange,
  idPrefix = "offer",
}: SpaceOfferRulesFieldsProps) {
  const { offers, isLoading } = useOffers(organizationId, "active")
  const selectedCount = Object.values(value).filter((r) => r.selected).length

  function toggleOffer(offerId: number, selected: boolean) {
    const current = value[offerId]
    onChange({
      ...value,
      [offerId]: {
        selected,
        remove_on_expire: current?.remove_on_expire ?? true,
      },
    })
  }

  function setRemoveOnExpire(offerId: number, remove_on_expire: boolean) {
    const current = value[offerId]
    if (!current?.selected) return
    onChange({
      ...value,
      [offerId]: { ...current, remove_on_expire },
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Offer access
      </p>
      <p className="text-sm text-muted-foreground">
        {selectedCount === 0
          ? "If no offers are selected, all active clients are allowed."
          : `${selectedCount} offer${selectedCount === 1 ? "" : "s"} selected.`}
      </p>
      {isLoading ? (
        <LoadingRows count={3} />
      ) : offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active offers.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {offers.map((offer) => {
            const draft = value[offer.id]
            const selected = draft?.selected ?? false
            const inputId = `${idPrefix}-${offer.id}`
            return (
              <li
                key={offer.id}
                className="rounded-lg border border-border bg-muted/50 p-3"
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={inputId}
                    checked={selected}
                    onCheckedChange={(checked) =>
                      toggleOffer(offer.id, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label
                      htmlFor={inputId}
                      className="cursor-pointer text-sm font-medium leading-snug"
                    >
                      {offer.title}
                    </Label>
                    {selected ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Remove when enrollment expires
                        </span>
                        <Switch
                          checked={draft?.remove_on_expire ?? true}
                          onCheckedChange={(checked) =>
                            setRemoveOnExpire(offer.id, checked)
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
