"use client"

import { use, useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, User } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCoachedCourseDetails,
  fetchLessonProgress,
  markLessonComplete as markLessonCompleteService,
} from "@/lib/services/coached"
import type { CoachedCourseModule, CoachedCourseModuleItem } from "@/lib/services/coached"
import { Button } from "@/components/ui/button"
import { CourseSidebar } from "@/components/coached/course-player/course-sidebar"
import { ContentViewer } from "@/components/coached/course-player/content-viewer"
import { LessonNav } from "@/components/coached/course-player/lesson-nav"
import { CourseProgressBar } from "@/components/coached/course-player/course-progress-bar"

function flattenLessons(modules: CoachedCourseModule[]): { moduleId: number; item: CoachedCourseModuleItem }[] {
  return modules.flatMap((mod) =>
    mod.product_module_items.map((item) => ({ moduleId: mod.id, item }))
  )
}

export default function CoursePlayerPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = use(params)
  const productId = Number(id)
  const { supabase, user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()

  const courseQuery = useQuery({
    queryKey: ["coached-course", userId, productId],
    queryFn: () => {
      if (!userId || !productId) throw new Error("Cannot fetch course without user id and product id")
      return fetchCoachedCourseDetails(supabase, userId, productId)
    },
    enabled: !!userId && !!productId,
  })

  const enrollmentProductId = courseQuery.data?.enrollment_product_id ?? null

  const progressQuery = useQuery({
    queryKey: ["coached-course-progress", userId, enrollmentProductId],
    queryFn: () => {
      if (!userId || enrollmentProductId == null) throw new Error("Cannot fetch progress without user id and enrollment product id")
      return fetchLessonProgress(supabase, userId, enrollmentProductId)
    },
    enabled: !!userId && enrollmentProductId != null,
  })

  const markCompleteMutation = useMutation({
    mutationFn: (productModuleItemId: number) => {
      if (!userId || enrollmentProductId == null) throw new Error("Cannot mark complete without user id and enrollment product id")
      return markLessonCompleteService(supabase, userId, enrollmentProductId, productModuleItemId)
    },
    onSuccess: (_, productModuleItemId) => {
      queryClient.setQueryData<Set<number>>(
        ["coached-course-progress", userId, enrollmentProductId],
        (prev) => (prev ? new Set([...prev, productModuleItemId]) : new Set([productModuleItemId]))
      )
    },
  })

  const course = courseQuery.data ?? null
  const progress = progressQuery.data ?? new Set<number>()
  const isLoading = courseQuery.isLoading || progressQuery.isLoading
  const slugMatches = slug != null && course != null && course.organization_slug === slug

  const markComplete = (productModuleItemId: number) => {
    if (enrollmentProductId == null) return
    markCompleteMutation.mutate(productModuleItemId)
  }
  const markCompletePending = markCompleteMutation.isPending

  const allLessons = useMemo(
    () => (course ? flattenLessons(course.product_modules) : []),
    [course]
  )
  const totalLessons = allLessons.length
  const completedCount = useMemo(
    () => allLessons.filter((l) => progress.has(l.item.id)).length,
    [allLessons, progress]
  )

  const [activeModuleId, setActiveModuleId] = useState<number | null>(null)
  const [activeItemId, setActiveItemId] = useState<number | null>(null)

  useEffect(() => {
    if (!course || allLessons.length === 0) return
    if (activeItemId != null && allLessons.some((l) => l.item.id === activeItemId)) return
    const firstIncomplete = allLessons.find((l) => !progress.has(l.item.id))
    const first = firstIncomplete ?? allLessons[0]
    if (first) {
      setActiveModuleId(first.moduleId)
      setActiveItemId(first.item.id)
    }
  }, [course, allLessons, progress, activeItemId])

  const currentIndex = useMemo(
    () => allLessons.findIndex((l) => l.item.id === activeItemId),
    [allLessons, activeItemId]
  )
  const currentLesson = currentIndex >= 0 ? allLessons[currentIndex] : null
  const activeContent = currentLesson?.item.content_items ?? null
  const isCompleted = activeItemId != null && progress.has(activeItemId)

  const goToPrevious = () => {
    if (currentIndex <= 0) return
    const prev = allLessons[currentIndex - 1]
    setActiveModuleId(prev.moduleId)
    setActiveItemId(prev.item.id)
  }

  const goToNext = () => {
    if (currentIndex < 0 || currentIndex >= allLessons.length - 1) return
    const next = allLessons[currentIndex + 1]
    setActiveModuleId(next.moduleId)
    setActiveItemId(next.item.id)
  }

  const handleMarkComplete = () => {
    if (activeItemId == null) return
    markComplete(activeItemId)
  }

  const handleVideoEnded = () => {
    if (activeItemId == null) return
    markComplete(activeItemId)
  }

  if (isLoading) {
    return (
      <div className="-mx-4 -mt-6 md:mx-0 md:mt-0 lg:-mx-8 lg:-mt-8 lg:-mb-8 xl:-mx-10">
        <div className="h-14 animate-pulse rounded-t-xl bg-muted" />
        <div className="flex min-h-[300px] items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (!course || !slugMatches) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">
          Program not found or you don&apos;t have access
        </p>
        <Link href="/coached/courses">
          <Button variant="outline" className="mt-4">
            Back to programs
          </Button>
        </Link>
      </div>
    )
  }

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < allLessons.length - 1

  return (
    <div className="-mx-4 -mt-6 flex min-h-0 flex-col md:flex-row md:mx-0 md:mt-0 lg:-mx-8 lg:-mt-8 lg:-mb-8 lg:min-h-[calc(100vh-2rem)] xl:-mx-10">
      <CourseSidebar
        modules={course.product_modules}
        progress={progress}
        activeModuleId={activeModuleId}
        activeItemId={activeItemId}
        onSelectLesson={(moduleId, itemId) => {
          setActiveModuleId(moduleId)
          setActiveItemId(itemId)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden border-x border-b border-border bg-card">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border bg-card px-5 py-4 md:px-4 md:border md:py-3 md:gap-2 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] md:pl-[max(1rem,env(safe-area-inset-left))] md:pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-3">
            <Link href="/coached/courses">
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 min-h-[44px] min-w-[44px] touch-manipulation -ml-1">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground line-clamp-1">
                {course.product_title}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">with {course.organization_name}</span>
              </p>
            </div>
          </div>
          <CourseProgressBar
            completed={completedCount}
            total={totalLessons}
            className="w-full"
          />
        </div>

        {/* Content area — extra bottom padding so last content isn't hidden by sticky nav */}
        <div className="flex-1 min-h-0 overflow-auto overflow-x-hidden p-5 pb-12 md:p-4 md:pb-4 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] md:pl-[max(1rem,env(safe-area-inset-left))] md:pr-[max(1rem,env(safe-area-inset-right))]">
          {activeContent ? (
            <ContentViewer
              content={activeContent}
              onVideoEnded={handleVideoEnded}
              className="mt-1 w-full"
            />
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-6 sm:p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {totalLessons === 0
                  ? "No lessons in this program yet."
                  : "Select a lesson from the contents."}
              </p>
            </div>
          )}
        </div>

        {/* Lesson nav — sticky bottom, touch-friendly */}
        {activeContent && (
          <div className="shrink-0 bg-card/95 px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:py-4 md:pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] md:pl-6 md:pr-6">
            <LessonNav
              onPrevious={goToPrevious}
              onNext={goToNext}
              onMarkComplete={handleMarkComplete}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              isCompleted={isCompleted}
              markCompletePending={markCompletePending}
            />
          </div>
        )}
      </div>
    </div>
  )
}
