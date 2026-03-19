"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Mail,
  Camera,
  LogOut,
  BookOpen,
  Clock,
  CreditCard,
  ChevronRight,
  Shield,
  Bell,
  ExternalLink,
  Loader2,
  FileText,
  Download,
} from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { fetchCoachedEnrollments, fetchCoachedInvoices } from "@/lib/services/coached"

function getInitials(name: string | null | undefined, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "?"
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase() || "EUR",
  }).format(cents / 100)
}

export default function CoachedProfilePage() {
  const { user, isLoading: authLoading, signOut, supabase } = useAuth()
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["coached-enrollments", user?.id, user?.email],
    queryFn: () => {
      if (!user?.id || !user?.email) throw new Error("Not authenticated")
      return fetchCoachedEnrollments(supabase, user.id, user.email)
    },
    enabled: !!user?.id && !!user?.email,
  })
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["coached-invoices", user?.id],
    queryFn: () => fetchCoachedInvoices(supabase),
    enabled: !!user,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [portalLoadingOrgId, setPortalLoadingOrgId] = useState<number | null>(null)
  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "—"
  const email = user?.email ?? ""
  const memberSince = user?.created_at
    ? formatDate(user.created_at)
    : "—"

  const handleOpenPortal = async (organizationId: number) => {
    setPortalLoadingOrgId(organizationId)
    try {
      const res = await fetch("/api/stripe-connect/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to open billing portal")
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      setPortalLoadingOrgId(null)
    } finally {
      setPortalLoadingOrgId(null)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground font-display">Profile</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="profile" className="gap-1.5">
            <Camera className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(displayName !== "—" ? displayName : null, email)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground"
                aria-label="Change avatar"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Member since {memberSince}</p>
            </div>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit Profile</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Edit Profile</DialogTitle>
                  <DialogDescription>Update your personal information</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setEditOpen(false)
                  }}
                >
                  <div>
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input id="edit-name" defaultValue={displayName} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input id="edit-email" type="email" defaultValue={email} className="mt-1.5" disabled />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Email is managed by your account and cannot be changed here.
                    </p>
                  </div>
                  <Button type="submit" className="w-full">Save Changes</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted p-3 text-center">
                  <BookOpen className="mx-auto h-4 w-4 text-primary" />
                  <p className="mt-1.5 text-lg font-bold text-foreground font-display">{enrollments.length}</p>
                  <p className="text-[10px] text-muted-foreground">Enrollments</p>
                </div>
                <div className="rounded-xl bg-muted p-3 text-center">
                  <Clock className="mx-auto h-4 w-4 text-accent" />
                  <p className="mt-1.5 text-lg font-bold text-foreground font-display">
                    {enrollments.filter((e) => e.status === "active").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Settings</h3>
              </div>
              <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates about your courses</p>
                </div>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified on your device</p>
                </div>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>

            <Link
              href="/login"
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your security credentials</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={async () => {
              await signOut()
              window.location.href = "/login"
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6 space-y-6">
          <Card className="border-border">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Enrollments</h3>
                </div>
                {enrollments.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{enrollments.length} enrollment{enrollments.length !== 1 ? "s" : ""}</Badge>
                )}
              </div>
              {enrollmentsLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : enrollments.length === 0 ? (
                <div className="px-4 py-6">
                  <p className="text-sm text-muted-foreground">You have no enrollments yet. Purchase an offer from a coach to see them here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {enrollments.map((en) => (
                    <div key={en.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{en.offer_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {en.organization_name} · {formatDate(en.started_at)}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px] capitalize">{en.status}</Badge>
                      </div>
                      {en.stripe_customer_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={() => handleOpenPortal(en.organization_id)}
                          disabled={portalLoadingOrgId !== null}
                        >
                          {portalLoadingOrgId === en.organization_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          Manage billing
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Invoices</h3>
                </div>
                {invoices.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</Badge>
                )}
              </div>
              {invoicesLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : invoices.length === 0 ? (
                <div className="px-4 py-6">
                  <p className="text-sm text-muted-foreground">No invoices yet. Invoices appear here after you complete a purchase.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {inv.offer_title ?? inv.organization_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.offer_title != null && inv.organization_name !== "—" ? `${inv.organization_name} · ` : ""}
                          {inv.stripe_created_at ? formatDate(inv.stripe_created_at) : formatDate(inv.created_at)} · {formatAmount(inv.amount_cents, inv.currency)}
                        </p>
                      </div>
                      {inv.invoice_pdf_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          asChild
                        >
                          <a href={inv.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">PDF pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
