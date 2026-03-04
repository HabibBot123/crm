"use client"

import Link from "next/link"
import { Star, Check, Play, BookOpen, Clock, Users, Shield, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { products, testimonials } from "@/lib/mock-data"

const curriculum = products[0].modules

export default function ProductSalesPage() {
  const product = products[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">FP</span>
            <span className="text-sm font-semibold text-foreground">FitPro Academy</span>
          </div>
          <Link href="/checkout">
            <Button size="sm">Enroll Now</Button>
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge variant="secondary" className="mb-4">Best Seller</Badge>
                <h1 className="text-3xl font-bold tracking-tight text-foreground font-display sm:text-4xl lg:text-5xl">
                  {product.title}
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <strong className="text-foreground">{product.rating}</strong> (128 reviews)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {product.studentsCount} students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    12 weeks
                  </span>
                </div>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground font-display">${product.price}</span>
                  <span className="text-lg text-muted-foreground line-through">$497</span>
                  <Badge className="bg-success text-success-foreground ml-2">40% OFF</Badge>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/checkout">
                    <Button size="lg" className="gap-2 px-8">
                      Enroll Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> 30-day guarantee</span>
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Lifetime access</span>
                </div>
              </div>
              <div className="aspect-video overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex h-full items-center justify-center bg-muted/50">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Play className="h-7 w-7 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Watch Preview</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold text-foreground font-display">What you will learn</h2>
            <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
              {[
                "Build a sustainable fitness routine",
                "Master nutrition fundamentals",
                "Track and measure progress effectively",
                "Develop a growth mindset",
                "Advanced HIIT and strength training",
                "Create a long-term maintenance plan",
              ].map((b) => (
                <div key={b} className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span className="text-sm text-foreground">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold text-foreground font-display">Curriculum</h2>
            <p className="mt-2 text-center text-muted-foreground">
              4 modules, 10 lessons, 12 weeks of transformative content
            </p>
            <div className="mx-auto mt-10 max-w-3xl space-y-4">
              {curriculum.map((mod) => (
                <div key={mod.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h3 className="text-sm font-semibold text-foreground">{mod.title}</h3>
                    <span className="text-xs text-muted-foreground">{mod.lessons.length} lessons</span>
                  </div>
                  <div className="divide-y divide-border">
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                        {lesson.type === "video" ? (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="flex-1 text-sm text-foreground">{lesson.title}</span>
                        {lesson.duration && (
                          <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold text-foreground font-display">What students say</h2>
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
              {testimonials.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{t.text}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{t.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="text-3xl font-bold text-foreground font-display">Ready to transform?</h2>
            <p className="mt-4 text-muted-foreground">
              Join {product.studentsCount}+ students already enrolled. Start your journey today.
            </p>
            <div className="mt-8">
              <Link href="/checkout">
                <Button size="lg" className="gap-2 px-10">
                  Enroll for ${product.price}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
