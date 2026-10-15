import { createBrowserClient } from '@supabase/ssr'
import { authCookieDomain } from '@/lib/coached-host'

export function createClient() {
  const domain =
    typeof window !== 'undefined'
      ? authCookieDomain(window.location.host)
      : undefined

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain
      ? {
          cookieOptions: {
            domain,
            path: '/',
            sameSite: 'lax',
          },
        }
      : undefined
  )
}
