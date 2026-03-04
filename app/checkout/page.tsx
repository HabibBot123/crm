"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Lock, Tag, Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function CheckoutPage() {
  const [coupon, setCoupon] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secure checkout
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Payment form */}
          <div className="lg:col-span-3">
            <h1 className="text-2xl font-bold text-foreground font-display">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">Complete your purchase</p>

            <div className="mt-8 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Contact information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" placeholder="Smith" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkoutEmail">Email</Label>
                  <Input id="checkoutEmail" type="email" placeholder="you@example.com" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Payment details</h3>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card number</Label>
                  <div className="relative">
                    <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="pl-10" />
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry date</Label>
                    <Input id="expiry" placeholder="MM / YY" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" placeholder="123" />
                  </div>
                </div>
              </div>

              <Link href="/order-success" className="block">
                <Button className="w-full gap-2" size="lg">
                  <Lock className="h-4 w-4" />
                  Pay $297.00
                </Button>
              </Link>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground">Order summary</h3>

              <div className="mt-6 flex gap-4">
                <div className="h-16 w-16 shrink-0 rounded-lg bg-muted" />
                <div>
                  <p className="text-sm font-medium text-foreground">Complete Fitness Transformation</p>
                  <p className="mt-1 text-xs text-muted-foreground">12-week program by FitPro Academy</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">$497.00</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>Discount (40%)</span>
                  <span>-$200.00</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-success">
                    <span>Coupon (COACH10)</span>
                    <span>-$29.70</span>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between text-base font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{couponApplied ? "$267.30" : "$297.00"}</span>
              </div>

              {/* Coupon */}
              <div className="mt-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Coupon code"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      className="pl-8"
                    />
                    <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCoupon("COACH10"); setCouponApplied(true) }}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Trust elements */}
              <div className="mt-6 space-y-3">
                {[
                  { icon: Shield, text: "30-day money-back guarantee" },
                  { icon: Lock, text: "SSL encrypted payment" },
                  { icon: Shield, text: "Lifetime access to content" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
