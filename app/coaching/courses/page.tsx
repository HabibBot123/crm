"use client"

import Link from "next/link"
import { BookOpen, Star, Clock, Users } from "lucide-react"
import { products, coaches, currentClientCoachIds } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const enrolledCourseIds = ["1", "2", "3"]

const completionData: Record<string, number> = {
  "1": 30,
  "2": 75,
  "3": 10,
}

const typeIcons = {
  course: BookOpen,
  ebook: BookOpen,
  coaching: Star,
}

function getCoachForProduct(productId: string) {
  return coaches.find((c) => c.productIds.includes(productId))
}

function CourseCard({
  course,
  isEnrolled,
}: {
  course: (typeof products)[0]
  isEnrolled: boolean
}) {
  const progress = completionData[course.id] || 0
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const Icon = typeIcons[course.type]
  const coach = getCoachForProduct(course.id)

  return (
    <Link
      href={isEnrolled ? `/coaching/courses/${course.id}` : `/c/fitpro/${course.id}`}
    >
      <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{course.title}</p>
              {coach && (
                <p className="text-xs text-muted-foreground mt-0.5">with {coach.name}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {course.type}
                </Badge>
                {totalLessons > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {totalLessons} lessons
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {course.studentsCount} students
                </span>
                {course.rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {course.rating}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isEnrolled && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{progress}% complete</span>
                {progress === 100 && (
                  <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                    Completed
                  </Badge>
                )}
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
          {!isEnrolled && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-foreground">
                {course.price === 0 ? "Free" : `$${course.price}`}
              </span>
              <Badge variant="outline" className="text-xs">Not enrolled</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export default function CoachingCoursesPage() {
  const myCoachIds = currentClientCoachIds
  const myProductIds = Array.from(
    new Set(coaches.filter((c) => myCoachIds.includes(c.id)).flatMap((c) => c.productIds))
  )
  const myCoachProducts = products.filter(
    (p) => p.status === "published" && myProductIds.includes(p.id)
  )
  const enrolled = myCoachProducts.filter((p) => enrolledCourseIds.includes(p.id))
  const available = myCoachProducts.filter((p) => !enrolledCourseIds.includes(p.id))

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground font-display">My Programs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Programs from your coaches — track progress and discover more
      </p>

      <Tabs defaultValue="enrolled" className="mt-6">
        <TabsList>
          <TabsTrigger value="enrolled">Enrolled ({enrolled.length})</TabsTrigger>
          <TabsTrigger value="browse">From my coaches ({available.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="mt-4 space-y-3">
          {enrolled.map((course) => (
            <CourseCard key={course.id} course={course} isEnrolled={true} />
          ))}
          {enrolled.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">No programs yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Connect with coaches to access their programs
              </p>
              <Link href="/coaching/coaches">
                <span className="text-xs font-medium text-primary hover:underline">
                  Go to Coaches
                </span>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="mt-4 space-y-3">
          {available.map((course) => (
            <CourseCard key={course.id} course={course} isEnrolled={false} />
          ))}
          {available.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No other programs from your coaches right now
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
