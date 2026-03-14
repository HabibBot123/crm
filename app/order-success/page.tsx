"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, ArrowRight, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const product = searchParams.get("product") ?? "your purchase"
  const coach = searchParams.get("coach")
  const price = searchParams.get("price")
  const currency = searchParams.get("currency")?.toUpperCase() ?? ""

  const amountLabel = price
    ? `${Number(price).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} ${currency}`
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground font-display">Order confirmed!</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Thank you for your purchase.
          {coach ? (
            <>
              {" "}
              You&apos;ve just bought <strong className="text-foreground">{product}</strong> from{" "}
              <strong className="text-foreground">{coach}</strong>.
            </>
          ) : (
            <>
              {" "}
              You&apos;ve just bought <strong className="text-foreground">{product}</strong>.
            </>
          )}
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-left">
          <h3 className="text-sm font-semibold text-foreground">Order summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium text-foreground truncate max-w-[60%] text-right">
                {product}
              </span>
            </div>
            {coach && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coach</span>
                <span className="font-medium text-foreground truncate max-w-[60%] text-right">
                  {coach}
                </span>
              </div>
            )}
            {amountLabel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">{amountLabel}</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Next step: to access your content and your coaching space, please create your account
            using the{" "}
            <span className="font-medium text-foreground">same email address</span> you used for
            this purchase. This is how we link your payment to your account.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Link href="/coached-signup" className="block">
            <Button className="w-full gap-2">
              Go to signup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          A payment confirmation has been sent by Stripe to your email.
        </div>
      </div>
    </div>
  )
}

