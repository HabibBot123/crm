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

type AccessMode = "lifetime" | "months"

export function AddManualEnrollmentDialog({
  open,
  onOpenChange,
  offers,
  offersLoading,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  offers: OfferListItem[]
  offersLoading?: boolean
  onSubmit: (input: {
    offerId: number
    buyerEmail: string
    buyerName: string
    priceCents: number
    accessDurationMonths: number | null
  }) => Promise<void>
  isPending?: boolean
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [offerId, setOfferId] = useState<string>("")
  const [priceMajor, setPriceMajor] = useState("")
  const [accessMode, setAccessMode] = useState<AccessMode>("lifetime")
  const [accessMonths, setAccessMonths] = useState("1")

  const selectedOffer = offers.find((o) => String(o.id) === offerId) ?? null

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

  function reset() {
    setEmail("")
    setName("")
    setOfferId("")
    setPriceMajor("")
    setAccessMode("lifetime")
    setAccessMonths("1")
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
    email.trim().includes("@") &&
    offerId !== "" &&
    majorStringToCents(priceMajor) != null &&
    monthsValid &&
    !isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add enrollment</DialogTitle>
          <DialogDescription>
            Creates access and a manual sale (no Stripe billing for this client).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="manual-enroll-email">Email</Label>
            <Input
              id="manual-enroll-email"
              type="email"
              placeholder="client@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              No account yet? Ask them to sign up with this email.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manual-enroll-name">Name (optional)</Label>
            <Input
              id="manual-enroll-name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
        </div>
        <DialogFooter>
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
