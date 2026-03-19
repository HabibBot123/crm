import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail } from '@/lib/email/workflows/send-welcome-email'
import { NextResponse } from 'next/server'

const SIGNUP_SOURCES = ['coach', 'coached'] as const
type SignupSource = (typeof SIGNUP_SOURCES)[number]

function isSignupSource(value: string | null): value is SignupSource {
  return value !== null && SIGNUP_SOURCES.includes(value as SignupSource)
}

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
  const signupSourceParam = searchParams.get('signup_source')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user?.email) {
      const admin = createAdminClient()
      const email = data.user.email.toLowerCase()
      const userId = data.user.id
      const fullName = data.user.user_metadata?.full_name ?? null

      if (isSignupSource(signupSourceParam)) {
        const { error: upsertError } = await admin.from('users').upsert(
          {
            id: userId,
            email,
            full_name: fullName,
            signup_source: signupSourceParam,
          },
          { onConflict: 'id' }
        )
        if (upsertError) {
          console.error('Users signup_source upsert failed:', upsertError.message)
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
