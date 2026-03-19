"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User as UserIcon, Mail, Shield, KeyRound, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

function formatProvider(provider: string): string {
  const map: Record<string, string> = {
    email: "Email",
    google: "Google",
    github: "GitHub",
    apple: "Apple",
  }
  return map[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
}

export default function AccountPage() {
  const router = useRouter()
  const { user, supabase, signOut } = useAuth()
  const [sendingReset, setSendingReset] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() ?? null
  const email = user?.email ?? null
  const primaryProvider =
    user?.app_metadata?.provider ??
    user?.identities?.[0]?.provider ??
    "email"
  const providers: string[] =
    (user?.app_metadata?.providers as string[] | undefined)?.filter(Boolean) ??
    (primaryProvider ? [primaryProvider] : [])

  const isEmailProvider = providers.includes("email")

  async function handleSendPasswordReset() {
    if (!email) return
    setSendingReset(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    })
    setSendingReset(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Check your email for the password reset link")
  }

  async function handleSignOut() {
    await signOut()
    router.push("/")
  }

  if (!user) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-muted-foreground">Loading account…</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-bold text-foreground font-display">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your profile and sign-in details
      </p>

      <div className="mt-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4" />
              Profile
            </CardTitle>
            <CardDescription>Information associated with your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <p className="text-sm text-foreground">{fullName || "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <p className="text-sm text-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {email || "—"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Signed in with</span>
              <p className="text-sm text-foreground flex items-center gap-2 flex-wrap">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {providers.length > 0
                  ? providers.map((p) => formatProvider(p)).join(", ")
                  : formatProvider(primaryProvider)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Password
            </CardTitle>
            <CardDescription>
              {isEmailProvider
                ? "Change your password via a secure link sent to your email"
                : "You sign in with " +
                  (providers.map((p) => formatProvider(p)).join(" and ") || formatProvider(primaryProvider)) +
                  ". Password is managed by your sign-in provider."}
            </CardDescription>
          </CardHeader>
          {isEmailProvider && (
            <CardContent>
              <Button
                variant="secondary"
                onClick={handleSendPasswordReset}
                disabled={sendingReset}
              >
                {sendingReset ? "Sending…" : "Send password reset email"}
              </Button>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LogOut className="h-4 w-4" />
              Sign out
            </CardTitle>
            <CardDescription>
              You will need to sign in again to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
