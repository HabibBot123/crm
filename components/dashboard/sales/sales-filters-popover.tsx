"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineRangeValue,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import type { SalePaymentKind, SaleSourceFilter } from "@/schemas/sales.schema"

export type SalesFilterValues = {
  paymentKinds: SalePaymentKind[]
  sources: SaleSourceFilter[]
  offerIds: number[]
  /** Major currency units (e.g. euros), not cents. */
  amountMin: number | null
  /** Major currency units (e.g. euros), not cents. */
  amountMax: number | null
}

type OfferOption = {
  id: number
  title: string
}

export const emptySalesFilters: SalesFilterValues = {
  paymentKinds: [],
  sources: [],
  offerIds: [],
  amountMin: null,
  amountMax: null,
}

const PAYMENT_OPTIONS: Array<{ value: SalePaymentKind; label: string }> = [
  { value: "subscription", label: "Subscription" },
  { value: "direct", label: "One-time" },
  { value: "installment", label: "Installments" },
]

const SOURCE_OPTIONS: Array<{ value: SaleSourceFilter; label: string }> = [
  { value: "stripe", label: "Stripe" },
  { value: "manual", label: "Manual" },
]

function isPaymentKind(value: string): value is SalePaymentKind {
  return value === "subscription" || value === "installment" || value === "direct"
}

function isSourceFilter(value: string): value is SaleSourceFilter {
  return value === "manual" || value === "stripe"
}

function asRangeValue(value: unknown): FilterRefineRangeValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { min: null, max: null }
  }
  if (!("min" in value) || !("max" in value)) {
    return { min: null, max: null }
  }
  const min = value.min
  const max = value.max
  return {
    min: typeof min === "number" && Number.isFinite(min) ? min : null,
    max: typeof max === "number" && Number.isFinite(max) ? max : null,
  }
}

function toRefineValues(values: SalesFilterValues): FilterRefineValues {
  return {
    payment: values.paymentKinds,
    source: values.sources,
    offer: values.offerIds.map(String),
    amount: { min: values.amountMin, max: values.amountMax },
  }
}

function fromRefineValues(values: FilterRefineValues): SalesFilterValues {
  const paymentRaw = values.payment
  const sourceRaw = values.source
  const offerRaw = values.offer
  const amount = asRangeValue(values.amount)

  return {
    paymentKinds: Array.isArray(paymentRaw)
      ? paymentRaw.filter(isPaymentKind)
      : [],
    sources: Array.isArray(sourceRaw) ? sourceRaw.filter(isSourceFilter) : [],
    offerIds: Array.isArray(offerRaw)
      ? offerRaw
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : [],
    amountMin: amount.min,
    amountMax: amount.max,
  }
}

/** Convert major units (euros) to cents for DB filter. */
export function salesAmountToCents(value: number | null): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined
  return Math.round(value * 100)
}

export function SalesFiltersPopover({
  values,
  offers,
  onApply,
}: {
  values: SalesFilterValues
  offers: OfferOption[]
  onApply: (next: SalesFilterValues) => void
}) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "payment",
        label: "Payment",
        type: "checkbox",
        span: 1,
        options: PAYMENT_OPTIONS,
      },
      {
        id: "source",
        label: "Source",
        type: "checkbox",
        span: 1,
        options: SOURCE_OPTIONS,
      },
      {
        id: "offer",
        label: "Offer",
        type: "search-select",
        span: 2,
        multiple: true,
        placeholder: "Select offers…",
        searchPlaceholder: "Search offers…",
        emptyText: "No offers found.",
        options: offers.map((offer) => ({
          value: String(offer.id),
          label: offer.title,
        })),
      },
      {
        id: "amount",
        label: "Amount",
        type: "range",
        span: 2,
        min: 0,
        max: 100_000,
        step: 1,
        minPlaceholder: "Min €",
        maxPlaceholder: "Max €",
      },
    ],
    [offers]
  )

  return (
    <FilterRefine
      title="Refine results"
      fields={fields}
      values={toRefineValues(values)}
      onApply={(next) => onApply(fromRefineValues(next))}
    />
  )
}
