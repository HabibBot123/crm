"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useManualEnrollmentBuyerLookup } from "@/hooks/use-clients"
import type { OfferListItem } from "@/lib/services/offers"
import { formatAmountFromCents } from "@/lib/utils"

function centsToMajorString(cents: number): string {
  return (cents / 100).toFixed(2)
}

function majorStringToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type AccessMode = "lifetime" | "months"

export function AddManualEnrollmentDialog({
  open,
  onOpenChange,
  organizationId,
  offers,
  offersLoading,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number | null
  offers: OfferListItem[]
  offersLoading?: boolean
  onSubmit: (input: {
    offerId: number
    buyerEmail: string
    buyerName: string
    priceCents: number
    accessDurationMonths: number | null
    soldAt: string
  }) => Promise<void>
  isPending?: boolean
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [nameTouched, setNameTouched] = useState(false)
  const [offerId, setOfferId] = useState<string>("")
  const [priceMajor, setPriceMajor] = useState("")
  const [accessMode, setAccessMode] = useState<AccessMode>("lifetime")
  const [accessMonths, setAccessMonths] = useState("1")
  const [soldAt, setSoldAt] = useState(() => new Date().toLocaleDateString("en-CA"))

  const selectedOffer = offers.find((o) => String(o.id) === offerId) ?? null
  const emailNormalized = email.trim().toLowerCase()
  const emailReady = emailNormalized.includes("@") && emailNormalized.includes(".")

  const lookup = useManualEnrollmentBuyerLookup(
    organizationId,
    email,
    open && emailReady
  )

  const lookupSettled =
    emailReady &&
    lookup.debouncedEmail === emailNormalized &&
    !lookup.isFetching &&
    lookup.data != null

  useEffect(() => {
    if (!open) return
    if (!selectedOffer) return
    setPriceMajor(centsToMajorString(selectedOffer.price))
    if (
      selectedOffer.access_duration_months != null &&
      selectedOffer.access_duration_months > 0
    ) {
      setAccessMode("months")
      setAccessMonths(String(selectedOffer.access_duration_months))
    } else {
      setAccessMode("lifetime")
      setAccessMonths("1")
    }
  }, [open, selectedOffer])

  useEffect(() => {
    if (!open) return
    if (nameTouched) return
    if (!lookupSettled || !lookup.data) return
    setName(lookup.data.suggestedName ?? "")
  }, [open, nameTouched, lookupSettled, lookup.data])

  function reset() {
    setEmail("")
    setName("")
    setNameTouched(false)
    setOfferId("")
    setPriceMajor("")
    setAccessMode("lifetime")
    setAccessMonths("1")
    setSoldAt(new Date().toLocaleDateString("en-CA"))
  }

  async function handleSubmit() {
    const offerIdNum = Number(offerId)
    const priceCents = majorStringToCents(priceMajor)
    if (!Number.isFinite(offerIdNum) || offerIdNum <= 0) return
    if (priceCents == null) return

    let accessDurationMonths: number | null = null
    if (accessMode === "months") {
      const months = Number(accessMonths)
      if (!Number.isFinite(months) || months <= 0 || !Number.isInteger(months)) return
      accessDurationMonths = months
    }

    try {
      await onSubmit({
        offerId: offerIdNum,
        buyerEmail: email.trim(),
        buyerName: name.trim(),
        priceCents,
        accessDurationMonths,
        soldAt,
      })
      reset()
      onOpenChange(false)
    } catch {
      // Error toast handled by mutation
    }
  }

  const monthsValid =
    accessMode === "lifetime" ||
    (Number.isInteger(Number(accessMonths)) && Number(accessMonths) > 0)

  const canSubmit =
    lookupSettled &&
    offerId !== "" &&
    majorStringToCents(priceMajor) != null &&
    monthsValid &&
    !isPending

  const lookupData = lookupSettled ? lookup.data : null
  const livingEnrollments = lookupData?.livingEnrollments ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pb-0">
          <DialogTitle>Add enrollment</DialogTitle>
          <DialogDescription>
            Creates access and a manual sale.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="manual-enroll-email">Email</Label>
            <Input
              id="manual-enroll-email"
              type="email"
              placeholder="client@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setNameTouched(false)
              }}
            />
            {emailReady && lookup.isFetching ? (
              <p className="text-xs text-muted-foreground">Looking up…</p>
            ) : null}
            {lookupData?.clientFound ? (
              <p className="text-xs text-muted-foreground">
                Existing client in this org
                {lookupData.hasAccount ? " (account linked)" : ""}.
              </p>
            ) : null}
            {lookupData && !lookupData.clientFound ? (
              <p className="text-xs text-muted-foreground">
                No previous enrollments for this email in this org.
              </p>
            ) : null}
          </div>

          {lookupData ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="manual-enroll-name">
                  Name
                </Label>
                <Input
                  id="manual-enroll-name"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => {
                    setNameTouched(true)
                    setName(e.target.value)
                  }}
                />
              </div>

              {livingEnrollments.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active enrollments
                  </p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto">
                    {livingEnrollments.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {item.offerTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Started {formatDate(item.startedAt)}
                            {item.expiresAt
                              ? ` · Expires ${formatDate(item.expiresAt)}`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Creating the same offer again expires the current access.
                  </p>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label>Offer</Label>
                <Select
                  value={offerId || undefined}
                  onValueChange={setOfferId}
                  disabled={offersLoading || offers.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        offersLoading
                          ? "Loading offers…"
                          : offers.length === 0
                            ? "No active offers"
                            : "Select offer"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {offers.map((offer) => (
                      <SelectItem key={offer.id} value={String(offer.id)}>
                        {offer.title}
                        {offer.price != null
                          ? ` · ${formatAmountFromCents(offer.price, offer.currency) ?? ""}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-enroll-price">
                  Amount paid ({selectedOffer?.currency?.toUpperCase() ?? "EUR"})
                </Label>
                <Input
                  id="manual-enroll-price"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={priceMajor}
                  onChange={(e) => setPriceMajor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-enroll-sold-at">Sale date</Label>
                <Input
                  id="manual-enroll-sold-at"
                  type="date"
                  value={soldAt}
                  onChange={(e) => setSoldAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Access duration</Label>
                <Select
                  value={accessMode}
                  onValueChange={(value) => {
                    if (value === "lifetime" || value === "months") {
                      setAccessMode(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="months">Limited (months)</SelectItem>
                  </SelectContent>
                </Select>
                {accessMode === "months" ? (
                  <Input
                    id="manual-enroll-months"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="Months"
                    value={accessMonths}
                    onChange={(e) => setAccessMonths(e.target.value)}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "Creating…" : "Create enrollment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
