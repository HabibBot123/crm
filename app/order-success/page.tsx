import Link from "next/link"
import { CheckCircle, ArrowRight, Download, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OrderSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground font-display">Order confirmed!</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Thank you for your purchase. You now have access to <strong className="text-foreground">Complete Fitness Transformation</strong>.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-left">
          <h3 className="text-sm font-semibold text-foreground">Order details</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order</span>
              <span className="font-medium text-foreground">ORD-007</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium text-foreground">Complete Fitness Transformation</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium text-foreground">$297.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium text-foreground">Visa *4242</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link href="/app" className="block">
            <Button className="w-full gap-2">
              Start learning
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download receipt
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          Confirmation sent to you@example.com
        </div>
      </div>
    </div>
  )
}
