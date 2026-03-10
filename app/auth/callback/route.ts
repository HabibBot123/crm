import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user?.email) {
      // Reconcile any pending enrollments (buyer paid before having an account).
      // Uses admin client to bypass RLS — safe because we only update rows where
      // buyer_email matches the just-authenticated user's own email.
      // This is a no-op if no unmatched rows exist (e.g. returning user sign-in).
      const admin = createAdminClient()
      const email = data.user.email.toLowerCase()
      const { error: reconcileError } = await admin
        .from('enrollments')
        .update({ user_id: data.user.id })
        .is('user_id', null)
        .eq('buyer_email', email)

      if (reconcileError) {
        // Non-fatal — log and continue. The user is still authenticated.
        console.error('Enrollment reconciliation failed:', reconcileError.message)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
