"use client"

import { useState } from "react"
import { KeyRound, Shield } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { authProvidersFromUser } from "@/lib/auth-providers"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"

type SecuritySectionProps = {
  email: string | null
}

export function SecuritySection({ email }: SecuritySectionProps) {
  const { user, supabase } = useAuth()
  const { isEmailProvider, signedInWithLabel } = authProvidersFromUser(user)
  const [sendingReset, setSendingReset] = useState(false)

  async function handleSendPasswordReset() {
    if (!email || !isEmailProvider) return
    setSendingReset(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login/reset-password")}`,
    })
    setSendingReset(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Check your email for the password reset link")
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Signed in with">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {signedInWithLabel}
        </p>
      </SectionCard>

      <SectionCard
        title="Password"
        subtitle={
          isEmailProvider
            ? "Change your password via a secure link sent to your email."
            : `You sign in with ${signedInWithLabel}. Password is managed by your provider.`
        }
      >
        <Button
          size="sm"
          variant="outline"
          disabled={!isEmailProvider || sendingReset || !email}
          onClick={() => void handleSendPasswordReset()}
        >
          <KeyRound className="h-4 w-4" />
          {sendingReset ? "Sending…" : "Send password reset email"}
        </Button>
      </SectionCard>
    </div>
  )
}
