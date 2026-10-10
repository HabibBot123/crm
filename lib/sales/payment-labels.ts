import type { OrganizationSaleListItem } from "@/lib/services/sales"
import { formatAmountFromCents } from "@/lib/utils"

export type PaymentTypeInfo = {
  title: string
  detail: string | null
}

/** English labels for sale payment kind (table + sheet). */
export function paymentTypeInfo(sale: OrganizationSaleListItem): PaymentTypeInfo {
  if (sale.billing_type === "subscription") {
    return { title: "Subscription", detail: null }
  }

  const isInstallment =
    sale.billing_type === "installment" ||
    (sale.installment_count != null && sale.installment_count > 1)

  if (isInstallment) {
    const index = sale.installment_index ?? 1
    const count = sale.installment_count ?? 1
    const totalLabel =
      sale.base_amount_cents != null
        ? formatAmountFromCents(sale.base_amount_cents, sale.currency)
        : null
    return {
      title: "Installments",
      detail:
        totalLabel != null
          ? `Payment ${index} of ${count} · Total ${totalLabel}`
          : `Payment ${index} of ${count}`,
    }
  }

  return { title: "One-time", detail: null }
}
