import Link from "next/link"

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "Changelog"],
  Resources: ["Documentation", "Blog", "Community", "Templates"],
  Company: ["About", "Careers", "Contact", "Press"],
  Legal: ["Privacy", "Terms", "Security"],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                C
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground font-display">CoachStack</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The all-in-one platform for modern coaches.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground">{category}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            2026 CoachStack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
