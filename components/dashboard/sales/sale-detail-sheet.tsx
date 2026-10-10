"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { LeadStatusBadge } from "@/components/dashboard/crm/lead-status-badge"
import { useSaleSheetRelated } from "@/hooks/use-sales"
import type { OrganizationSaleListItem } from "@/lib/services/sales"
import { paymentTypeInfo } from "@/lib/sales/payment-labels"
import { formatAmountFromCents } from "@/lib/utils"

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  )
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function roleLabel(attributionType: string | null | undefined): string {
  if (attributionType === "closer") return "Closer"
  if (attributionType === "setter") return "Setter"
  if (attributionType === "ambassador") return "Ambassador"
  if (attributionType === "business_unit") return "Business unit"
  if (attributionType === "coach") return "Coach"
  return "—"
}

function commissionStatusLabel(status: string): string {
  if (status === "pending") return "Pending"
  if (status === "paid") return "Paid"
  if (status === "canceled") return "Canceled"
  return status
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" size="sm" className="w-full justify-between" asChild>
      <Link href={href}>
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </Button>
  )
}

export function SaleDetailSheet({
  sale,
  organizationId,
  open,
  onOpenChange,
}: {
  sale: OrganizationSaleListItem | null
  organizationId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { client, lead, commissions, isLoading } = useSaleSheetRelated(
    organizationId,
    sale,
    open
  )

  const payment = sale ? paymentTypeInfo(sale) : null
  const email = sale?.buyer_email?.trim() ?? ""
  const searchQ = email.length > 0 ? encodeURIComponent(email) : ""
  const headerMeta = sale
    ? [sale.buyer_email, formatDate(sale.created_at)].filter(Boolean).join(" · ")
    : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>Sale</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {sale && payment ? (
            <>
              <div className="space-y-2 border-b border-border pb-4 pr-10">
                <h3 className="text-lg font-semibold leading-tight text-foreground">
                  {sale.offer_title ?? `Sale #${sale.id}`}
                </h3>
                <p className="text-sm tabular-nums text-foreground">
                  {formatAmountFromCents(sale.price_cents, sale.currency) ?? "—"}
                </p>
                {headerMeta ? (
                  <p className="text-sm text-muted-foreground">{headerMeta}</p>
                ) : null}
              </div>

              <section className="space-y-3">
                <SectionLabel>Sale</SectionLabel>
                <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Payment</span>
                    <div className="text-right">
                      <div className="text-foreground">{payment.title}</div>
                      {payment.detail ? (
                        <div className="text-xs text-muted-foreground">{payment.detail}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Source</span>
                    <StatusBadge
                      status={sale.source === "manual" ? "manual" : "stripe"}
                      configs={{
                        manual: { label: "Manual", variant: "muted" },
                        stripe: { label: "Stripe", variant: "default" },
                      }}
                    />
                  </div>
                  {sale.base_amount_cents != null &&
                  sale.base_amount_cents !== sale.price_cents ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Deal base</span>
                      <span className="tabular-nums text-foreground">
                        {formatAmountFromCents(sale.base_amount_cents, sale.currency) ?? "—"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </section>

              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-24 animate-pulse rounded-md bg-muted" />
                  <div className="h-24 animate-pulse rounded-md bg-muted" />
                  <div className="h-24 animate-pulse rounded-md bg-muted" />
                </div>
              ) : (
                <>
                  <section className="space-y-3">
                    <SectionLabel>Client</SectionLabel>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      {client ? (
                        <>
                          <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                              {client.client_display}
                            </p>
                            <p className="text-muted-foreground">
                              {client.client_email ?? "—"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <StatusBadge
                                status={client.status}
                                configs={{
                                  active: { label: "Active", variant: "success" },
                                  expired: { label: "Expired", variant: "muted" },
                                  cancelled: {
                                    label: "Cancelled",
                                    variant: "destructive",
                                  },
                                  paused: { label: "Paused", variant: "muted" },
                                }}
                              />
                              <span>
                                {client.enrollment_count} enrollment
                                {client.enrollment_count === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                          {searchQ ? (
                            <SectionLink
                              href={`/dashboard/clients?search=${searchQ}`}
                              label="Open in Clients"
                            />
                          ) : null}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No client account for this buyer.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <SectionLabel>Lead</SectionLabel>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      {lead ? (
                        <>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="min-w-0 truncate font-medium text-foreground">
                                {lead.full_name}
                              </p>
                              <LeadStatusBadge status={lead.status} />
                            </div>
                            <p className="text-muted-foreground">{lead.email}</p>
                          </div>
                          <SectionLink
                            href={`/dashboard/crm?search=${encodeURIComponent(
                              (lead.email || email).trim()
                            )}`}
                            label="Open in CRM"
                          />
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No linked CRM lead.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <SectionLabel>Commissions</SectionLabel>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      {commissions.length > 0 ? (
                        <>
                          <ul className="space-y-2">
                            {commissions.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-start justify-between gap-2 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {item.member_name ??
                                      (item.member_id != null
                                        ? `Member #${item.member_id}`
                                        : "—")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {roleLabel(item.attribution_type)} ·{" "}
                                    {commissionStatusLabel(item.status)}
                                  </p>
                                </div>
                                <span className="shrink-0 tabular-nums text-foreground">
                                  {formatAmountFromCents(
                                    item.commission_amount,
                                    sale.currency
                                  ) ?? "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-muted-foreground">
                            Total{" "}
                            {formatAmountFromCents(
                              commissions.reduce(
                                (sum, item) => sum + item.commission_amount,
                                0
                              ),
                              sale.currency
                            ) ?? "—"}
                          </p>
                          {searchQ ? (
                            <SectionLink
                              href={`/dashboard/crm/commissions?search=${searchQ}`}
                              label="Open in Commissions"
                            />
                          ) : null}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No commissions on this sale.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
