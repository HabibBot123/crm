/**
 * Host parsing for coached / store surfaces (docs/04).
 *
 * Prod:
 * - `{slug}.coachstack.co` → store
 * - `app.coachstack.co` → hub
 * - `{slug}.app.coachstack.co` → member app
 *
 * Local:
 * - Coach / dashboard → `localhost:3000`
 * - Hub membre → `app.lvh.me:3000`
 * - Org membre → `{slug}.app.lvh.me:3000`
 * - Auth cookies: `Domain=.lvh.me` on `*.lvh.me`
 */

export type CoachedHostContext =
  | { kind: "unknown" }
  | { kind: "apex" }
  | { kind: "app-hub" }
  | { kind: "app-org"; orgSlug: string }
  | { kind: "store"; orgSlug: string }

/** Local member root (resolves to 127.0.0.1, supports Domain cookies). */
export const LOCAL_APP_ROOT = "lvh.me"

const RESERVED = new Set(["www", "dashboard", "api", "admin", "lvh"])

function hostnameParts(host: string): string[] {
  const hostname = host.split(":")[0]?.toLowerCase() ?? ""
  return hostname.replace(/^www\./, "").split(".").filter(Boolean)
}

export function isLocalDevHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? ""
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === LOCAL_APP_ROOT ||
    hostname.endsWith(`.${LOCAL_APP_ROOT}`)
  )
}

/** True for `app.*` and `{slug}.app.*` (member auth / shell). Not plain localhost. */
export function isMemberAppHost(host: string): boolean {
  const parts = hostnameParts(host)
  if (parts[0] === "app") return true
  if (parts.length >= 2 && parts[1] === "app") return true
  return false
}

/**
 * Cookie Domain so Auth session is shared across member subdomains.
 * - `app.lvh.me` ↔ `{slug}.app.lvh.me` → `.lvh.me`
 * - plain `localhost` → undefined (coach dashboard, host-only)
 * - prod shared domain (`.coachstack.co`) not enabled yet
 */
export function authCookieDomain(host: string): string | undefined {
  const hostname = host.split(":")[0]?.toLowerCase() ?? ""
  if (hostname === LOCAL_APP_ROOT || hostname.endsWith(`.${LOCAL_APP_ROOT}`)) {
    return `.${LOCAL_APP_ROOT}`
  }
  return undefined
}

export function parseCoachedHost(host: string): CoachedHostContext {
  const parts = hostnameParts(host)
  if (parts.length === 0) return { kind: "unknown" }

  // Plain localhost / 127.0.0.1 → coach apex (not member hub)
  if (
    parts[0] === "localhost" ||
    (parts.length === 1 && parts[0] === "127.0.0.1")
  ) {
    return { kind: "apex" }
  }

  if (
    parts.length === 2 &&
    parts[0] === "lvh" &&
    parts[1] === "me"
  ) {
    return { kind: "app-hub" }
  }

  // app.lvh.me | app.coachstack.co
  if (parts[0] === "app") {
    return { kind: "app-hub" }
  }

  // {slug}.app.* → member app
  if (parts.length >= 2 && parts[1] === "app") {
    const orgSlug = parts[0]
    if (!orgSlug || RESERVED.has(orgSlug)) return { kind: "unknown" }
    return { kind: "app-org", orgSlug }
  }

  // {slug}.localhost | {slug}.coachstack.co | {slug}.lvh.me → store
  if (parts.length >= 2 && !RESERVED.has(parts[0])) {
    return { kind: "store", orgSlug: parts[0] }
  }

  return { kind: "unknown" }
}

/** Same-origin URL for an org app (local) or `{slug}.app.*` (prod). */
export function buildOrgAppOrigin(args: {
  orgSlug: string
  protocol: string
  currentHost: string
}): string {
  const { orgSlug, protocol, currentHost } = args
  const [hostname, ...portParts] = currentHost.split(":")
  const port = portParts.length ? `:${portParts.join(":")}` : ""
  const parts = hostnameParts(hostname)
  const proto = protocol.replace(/:$/, "")

  if (isLocalDevHost(currentHost)) {
    return `${proto}://${orgSlug}.app.${LOCAL_APP_ROOT}${port}`
  }

  if (parts.length >= 2 && parts[1] === "app") {
    const rest = parts.slice(1).join(".")
    return `${proto}://${orgSlug}.${rest}${port}`
  }

  if (parts[0] === "app") {
    const rest = parts.join(".")
    return `${proto}://${orgSlug}.${rest}${port}`
  }

  const root =
    parts.length >= 2 ? parts.slice(-2).join(".") : parts.join(".")
  return `${proto}://${orgSlug}.app.${root}${port}`
}

export function buildAppHubOrigin(args: {
  protocol: string
  currentHost: string
}): string {
  const { protocol, currentHost } = args
  const [hostname, ...portParts] = currentHost.split(":")
  const port = portParts.length ? `:${portParts.join(":")}` : ""
  const parts = hostnameParts(hostname)
  const proto = protocol.replace(/:$/, "")

  if (isLocalDevHost(currentHost)) {
    return `${proto}://app.${LOCAL_APP_ROOT}${port}`
  }

  if (parts[0] === "app") {
    return `${proto}://${parts.join(".")}${port}`
  }
  if (parts.length >= 2 && parts[1] === "app") {
    return `${proto}://app.${parts.slice(2).join(".")}${port}`
  }
  const root =
    parts.length >= 2 ? parts.slice(-2).join(".") : parts.join(".")
  return `${proto}://app.${root}${port}`
}

/**
 * Public origin for redirects. Next `request.url` / `nextUrl` often stay on
 * `localhost` even when the browser Host is `app.lvh.me` (or a prod subdomain).
 */
export function requestPublicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host =
    (forwardedHost ? forwardedHost.split(",")[0]?.trim() : null) ||
    request.headers.get("host") ||
    ""
  if (!host) {
    return new URL(request.url).origin
  }
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const proto =
    (forwardedProto ? forwardedProto.split(",")[0]?.trim() : null) ||
    (isLocalDevHost(host) ? "http" : "https")
  return `${proto}://${host}`
}

/** Clone path/search onto the public Host (fixes localhost redirects in proxy). */
export function requestPublicUrl(
  request: Request,
  pathname?: string,
  search?: string
): URL {
  const origin = requestPublicOrigin(request)
  const current = new URL(request.url)
  const path = pathname ?? current.pathname
  const query = search ?? current.search
  return new URL(`${path}${query}`, origin)
}
