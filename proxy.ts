import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import {
  buildAppHubOrigin,
  isLocalDevHost,
  parseCoachedHost,
  requestPublicUrl,
} from "@/lib/coached-host"

function isMemberPath(pathname: string): boolean {
  return (
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/courses" ||
    pathname.startsWith("/courses/") ||
    pathname === "/coaching" ||
    pathname.startsWith("/coaching/") ||
    pathname === "/s" ||
    pathname.startsWith("/s/") ||
    pathname === "/members" ||
    pathname.startsWith("/members/") ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  )
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? ""
  const pathname = request.nextUrl.pathname
  const hostCtx = parseCoachedHost(host)
  const local = isLocalDevHost(host)
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "")

  // OAuth / magic-link on Site URL root
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    return NextResponse.redirect(
      requestPublicUrl(request, "/auth/callback", request.nextUrl.search)
    )
  }

  // Member pages: only cross-host redirect in prod
  if (
    isMemberPath(pathname) &&
    !local &&
    hostCtx.kind !== "app-hub" &&
    hostCtx.kind !== "app-org"
  ) {
    const targetOrigin = buildAppHubOrigin({
      protocol: proto,
      currentHost: host,
    })
    return NextResponse.redirect(
      `${targetOrigin}${pathname}${request.nextUrl.search}`
    )
  }

  if (hostCtx.kind === "app-org") {
    if (pathname === "/") {
      return NextResponse.redirect(requestPublicUrl(request, "/home"))
    }
    return await updateSession(request)
  }

  if (hostCtx.kind === "app-hub") {
    if (pathname === "/" && !local) {
      const url = request.nextUrl.clone()
      url.pathname = "/coached-landing"
      return NextResponse.rewrite(url)
    }
    return await updateSession(request)
  }

  if (hostCtx.kind === "store") {
    if (pathname === "/") {
      const url = request.nextUrl.clone()
      url.pathname = `/org/${hostCtx.orgSlug}`
      return NextResponse.rewrite(url)
    }
    const buyMatch = pathname.match(/^\/buy\/([^/]+)\/?$/)
    if (buyMatch) {
      const offerId = buyMatch[1]
      const url = request.nextUrl.clone()
      url.pathname = `/org/${hostCtx.orgSlug}/buy/${offerId}`
      return NextResponse.rewrite(url)
    }
  }

  if (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/inngest")
  ) {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
