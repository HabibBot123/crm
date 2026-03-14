export default function CoachedLandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex h-full max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              C
            </span>
            <span className="text-lg font-bold text-foreground font-display">
              CoachPro
            </span>
          </div>
        </header>

        <section className="mt-14 flex flex-1 flex-col gap-10 lg:mt-20 lg:flex-row lg:items-center">
          <div className="max-w-xl space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display sm:text-4xl">
              Your coaching space,
              <span className="block text-primary">just for clients.</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
              This is where you&apos;ll find the programs, sessions, and resources
              shared by your coach. Sign in with the email you used at checkout to
              access your content.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/coached-login"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Sign in to coaching
              </a>
              <a
                href="/coached-signup"
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
              >
                Create a student account
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              If your coach invited you or you purchased a program, use the same email
              address to automatically unlock your access.
            </p>
          </div>

          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What you&apos;ll find here
              </p>
              <ul className="mt-4 space-y-3 text-sm text-foreground">
                <li className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Programs, videos, and resources shared by your coach
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  Your progress across courses and modules
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  A single login for all your coaches using CoachPro
                </li>
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">
                Payments are handled securely by Stripe. Your data stays private
                between you and your coach.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

