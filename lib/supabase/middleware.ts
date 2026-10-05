import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/coached-login' ||
    pathname === '/coached-signup' ||
    pathname === '/coached-landing' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/invite/')
  )
}

function requiresCoachSession(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
}

function requiresCoachedSession(pathname: string): boolean {
  if (pathname === '/coached-landing' || pathname === '/coached-login' || pathname === '/coached-signup') {
    return false
  }
  return pathname === '/coached' || pathname.startsWith('/coached/')
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
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
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!user && !isPublicAuthPath(pathname)) {
    if (requiresCoachSession(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      const redirect = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value)
      })
      return redirect
    }

    if (requiresCoachedSession(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/coached-login'
      url.searchParams.set('next', pathname)
      const redirect = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value)
      })
      return redirect
    }
  }

  return response
}
