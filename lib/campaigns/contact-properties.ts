import type { Resend } from "resend"
import { unsubscribeContactPropertyKey } from "@/lib/campaigns/unsubscribe"

/** Org-scoped first name property on the shared Resend contact. */
export function firstNameContactPropertyKey(organizationId: number): string {
  return `cs_fn_${organizationId}`
}

/** Org-scoped last name property on the shared Resend contact. */
export function lastNameContactPropertyKey(organizationId: number): string {
  return `cs_ln_${organizationId}`
}

const ensuredPropertyKeys = new Set<string>()

async function ensureStringContactProperty(
  resend: Resend,
  key: string,
  fallbackValue: string
): Promise<void> {
  if (ensuredPropertyKeys.has(key)) return

  const { error } = await resend.contactProperties.create({
    key,
    type: "string",
    fallbackValue,
  })
  if (error) {
    const message = error.message.toLowerCase()
    const alreadyExists =
      message.includes("already") ||
      message.includes("exist") ||
      message.includes("duplicate")
    if (!alreadyExists) {
      console.warn("ensureStringContactProperty failed:", key, error.message)
    }
  }
  ensuredPropertyKeys.add(key)
}

/** Ensure org-scoped Resend contact properties exist (idempotent). */
export async function ensureOrgContactProperties(
  resend: Resend,
  organizationId: number
): Promise<{
  firstNameKey: string
  lastNameKey: string
  unsubscribeKey: string
}> {
  const firstNameKey = firstNameContactPropertyKey(organizationId)
  const lastNameKey = lastNameContactPropertyKey(organizationId)
  const unsubscribeKey = unsubscribeContactPropertyKey(organizationId)

  await ensureStringContactProperty(resend, firstNameKey, "there")
  await ensureStringContactProperty(resend, lastNameKey, "")
  await ensureStringContactProperty(resend, unsubscribeKey, "")

  return { firstNameKey, lastNameKey, unsubscribeKey }
}

/**
 * Rewrite editor tokens to org-scoped Resend merge tags for broadcast.
 * Stored HTML keeps FIRST_NAME / LAST_NAME / EMAIL / UNSUBSCRIBE_URL.
 * Resend expects `{{{contact.<key>|fallback}}}` for custom properties.
 */
export function injectOrgScopedMergeTags(
  html: string,
  organizationId: number
): string {
  const firstNameKey = firstNameContactPropertyKey(organizationId)
  const lastNameKey = lastNameContactPropertyKey(organizationId)

  return html
    .replace(
      /\{\{\{FIRST_NAME\|([^}]*)\}\}\}/g,
      (_match, fallback: string) =>
        `{{{contact.${firstNameKey}|${fallback}}}}`
    )
    .replace(
      /\{\{\{FIRST_NAME\}\}\}/g,
      `{{{contact.${firstNameKey}}}}`
    )
    .replace(
      /\{\{\{LAST_NAME\|([^}]*)\}\}\}/g,
      (_match, fallback: string) =>
        `{{{contact.${lastNameKey}|${fallback}}}}`
    )
    .replace(/\{\{\{LAST_NAME\}\}\}/g, `{{{contact.${lastNameKey}}}}`)
    .replace(
      /\{\{\{EMAIL\|([^}]*)\}\}\}/g,
      (_match, fallback: string) => `{{{contact.email|${fallback}}}}`
    )
    .replace(/\{\{\{EMAIL\}\}\}/g, "{{{contact.email}}}")
}
