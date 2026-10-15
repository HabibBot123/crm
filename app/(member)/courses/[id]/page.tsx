"use client"

import { use, useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen, List } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { useCoachedHost } from "@/hooks/use-coached-host"
import {
  fetchCoachedCourseDetails,
  fetchLessonProgress,
  markLessonComplete as markLessonCompleteService,
  type CoachedCourseModule,
  type CoachedCourseModuleItem,
  type CoachedProduct,
} from "@/lib/services/coached"
import { Button } from "@/components/ui/button"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { CourseSidebar } from "@/components/coached/course-player/course-sidebar"
import { ContentViewer } from "@/components/coached/course-player/content-viewer"
import { LessonNav } from "@/components/coached/course-player/lesson-nav"
import { CourseProgressBar } from "@/components/coached/course-player/course-progress-bar"

function flattenLessons(
  modules: CoachedCourseModule[]
): { moduleId: number; item: CoachedCourseModuleItem }[] {
  return modules.flatMap((mod) =>
    mod.product_module_items.map((item) => ({ moduleId: mod.id, item }))
  )
}

function activeLessonTitle(
  lesson: { item: CoachedCourseModuleItem } | null
): string | null {
  if (!lesson) return null
  return (
    lesson.item.title?.trim() ||
    lesson.item.content_items?.name?.trim() ||
    null
  )
}

export default function CoursePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const enrollmentProductId = Number(id)
  const { supabase, user } = useAuth()
  const { orgSlug } = useCoachedHost()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const [contentsOpen, setContentsOpen] = useState(false)

  const courseQuery = useQuery({
    queryKey: ["coached-course", userId, enrollmentProductId],
    queryFn: () => {
      if (!userId || !enrollmentProductId) {
        throw new Error(
          "Cannot fetch course without user id and enrollment product id"
        )
      }
      return fetchCoachedCourseDetails(supabase, userId, enrollmentProductId)
    },
    enabled: !!userId && !!enrollmentProductId,
  })

  const progressQuery = useQuery({
    queryKey: ["coached-course-progress", userId, enrollmentProductId],
    queryFn: () => {
      if (!userId || !enrollmentProductId) {
        throw new Error(
          "Cannot fetch progress without user id and enrollment product id"
        )
      }
      return fetchLessonProgress(supabase, userId, enrollmentProductId)
    },
    enabled: !!userId && !!enrollmentProductId && !!courseQuery.data,
  })

  const markCompleteMutation = useMutation({
    mutationFn: (productModuleItemId: number) => {
      if (!userId || !enrollmentProductId) {
        throw new Error(
          "Cannot mark complete without user id and enrollment product id"
        )
      }
      return markLessonCompleteService(
        supabase,
        userId,
        enrollmentProductId,
        productModuleItemId
      )
    },
    onSuccess: (_, productModuleItemId) => {
      const prevProgress = queryClient.getQueryData<Set<number>>([
        "coached-course-progress",
        userId,
        enrollmentProductId,
      ])
      const wasAlreadyComplete = prevProgress?.has(productModuleItemId) ?? false

      queryClient.setQueryData<Set<number>>(
        ["coached-course-progress", userId, enrollmentProductId],
        (prev) =>
          prev
            ? new Set([...prev, productModuleItemId])
            : new Set([productModuleItemId])
      )

      if (!wasAlreadyComplete) {
        queryClient.setQueryData<CoachedProduct[]>(["coached", userId], (prev) => {
          if (!prev) return prev
          return prev.map((p) => {
            if (p.enrollment_product_id !== enrollmentProductId) return p
            return {
              ...p,
              completion_completed: (p.completion_completed ?? 0) + 1,
            }
          })
        })
      }

      void queryClient.invalidateQueries({ queryKey: ["coached", userId] })
    },
  })

  const course = courseQuery.data ?? null
  const progress = progressQuery.data ?? new Set<number>()
  const isLoading =
    courseQuery.isLoading || (!!courseQuery.data && progressQuery.isLoading)
  const orgMatches =
    course != null &&
    (orgSlug == null || course.organization_slug === orgSlug)

  const markComplete = (productModuleItemId: number) => {
    if (!enrollmentProductId) return
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
    if (activeItemId != null && allLessons.some((l) => l.item.id === activeItemId))
      return
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
  const lessonTitle = activeLessonTitle(currentLesson)

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
    return <LoadingRows count={5} />
  }

  if (!course || !orgMatches) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Course not found"
        description="You may not have access to this course."
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href="/courses">Back to courses</Link>
          </Button>
        }
      />
    )
  }

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < allLessons.length - 1

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Link
            href="/courses"
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {course.product_title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {course.organization_name}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 md:hidden"
              onClick={() => setContentsOpen(true)}
            >
              <List className="h-4 w-4" />
              Contents
            </Button>
          </div>
        </div>
        <CourseProgressBar
          completed={completedCount}
          total={totalLessons}
          compact
        />
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <CourseSidebar
          modules={course.product_modules}
          progress={progress}
          activeModuleId={activeModuleId}
          activeItemId={activeItemId}
          onSelectLesson={(moduleId, itemId) => {
            setActiveModuleId(moduleId)
            setActiveItemId(itemId)
          }}
          sheetOpen={contentsOpen}
          onSheetOpenChange={setContentsOpen}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {totalLessons === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No lessons yet"
              description="This course has no lessons configured."
            />
          ) : activeContent ? (
            <>
              {lessonTitle ? (
                <h2 className="text-sm font-semibold text-foreground">
                  {lessonTitle}
                </h2>
              ) : null}
              <ContentViewer
                content={activeContent}
                onVideoEnded={handleVideoEnded}
                className="w-full"
              />
              <LessonNav
                onPrevious={goToPrevious}
                onNext={goToNext}
                onMarkComplete={handleMarkComplete}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
                isCompleted={isCompleted}
                markCompletePending={markCompletePending}
              />
            </>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Select a lesson"
              description="Choose a lesson from the contents."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="md:hidden"
                  onClick={() => setContentsOpen(true)}
                >
                  <List className="h-4 w-4" />
                  Contents
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
