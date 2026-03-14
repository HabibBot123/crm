"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"
import { useCoached } from "@/hooks/use-coached"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || "?"
}

export default function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const orgId = Number(id)
  const { coachedOrgs, coachedProducts, isLoading } = useCoached()

  const org = coachedOrgs.find((o) => o.organization_id === orgId)
  const coachProducts = org
    ? coachedProducts.filter((p) => p.organization_id === orgId)
    : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">Coach not found</p>
        <Link href="/coached/coaches">
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
        <Link href="/coached/coaches">
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
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {orgInitials(org.organization_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{org.organization_name}</h2>
                  <Badge className="bg-primary/10 text-primary border-primary/20">With you</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{org.organization_slug}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programs by this coach */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Programs you have access to
        </h3>
        {coachProducts.length > 0 ? (
          <div className="space-y-2">
            {coachProducts.map((p) => (
              <Link key={p.product_id} href={`/coached/${org.organization_slug}/courses/${p.product_id}`}>
                <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                      {p.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{p.product_title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.product_type}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                      {p.product_type}
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
