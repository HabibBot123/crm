import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authCookieDomain, requestPublicUrl } from '@/lib/coached-host'

function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/coached-landing' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/invite/')
  )
}

function requiresCoachSession(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
}

const MEMBER_PREFIXES = [
  '/home',
  '/courses',
  '/coaching',
  '/s',
  '/members',
  '/messages',
  '/profile',
]

function requiresCoachedSession(pathname: string): boolean {
  if (pathname === '/coached-landing') return false
  return MEMBER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const host = request.headers.get('host') ?? ''
  const domain = authCookieDomain(host)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(
              name,
              value,
              domain ? { ...options, domain } : options
            )
          )
        },
      },
      ...(domain
        ? {
            cookieOptions: {
              domain,
              path: '/',
              sameSite: 'lax' as const,
            },
          }
        : {}),
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!user && !isPublicAuthPath(pathname)) {
    if (requiresCoachSession(pathname) || requiresCoachedSession(pathname)) {
      const loginUrl = requestPublicUrl(request, '/login')
      loginUrl.searchParams.set('next', pathname)
      const redirect = NextResponse.redirect(loginUrl)
      response.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(
          cookie.name,
          cookie.value,
          domain ? { domain } : undefined
        )
      })
      return redirect
    }
  }

  return response
}
