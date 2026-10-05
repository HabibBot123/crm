"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Copy, ExternalLink, ImageUp } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBranding } from "@/hooks/use-branding"
import { brandingToFormValues, type BrandingFormValues } from "@/lib/branding/branding-form-values"
import { buildOrgUrl, cn } from "@/lib/utils"
import { toast } from "sonner"

const colors = [
  "#e07b39",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#111827",
  "#0f766e",
]

export default function BrandingPage() {
  const queryClient = useQueryClient()
  const { currentOrganization, isLoading } = useCurrentOrganization()
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const orgId = currentOrganization?.id ?? null
  const brandingQuery = useBranding(orgId)
  const { saveBranding, isSaving } = brandingQuery

  const initialForm = brandingToFormValues(undefined)
  const [logoUrl, setLogoUrl] = useState(initialForm.logoUrl)
  const [bio, setBio] = useState(initialForm.bio)
  const [primaryColor, setPrimaryColor] = useState(initialForm.primaryColor)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const prevOrgIdRef = useRef<number | undefined>(undefined)

  function hydrateForm(v: BrandingFormValues) {
    setLogoUrl(v.logoUrl)
    setBio(v.bio)
    setPrimaryColor(v.primaryColor)
  }

  useEffect(() => {
    if (orgId == null) return

    const prev = prevOrgIdRef.current
    const switched = prev !== undefined && prev !== orgId
    prevOrgIdRef.current = orgId

    if (switched) {
      hydrateForm(brandingToFormValues(undefined))
    }

    if (brandingQuery.data !== undefined) {
      hydrateForm(brandingToFormValues(brandingQuery.data))
    }
  }, [orgId, brandingQuery.data])

  async function handleLogoUpload(file: File) {
    if (!currentOrganization?.id) return
    const formData = new FormData()
    formData.append("file", file)
    formData.append("organization_id", String(currentOrganization.id))
    formData.append("asset_type", "logo")

    setIsUploadingLogo(true)
    try {
      const res = await fetch("/api/organizations/upload-logo", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed"
        )
      }
      const payload: unknown = await res.json()
      const url =
        payload &&
        typeof payload === "object" &&
        "url" in payload &&
        typeof payload.url === "string"
          ? payload.url
          : null
      if (!url) throw new Error("Upload failed")
      setLogoUrl(url)
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      queryClient.invalidateQueries({
        queryKey: ["organization-branding", currentOrganization.id],
      })
      toast.success("Logo updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploadingLogo(false)
    }
  }

  function save() {
    saveBranding({
      logo_url: logoUrl,
      bio: bio.trim() || null,
      description: bio.trim() || null,
      primary_color: primaryColor || null,
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const publicUrl = currentOrganization
    ? buildOrgUrl(appUrl, currentOrganization.slug)
    : ""

  async function copyPublicLink() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success("Store link copied")
    } catch {
      toast.error("Unable to copy link")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }
  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to edit your store page.
        </p>
      </div>
    )
  }
  if (!capsLoading && !can("org.settings")) {
    return (
      <NoAccessState
        title="Store page"
        description="You don’t have permission to edit the store page with your role."
      />
    )
  }
  if (brandingQuery.isPending) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading store settings…</p>
      </div>
    )
  }
  if (brandingQuery.isError) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-destructive">
          {brandingQuery.error.message ?? "Unable to load store settings."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Store page"
        subtitle="Simple public link to sell your offers — like Stan or Gumroad."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyPublicLink} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={publicUrl} target="_blank" rel="noreferrer" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View store
            </Link>
          </Button>
        </div>
      </PageHeader>

      <SectionCard
        title="Identity"
        subtitle="Logo, short bio, and accent color. Active offers appear automatically."
      >
        <div className="max-w-xl space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-xs font-bold">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  currentOrganization.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
                  <ImageUp className="h-4 w-4" />
                  {isUploadingLogo ? "Uploading…" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleLogoUpload(file)
                      e.target.value = ""
                    }}
                  />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Square image works best.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-bio">Short bio</Label>
            <Textarea
              id="store-bio"
              rows={3}
              maxLength={280}
              placeholder="Who you coach and what you sell…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/280</p>
          </div>

          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setPrimaryColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition",
                    primaryColor === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Store URL:{" "}
            <span className="font-medium text-foreground break-all">{publicUrl}</span>
          </div>

          <Button onClick={save} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save store page"}
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
