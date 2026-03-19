"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const { supabase } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
    toast.success("Check your email for the reset link")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">C</span>
            <span className="text-lg font-bold text-foreground font-display">CoachStack</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold font-display">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <p className="text-center text-sm text-muted-foreground">
            If an account exists for {email}, you will receive a reset link.{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
