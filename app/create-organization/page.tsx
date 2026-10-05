"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useOrganizations } from "@/hooks/use-organizations"
import { toast } from "sonner"

const CURRENT_ORG_STORAGE_KEY = "crm-sport-current-org-id"

export default function CreateOrganizationPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const { organizations, isLoading: orgsLoading } = useOrganizations()
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const isLoading = authLoading || orgsLoading

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  function slugFromName(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setName(value)
    if (!slug || slug === slugFromName(name)) {
      setSlug(slugFromName(value))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return

    const slugValue = slug.trim().toLowerCase()
    const nameValue = name.trim()

    if (!slugValue || !nameValue) {
      toast.error("Organization name and slug are required")
      return
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)) {
      toast.error("Slug must be lowercase letters, numbers, and hyphens only")
      return
    }

    setLoading(true)

    const res = await fetch("/api/organizations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: slugValue, name: nameValue }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      toast.error(
        typeof data.error === "string" ? data.error : "Failed to create organization"
      )
      return
    }

    const organizationId =
      typeof data.organization_id === "number"
        ? data.organization_id
        : Number(data.organization_id)

    await queryClient.invalidateQueries({ queryKey: ["organizations"] })
    if (Number.isFinite(organizationId) && organizationId > 0) {
      localStorage.setItem(CURRENT_ORG_STORAGE_KEY, String(organizationId))
    }
    toast.success("Organization created successfully")
    router.refresh()
    router.push("/dashboard")
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <div>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Create your organization
          </h1>
          <p className="mt-2 text-muted-foreground">
            Set up your coaching business. This will be your workspace for products, clients, and team members.
          </p>
          {organizations.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              You already belong to {organizations.length === 1 ? "an organization" : "organizations"}.
              Creating a new one makes you its owner; you can switch anytime from the sidebar.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              placeholder="My Coaching Academy"
              value={name}
              onChange={handleNameChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (your subdomain)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                placeholder="my-coaching"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
              />
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                .coachpro.com
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and hyphens only. Must be unique.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create organization"}
          </Button>
        </form>
      </div>
    </div>
  )
}
