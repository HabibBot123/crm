"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Palette, Upload, ExternalLink } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  type OrganizationBranding,
  type UpdateOrganizationBrandingInput,
  updateOrganizationBranding,
} from "@/lib/services/organizations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn, buildOrgUrl } from "@/lib/utils"
import { toast } from "sonner"

const colors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
]

export default function BrandingPage() {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  const { currentOrganization, isLoading } = useCurrentOrganization()

  const initialBranding: OrganizationBranding = currentOrganization?.branding ?? {}

  const [description, setDescription] = useState(initialBranding.description ?? "")
  const [primaryColor, setPrimaryColor] = useState(
    initialBranding.primary_color || colors[0]
  )
  const [logoUrl, setLogoUrl] = useState(initialBranding.logo_url ?? null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const brandingMutation = useMutation({
    mutationFn: (input: UpdateOrganizationBrandingInput) => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected")
      }
      return updateOrganizationBranding(supabase, currentOrganization.id, input)
    },
    onSuccess: (branding) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      toast.success("Branding saved")
      setDescription(branding.description ?? "")
      setPrimaryColor(branding.primary_color || colors[0])
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrganization?.id) return
    const payload: UpdateOrganizationBrandingInput = {
      description: description || null,
      primary_color: primaryColor,
    }
    brandingMutation.mutate(payload)
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentOrganization?.id) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("organization_id", String(currentOrganization.id))

    setIsUploadingLogo(true)
    try {
      const res = await fetch("/api/organizations/upload-logo", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Logo upload failed")
      }
      const { url } = (await res.json()) as { url: string }
      setLogoUrl(url)
      toast.success("Logo updated")
      // Optionally refresh organizations to pick up branding.logo_url from DB
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setIsUploadingLogo(false)
      e.target.value = ""
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to edit its branding.
        </p>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const publicUrl = buildOrgUrl(appUrl, currentOrganization.slug)

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Branding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize the public page for{" "}
            <span className="font-medium text-foreground">
              {currentOrganization.name}
            </span>
            .
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={publicUrl} target="_blank" rel="noreferrer" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View public page
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        {/* Form */}
        <div className="max-w-xl space-y-8">
          {/* Logo */}
          <div className="space-y-3">
            <Label>Logo</Label>
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-xl font-bold text-muted-foreground">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={currentOrganization.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (currentOrganization.name || "?")
                    .split(" ")
                    .map((n) => n[0]?.toUpperCase())
                    .join("")
                    .slice(0, 2)
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <label>
                    <Upload className="h-4 w-4" />
                    {isUploadingLogo ? "Uploading…" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                      disabled={isUploadingLogo}
                    />
                  </label>
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG, WEBP. Max 2MB. Square recommended.
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="branding-description">Description</Label>
            <Textarea
              id="branding-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Short description of your organization..."
            />
            <p className="text-xs text-muted-foreground">
              This text appears at the top of your public page.
            </p>
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Primary color
            </Label>
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  className={cn(
                    "h-10 w-10 rounded-lg border-2 transition-all",
                    primaryColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 font-mono"
              />
              <div
                className="h-10 w-10 rounded-lg border border-border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>

          <Button
            type="submit"
            onClick={handleSaveBranding}
            disabled={brandingMutation.isPending}
          >
            {brandingMutation.isPending ? "Saving…" : "Save branding"}
          </Button>
        </div>

        {/* Preview — matches public page layout */}
        <div className="space-y-4">
          <Label>Preview</Label>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="space-y-5">
              {/* Header like public page */}
              <section className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-lg font-bold text-muted-foreground">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={currentOrganization.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (currentOrganization.name || "?")
                      .split(" ")
                      .map((n) => n[0]?.toUpperCase())
                      .join("")
                      .slice(0, 2)
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {currentOrganization.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {currentOrganization.slug}.localhost
                  </p>
                </div>
              </section>

              {/* Hero / description card like public page */}
              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div
                  className="h-14 w-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="px-4 pb-4 pt-3">
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line">
                    {description || "Your organization description will appear here."}
                  </p>
                </div>
              </section>

              {/* Offers section placeholder */}
              <section className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Offers</h3>
                <p className="text-xs text-muted-foreground">
                  Your active offers will appear here.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

