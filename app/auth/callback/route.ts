import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Allow only relative paths to prevent open redirect. */
function safeNext(next: string | null): string {
  if (!next || typeof next !== 'string') return '/create-organization'
  const path = next.startsWith('/') ? next : `/${next}`
  if (path.startsWith('//') || path.startsWith('/http')) return '/create-organization'
  return path
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
