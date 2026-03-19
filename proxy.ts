import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const RESERVED_SUBDOMAINS = ["www", "dashboard", "api", "admin"]

function getSubdomain(host: string): string | null {
  const parts = host.split(".")
  if (parts.length < 2) return null

  const [subdomainWithPort, ...rest] = parts
  const subdomain = subdomainWithPort?.split(":")[0]?.toLowerCase() ?? ""
  if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain)) return null

  const base = rest.join(".").toLowerCase()

  // Local dev: slug.localhost or slug.localhost:3000
  if (base === "localhost") return subdomain

  // Production: slug.domain.tld or slug.app.domain.tld — accept any multi-part base
  if (rest.length >= 1) return subdomain

  return null
}

const COACHED_PATHS_PREFIX = "/coached"
const COACHED_PATHS_EXACT = ["/coached-landing", "/coached-login", "/coached-signup", "/coached"]

function isCoachedPath(pathname: string): boolean {
  if (COACHED_PATHS_EXACT.includes(pathname)) return true
  return pathname === COACHED_PATHS_PREFIX || pathname.startsWith(COACHED_PATHS_PREFIX + "/")
}

function buildAppHost(host: string, subdomain: string | null): string {
  const [hostname, ...portParts] = host.split(":")
  const port = portParts.length ? ":" + portParts.join(":") : ""
  const base = hostname.replace(/^www\./, "")
  return "app." + base + port
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? ""
  const pathname = request.nextUrl.pathname
  const subdomain = getSubdomain(host)

  // Coached pages are only served on app.* — redirect from main domain to app subdomain
  if (subdomain !== "app" && isCoachedPath(pathname)) {
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")
    const appHost = buildAppHost(host, subdomain)
    const url = request.nextUrl.clone()
    url.protocol = proto === "https" ? "https:" : "http:"
    url.host = appHost
    return NextResponse.redirect(url.toString())
  }

  // Special subdomain for coached clients: app.* → coached landing
  if (subdomain === "app" && pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/coached-landing"
    return NextResponse.rewrite(url)
  }

  // Public org page for other slugs: slug.domain.tld → /org/[slug]
  if (subdomain && pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = `/org/${subdomain}`
    return NextResponse.rewrite(url)
  }

  // slug.myapp.com/buy/[offerId] → rewrite to /org/[slug]/buy/[offerId] (URL stays /buy/id)
  const buyMatch = subdomain && pathname.match(/^\/buy\/([^/]+)\/?$/)
  if (buyMatch) {
    const offerId = buyMatch[1]
    const url = request.nextUrl.clone()
    url.pathname = `/org/${subdomain}/buy/${offerId}`
    return NextResponse.rewrite(url)
  }

  // Default: keep existing Supabase session middleware for the app
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
