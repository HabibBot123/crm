import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email/workflows/send-welcome-email'
import { requestPublicOrigin } from '@/lib/coached-host'
import { NextResponse } from 'next/server'

type SignupSource = 'coach' | 'coached'

function isSignupSource(value: string | null): value is SignupSource {
  return value === 'coach' || value === 'coached'
}

/** Allow only relative paths to prevent open redirect. */
function safeNext(next: string | null): string {
  if (!next || typeof next !== 'string') return '/create-organization'
  const path = next.startsWith('/') ? next : `/${next}`
  if (path.startsWith('//') || path.startsWith('/http')) return '/create-organization'
  return path
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = requestPublicOrigin(request)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))
  const signupSourceParam = searchParams.get('signup_source')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('auth/callback exchangeCodeForSession:', error.message)
    }

    if (!error && data.user?.email) {
      const admin = createAdminClient()
      const email = data.user.email.toLowerCase()
      const userId = data.user.id
      const fullName = data.user.user_metadata?.full_name ?? null

      if (isSignupSource(signupSourceParam)) {
        const { error: upsertError } = await admin.from('profiles').upsert(
          {
            user_id: userId,
            full_name: fullName,
            signup_source: signupSourceParam,
          },
          { onConflict: 'user_id' }
        )
        if (upsertError) {
          console.error('Profiles signup_source upsert failed:', upsertError.message)
        }
        const { error: emailError } = await sendWelcomeEmail({
          to: email,
          signupSource: signupSourceParam,
          fullName,
        })
        if (emailError) {
          console.error('Welcome email failed:', emailError.message)
        }
      }

      const { error: linkError } = await admin.rpc('link_guest_purchases_to_user', {
        p_user_id: userId,
        p_email: email,
      })

      if (linkError) {
        console.error('Link guest purchases to user failed:', linkError.message)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  } else {
    console.error('auth/callback: missing code (likely Site URL fallback / redirect not allowlisted)')
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_error&next=${encodeURIComponent(next)}`
  )
}
