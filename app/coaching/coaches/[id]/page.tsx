"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Star, BookOpen, CheckCircle2 } from "lucide-react"
import { coaches, currentClientCoachIds, products } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const coach = coaches.find((c) => c.id === id)
  const isSubscribed = coach ? currentClientCoachIds.includes(coach.id) : false
  const coachProducts = coach
    ? products.filter((p) => coach.productIds.includes(p.id) && p.status === "published")
    : []

  if (!coach) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">Coach not found</p>
        <Link href="/coaching/coaches">
          <Button variant="outline" className="mt-4">
            Back to coaches
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coaching/coaches">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground font-display truncate">Coach profile</h1>
      </div>

      {/* Coach card */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-muted/50 px-4 py-6 md:px-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Avatar className="h-20 w-20 shrink-0 border-4 border-background shadow-sm">
                <AvatarFallback
                  className={isSubscribed ? "bg-primary/10 text-primary text-2xl font-bold" : "bg-muted text-muted-foreground text-xl"}
                >
                  {coach.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{coach.name}</h2>
                  {isSubscribed ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">With you</Badge>
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{coach.title}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {coach.rating}
                  </span>
                  <span>{coach.clientsCount} clients</span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-4 md:px-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{coach.bio}</p>
            {!isSubscribed && (
              <Button className="mt-4 w-full sm:w-auto gap-2" size="sm">
                <CheckCircle2 className="h-4 w-4" />
                Request to work with this coach
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Programs by this coach */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Programs by {coach.name.split(" ")[0]}
        </h3>
        {coachProducts.length > 0 ? (
          <div className="space-y-2">
            {coachProducts.map((product) => (
              <Link key={product.id} href={`/coaching/courses/${product.id}`}>
                <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.type} · {product.studentsCount} students
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                      {product.type}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No programs listed yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
