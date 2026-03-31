"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ExternalLink,
  ImageUp,
  ListChecks,
  Palette,
  Quote,
  HelpCircle,
  CheckCircle2,
  UserCircle,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { NavList, type NavListItem } from "@/components/dashboard/nav-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useBranding } from "@/hooks/use-branding"
import { useOffers } from "@/hooks/use-offers"
import { brandingToFormValues, type BrandingFormValues } from "@/lib/branding/branding-form-values"
import { buildOrgUrl, cn } from "@/lib/utils"
import { toast } from "sonner"

type BrandingSection = "general" | "offers" | "about" | "testimonials" | "faq"

const nav: NavListItem<BrandingSection>[] = [
  { id: "general", label: "General", icon: Palette },
  { id: "offers", label: "Offers", icon: ListChecks },
  { id: "about", label: "About", icon: UserCircle },
  { id: "testimonials", label: "Testimonials", icon: Quote },
  { id: "faq", label: "FAQ", icon: HelpCircle },
]

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
  const orgId = currentOrganization?.id ?? null
  const { offers } = useOffers(orgId, "active")
  const brandingQuery = useBranding(orgId)
  const { saveBranding, isSaving } = brandingQuery
  const [section, setSection] = useState<BrandingSection>("general")

  const initialForm = brandingToFormValues(undefined)
  const [logoUrl, setLogoUrl] = useState(initialForm.logoUrl)
  const [heroImageUrl, setHeroImageUrl] = useState(initialForm.heroImageUrl)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingHero, setIsUploadingHero] = useState(false)

  const [description, setDescription] = useState(initialForm.description)
  const [bio, setBio] = useState(initialForm.bio)
  const [credentials, setCredentials] = useState(initialForm.credentials)
  const [tagline, setTagline] = useState(initialForm.tagline)
  const [ctaText, setCtaText] = useState(initialForm.ctaText)
  const [offersSectionTitle, setOffersSectionTitle] = useState(initialForm.offersSectionTitle)
  const [footerCtaText, setFooterCtaText] = useState(initialForm.footerCtaText)
  const [primaryColor, setPrimaryColor] = useState(initialForm.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(initialForm.secondaryColor)
  const [stats, setStats] = useState(initialForm.stats)
  const [testimonials, setTestimonials] = useState(initialForm.testimonials)
  const [faq, setFaq] = useState(initialForm.faq)

  const [visibleOfferIds, setVisibleOfferIds] = useState(initialForm.visibleOfferIds)
  const [featuredOfferId, setFeaturedOfferId] = useState(initialForm.featuredOfferId)

  const prevOrgIdRef = useRef<number | undefined>(undefined)

  function hydrateForm(v: BrandingFormValues) {
    setLogoUrl(v.logoUrl)
    setHeroImageUrl(v.heroImageUrl)
    setDescription(v.description)
    setBio(v.bio)
    setCredentials(v.credentials)
    setTagline(v.tagline)
    setCtaText(v.ctaText)
    setOffersSectionTitle(v.offersSectionTitle)
    setFooterCtaText(v.footerCtaText)
    setPrimaryColor(v.primaryColor)
    setSecondaryColor(v.secondaryColor)
    setStats(v.stats)
    setTestimonials(v.testimonials)
    setFaq(v.faq)
    setVisibleOfferIds(v.visibleOfferIds)
    setFeaturedOfferId(v.featuredOfferId)
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

  const visibleOffers = useMemo(() => {
    if (visibleOfferIds.length === 0) return offers
    return visibleOfferIds
      .map((id) => offers.find((o) => o.id === id) ?? null)
      .filter((o): o is (typeof offers)[number] => o != null)
  }, [offers, visibleOfferIds])

  const effectiveFeatured =
    featuredOfferId != null && visibleOffers.some((o) => o.id === featuredOfferId)
      ? featuredOfferId
      : null

  async function handleAssetUpload(
    file: File,
    type: "logo" | "hero"
  ) {
    if (!currentOrganization?.id) return
    const formData = new FormData()
    formData.append("file", file)
    formData.append("organization_id", String(currentOrganization.id))
    formData.append("asset_type", type)

    if (type === "logo") setIsUploadingLogo(true)
    if (type === "hero") setIsUploadingHero(true)

    try {
      const res = await fetch("/api/organizations/upload-logo", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Upload failed")
      }
      const { url } = (await res.json()) as { url: string }
      if (type === "logo") setLogoUrl(url)
      if (type === "hero") setHeroImageUrl(url)
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      if (currentOrganization?.id != null) {
        queryClient.invalidateQueries({
          queryKey: ["organization-branding", currentOrganization.id],
        })
      }
      toast.success(type === "logo" ? "Logo updated" : "Hero image updated")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      if (type === "logo") setIsUploadingLogo(false)
      if (type === "hero") setIsUploadingHero(false)
    }
  }

  function save() {
    saveBranding({
      logo_url: logoUrl,
      hero_image_url: heroImageUrl,
      description: description || null,
      bio: bio.trim() || null,
      credentials,
      tagline: tagline || null,
      cta_text: ctaText || null,
      offers_section_title: offersSectionTitle || null,
      footer_cta_text: footerCtaText || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      stats,
      testimonials,
      faq,
      offers_display: {
        visible_offer_ids: visibleOfferIds,
        featured_offer_id: effectiveFeatured,
      },
    })
  }

  function toggleVisibleOffer(offerId: number) {
    setVisibleOfferIds((prev) =>
      prev.includes(offerId) ? prev.filter((id) => id !== offerId) : [...prev, offerId]
    )
  }

  if (isLoading) {
    return <div className="space-y-4 p-6 lg:p-8"><p className="text-sm text-muted-foreground">Loading…</p></div>
  }
  if (!currentOrganization) {
    return <div className="space-y-4 p-6 lg:p-8"><p className="text-sm text-muted-foreground">Select an organization to edit branding.</p></div>
  }
  if (brandingQuery.isPending) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Loading branding…</p>
      </div>
    )
  }
  if (brandingQuery.isError) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-destructive">
          {brandingQuery.error.message ?? "Unable to load branding."}
        </p>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const publicUrl = buildOrgUrl(appUrl, currentOrganization.slug)

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Branding" subtitle={`Customize public pages for ${currentOrganization.name}`}>
        <Button variant="outline" size="sm" asChild>
          <Link href={publicUrl} target="_blank" rel="noreferrer" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View public page
          </Link>
        </Button>
      </PageHeader>

      <div className="flex gap-8">
        <NavList items={nav} value={section} onChange={setSection} />

        <div className="min-w-0 flex-1 space-y-4">
          {section === "general" && (
            <SectionCard title="General" subtitle="Identity, hero and color system">
              <div className="max-w-3xl space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-xs font-bold">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt={currentOrganization.name} className="h-full w-full object-cover" />
                        ) : (
                          currentOrganization.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/60">
                        <ImageUp className="h-4 w-4" />
                        {isUploadingLogo ? "Uploading…" : "Upload logo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) void handleAssetUpload(file, "logo")
                            e.target.value = ""
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hero image</Label>
                    <div className="space-y-3">
                      <div className="h-24 w-full overflow-hidden rounded-xl border border-border bg-muted">
                        {heroImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={heroImageUrl} alt="Hero preview" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/60">
                        <ImageUp className="h-4 w-4" />
                        {isUploadingHero ? "Uploading…" : "Upload hero image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingHero}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) void handleAssetUpload(file, "hero")
                            e.target.value = ""
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="UEFA Pro certified coach" />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA text</Label>
                    <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="See programs" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Primary color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded bg-background p-1"
                        aria-label="Pick primary color"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setPrimaryColor(color)}
                          className={cn("h-8 w-8 rounded-lg border-2", primaryColor === color ? "border-foreground" : "border-transparent")}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded bg-background p-1"
                        aria-label="Pick secondary color"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSecondaryColor(color)}
                          className={cn("h-8 w-8 rounded-lg border-2", secondaryColor === color ? "border-foreground" : "border-transparent")}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Offers section title</Label>
                    <Input value={offersSectionTitle} onChange={(e) => setOffersSectionTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Footer CTA title</Label>
                    <Input value={footerCtaText} onChange={(e) => setFooterCtaText(e.target.value)} />
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {section === "about" && (
            <SectionCard
              title="About"
              subtitle="Bio and credentials shown on the public page after programs, before testimonials."
            >
              <div className="max-w-3xl space-y-6">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={8}
                    placeholder="Your background, method, experience…"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Credentials</Label>
                  <p className="text-xs text-muted-foreground">
                    Optional list (e.g. diplomas). You can use an emoji in the icon field.
                  </p>
                  <div className="space-y-3">
                    {credentials.map((row, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
                      >
                        <Input
                          value={row.icon}
                          onChange={(e) =>
                            setCredentials((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, icon: e.target.value } : r))
                            )
                          }
                          className="w-14 font-mono text-center"
                          placeholder="🏅"
                          aria-label="Credential icon"
                        />
                        <Input
                          value={row.text}
                          onChange={(e) =>
                            setCredentials((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r))
                            )
                          }
                          className="min-w-[200px] flex-1"
                          placeholder="Label"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCredentials((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCredentials((prev) => [...prev, { icon: "🏅", text: "" }])
                      }
                    >
                      Add credential
                    </Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {section === "offers" && (
            <SectionCard title="Offers display" subtitle="Choose which offers are visible and which one is featured">
              <div className="max-w-3xl space-y-4">
                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No offers found.</p>
                ) : (
                  <ul className="space-y-3">
                    {offers.map((offer) => {
                      const visible = visibleOfferIds.length === 0 || visibleOfferIds.includes(offer.id)
                      const selected = visibleOfferIds.includes(offer.id)
                      return (
                        <li key={offer.id} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{offer.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{offer.status}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleVisibleOffer(offer.id)}
                                className={cn(
                                  "rounded-lg border px-3 py-1.5 text-xs",
                                  selected ? "border-foreground text-foreground" : "border-border text-muted-foreground"
                                )}
                              >
                                {selected ? "Visible" : "Hidden"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFeaturedOfferId((prev) =>
                                    prev === offer.id ? null : offer.id
                                  )
                                }
                                disabled={!visible}
                                className={cn(
                                  "rounded-lg border px-3 py-1.5 text-xs",
                                  featuredOfferId === offer.id
                                    ? "border-foreground text-foreground"
                                    : "border-border text-muted-foreground",
                                  !visible && "cursor-not-allowed opacity-50"
                                )}
                              >
                                Featured
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {featuredOfferId != null && effectiveFeatured == null && (
                  <p className="flex items-center gap-2 text-xs text-amber-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Featured offer is ignored because it is not visible.
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          {section === "testimonials" && (
            <SectionCard title="Testimonials" subtitle="Social proof shown on the public page">
              <div className="max-w-3xl space-y-3">
                {testimonials.map((t, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-4 space-y-2">
                    <Input value={t.author} onChange={(e) => setTestimonials((prev) => prev.map((x, i) => i === idx ? { ...x, author: e.target.value } : x))} placeholder="Author" />
                    <Input value={t.role ?? ""} onChange={(e) => setTestimonials((prev) => prev.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))} placeholder="Role" />
                    <Textarea value={t.text} onChange={(e) => setTestimonials((prev) => prev.map((x, i) => i === idx ? { ...x, text: e.target.value } : x))} rows={3} />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Rating</Label>
                      <Input type="number" min={1} max={5} value={t.rating ?? 5} onChange={(e) => setTestimonials((prev) => prev.map((x, i) => i === idx ? { ...x, rating: Number(e.target.value) || 5 } : x))} className="w-20" />
                      <Button type="button" variant="outline" size="sm" onClick={() => setTestimonials((prev) => prev.filter((_, i) => i !== idx))}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setTestimonials((prev) => [...prev, { author: "New", text: "", rating: 5 }])}>
                  Add testimonial
                </Button>
              </div>
            </SectionCard>
          )}

          {section === "faq" && (
            <SectionCard title="FAQ" subtitle="Questions displayed near the bottom of the page">
              <div className="max-w-3xl space-y-3">
                {faq.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-4 space-y-2">
                    <Input value={item.question} onChange={(e) => setFaq((prev) => prev.map((x, i) => i === idx ? { ...x, question: e.target.value } : x))} placeholder="Question" />
                    <Textarea value={item.answer} onChange={(e) => setFaq((prev) => prev.map((x, i) => i === idx ? { ...x, answer: e.target.value } : x))} rows={3} />
                    <Button type="button" variant="outline" size="sm" onClick={() => setFaq((prev) => prev.filter((_, i) => i !== idx))}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setFaq((prev) => [...prev, { question: "", answer: "" }])}>
                  Add FAQ item
                </Button>
              </div>
            </SectionCard>
          )}

          <div className="pt-2">
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save branding"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

