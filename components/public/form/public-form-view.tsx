"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { brandOnSurface } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { CrmForm } from "@/schemas/crm.schema"

type PublicFormViewProps = {
  orgSlug: string
  formSlug: string
  refCode: string | null
  organization: {
    name: string
    branding: Record<string, unknown> | null
  }
  form: CrmForm
}

const apiErrorSchema = z.object({ error: z.string().optional() })
const REDIRECT_DELAY_MS = 3500

function resolvePostSubmitRedirect(form: CrmForm): string | null {
  const url = form.redirect_url?.trim()
  return url && url.length > 0 ? url : null
}

export function PublicFormView({
  orgSlug,
  formSlug,
  refCode,
  organization,
  form,
}: PublicFormViewProps) {
  const branding = organization.branding ?? {}
  const primaryColor =
    typeof branding.primary_color === "string" && branding.primary_color.trim().length > 0
      ? branding.primary_color
      : "#e07b39"
  const onPrimary = brandOnSurface(primaryColor)

  const logoUrl = typeof branding.logo_url === "string" ? branding.logo_url : null
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredKeys = form.fields.filter((field) => field.is_required).map((field) => field.key)
  const pendingRedirectUrl = resolvePostSubmitRedirect(form)

  useEffect(() => {
    if (!submitted || !pendingRedirectUrl) return
    const timer = window.setTimeout(() => {
      window.location.assign(pendingRedirectUrl)
    }, REDIRECT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [submitted, pendingRedirectUrl])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.")
      return
    }

    for (const key of requiredKeys) {
      const value = values[key]?.trim()
      if (!value) {
        setError("Please fill all required fields.")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const body = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        website: "",
        field_values: form.fields.map((field) => ({
          fieldDefId: field.field_def_id,
          value: values[field.key] ?? "",
        })),
      }
      const endpoint = `/api/public/org/${encodeURIComponent(orgSlug)}/form/${encodeURIComponent(formSlug)}`
      const url = new URL(endpoint, window.location.origin)
      if (refCode) {
        url.searchParams.set("ref", refCode)
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const rawResponse = await response.json().catch(() => null)
        const responseBody = apiErrorSchema.safeParse(rawResponse)
        setError(
          responseBody.success
            ? (responseBody.data.error ?? "Could not submit form")
            : "Could not submit form"
        )
        return
      }

      setSubmitted(true)
    } catch {
      setError("Could not submit form")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    const successMessage =
      form.success_message?.trim() ||
      "Thank you for submitting your information. We will contact you soon."
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <PublicFormOrgBrand
          name={organization.name}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
        />
        <div className="space-y-4 rounded-xl border border-border bg-card p-8 text-center">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Thank you
            </h1>
            <p className="text-sm text-muted-foreground">{successMessage}</p>
          </div>

          {pendingRedirectUrl ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                You will be redirected in a few seconds to:
              </p>
              <a
                href={pendingRedirectUrl}
                className="block break-all text-sm font-medium text-primary hover:underline"
              >
                {pendingRedirectUrl}
              </a>
              <Button
                type="button"
                className="w-full"
                style={{ background: primaryColor, color: onPrimary.fg }}
                onClick={() => window.location.assign(pendingRedirectUrl)}
              >
                Continue now
              </Button>
            </div>
          ) : null}
        </div>
        <PoweredByCoachStack />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PublicFormOrgBrand
        name={organization.name}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />

      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="mb-6 space-y-1">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {form.title}
          </h1>
          {form.description ? (
            <p className="text-sm text-muted-foreground">{form.description}</p>
          ) : null}
        </div>

        <form className="relative space-y-4" onSubmit={handleSubmit}>
          <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>

          {form.fields.map((field) => {
            const fieldValue = values[field.key] ?? ""
            return (
              <div key={field.id} className="space-y-1.5">
                <Label>
                  {field.client_question}
                  {field.is_required ? " *" : ""}
                </Label>

                {field.field_type === "text" && (
                  <Input
                    value={fieldValue}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                  />
                )}
                {field.field_type === "textarea" && (
                  <Textarea
                    value={fieldValue}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                  />
                )}
                {field.field_type === "number" && (
                  <Input
                    type="number"
                    value={fieldValue}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                  />
                )}
                {field.field_type === "date" && (
                  <Input
                    type="date"
                    value={fieldValue}
                    onChange={(event) =>
                      setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                    }
                  />
                )}
                {field.field_type === "select" && (
                  <Select
                    value={fieldValue}
                    onValueChange={(value) =>
                      setValues((previous) => ({ ...previous, [field.key]: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.field_type === "multi_select" && (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {(field.options ?? []).map((option) => {
                      const valuesSet = new Set(
                        fieldValue
                          .split(",")
                          .map((item) => item.trim())
                          .filter((item) => item.length > 0)
                      )
                      const checked = valuesSet.has(option.value)
                      return (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) => {
                              const nextSet = new Set(valuesSet)
                              if (nextChecked) {
                                nextSet.add(option.value)
                              } else {
                                nextSet.delete(option.value)
                              }
                              setValues((previous) => ({
                                ...previous,
                                [field.key]: Array.from(nextSet).join(","),
                              }))
                            }}
                          />
                          {option.label}
                        </label>
                      )
                    })}
                  </div>
                )}
                {field.field_type === "boolean" && (
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">Yes / No</span>
                    <Switch
                      checked={fieldValue === "true"}
                      onCheckedChange={(checked) =>
                        setValues((previous) => ({
                          ...previous,
                          [field.key]: checked ? "true" : "false",
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            )
          })}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            style={{ background: primaryColor, color: onPrimary.fg }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </div>

      <PoweredByCoachStack />
    </div>
  )
}

function PublicFormOrgBrand({
  name,
  logoUrl,
  primaryColor,
}: {
  name: string
  logoUrl: string | null
  primaryColor: string
}) {
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-11 w-11 rounded-lg object-cover" />
      ) : (
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-semibold"
          style={{ background: `${primaryColor}1a`, color: primaryColor }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display text-lg font-bold tracking-tight text-foreground truncate">
          {name}
        </p>
      </div>
    </div>
  )
}

function PoweredByCoachStack() {
  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary font-display text-[10px] font-bold text-primary-foreground">
        CS
      </div>
      <p className="text-xs">
        Powered by <span className="font-medium text-foreground">CoachStack</span>
      </p>
    </div>
  )
}
