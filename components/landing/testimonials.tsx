import { Star } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const testimonials = [
  { name: "Sarah Johnson", role: "Fitness Coach", text: "CoachPro transformed my business. I went from managing everything in spreadsheets to having a professional platform overnight. My clients love the experience.", avatar: "SJ" },
  { name: "Michael Chen", role: "Executive Coach", text: "The multi-tenant workspace feature is a game-changer. I manage three different coaching brands from one account. Revenue is up 40% since switching.", avatar: "MC" },
  { name: "Emily Davis", role: "Wellness Coach", text: "Finally, a platform that understands coaches. The content builder is intuitive, and the client management tools save me hours every week.", avatar: "ED" },
  { name: "James Wilson", role: "Business Coach", text: "I've tried Kajabi, Teachable, and Thinkific. CoachPro is the only platform that truly feels like it was built for coaching businesses.", avatar: "JW" },
  { name: "Lisa Park", role: "Life Coach", text: "The PWA app is incredible. My students can access their courses on mobile like a native app. It's been a huge selling point.", avatar: "LP" },
  { name: "David Brown", role: "Health Coach", text: "From zero to $10K/month in 3 months using CoachPro. The sales pages convert really well and the analytics help me optimize.", avatar: "DB" },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Testimonials</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground font-display sm:text-4xl">
            Trusted by 2,000+ coaches worldwide
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground">{t.text}</p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {t.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
