"use client"

import { useState, use } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, FileText, BookOpen, ChevronDown, Lock, User } from "lucide-react"
import { products, coaches } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const lessonIcons = {
  video: PlayCircle,
  ebook: BookOpen,
  text: FileText,
}

export default function CoursePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const course = products.find((p) => p.id === id)
  const [selectedLesson, setSelectedLesson] = useState(course?.modules[0]?.lessons[0] || null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(course?.modules.flatMap((m) => m.lessons.filter((l) => l.completed).map((l) => l.id)) || [])
  )

  const coach = course ? coaches.find((c) => c.productIds.includes(course.id)) : null

  if (!course) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">Course not found</p>
        <Link href="/coaching/courses">
          <Button variant="outline" className="mt-4">Back to programs</Button>
        </Link>
      </div>
    )
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const completedCount = completedLessons.size
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const toggleComplete = (lessonId: string) => {
    setCompletedLessons((prev) => {
      const next = new Set(prev)
      if (next.has(lessonId)) {
        next.delete(lessonId)
      } else {
        next.add(lessonId)
      }
      return next
    })
  }

  const findNextLesson = () => {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!completedLessons.has(lesson.id)) {
          return lesson
        }
      }
    }
    return null
  }

  const currentModuleIndex = course.modules.findIndex((m) =>
    m.lessons.some((l) => l.id === selectedLesson?.id)
  )

  return (
    <div className="-mx-4 -mt-6 md:mx-0 md:mt-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:rounded-t-xl md:border">
        <Link href="/coaching/courses">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-1">{course.title}</p>
          {coach && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3" />
              with {coach.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="h-1 flex-1" />
            <span className="shrink-0 text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Content Area */}
        <div className="flex-1">
          {selectedLesson ? (
            <div className="p-4 lg:p-6">
              {/* Lesson content */}
              {selectedLesson.type === "video" && (
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-foreground/5">
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <PlayCircle className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{selectedLesson.title}</p>
                    {selectedLesson.duration && (
                      <p className="text-xs text-muted-foreground">Duration: {selectedLesson.duration}</p>
                    )}
                    <Button size="sm" className="mt-2 gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Play Video
                    </Button>
                  </div>
                </div>
              )}

              {selectedLesson.type === "ebook" && (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <BookOpen className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{selectedLesson.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This is a downloadable ebook resource. Click below to access it.
                  </p>
                  <Button className="mt-4 gap-2">
                    <BookOpen className="h-4 w-4" />
                    Open Ebook
                  </Button>
                </div>
              )}

              {selectedLesson.type === "text" && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-lg font-bold text-foreground">{selectedLesson.title}</h3>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      This is a text-based lesson that covers the key concepts and practical steps you need
                      to put into action. Take your time reading through this material and refer back to it
                      whenever needed.
                    </p>
                    <p>
                      Key takeaways from this lesson include building sustainable habits, understanding the
                      fundamentals, and developing a consistent practice routine.
                    </p>
                    <p>
                      Remember: progress is more important than perfection. Take it one step at a time and
                      celebrate your wins along the way.
                    </p>
                  </div>
                </div>
              )}

              {/* Lesson action bar */}
              <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <Button
                  variant={completedLessons.has(selectedLesson.id) ? "outline" : "default"}
                  size="sm"
                  className="gap-2"
                  onClick={() => toggleComplete(selectedLesson.id)}
                >
                  {completedLessons.has(selectedLesson.id) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4" />
                      Mark Complete
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    toggleComplete(selectedLesson.id)
                    const next = findNextLesson()
                    if (next) setSelectedLesson(next)
                  }}
                >
                  Next Lesson
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">Select a lesson to get started</p>
            </div>
          )}
        </div>

        {/* Module sidebar */}
        <div className={cn(
          "w-full border-t border-border bg-card lg:w-80 lg:border-l lg:border-t-0",
          !sidebarOpen && "hidden lg:block"
        )}>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Course Content</h3>
              <span className="text-xs text-muted-foreground">{completedCount}/{totalLessons} lessons</span>
            </div>

            <div className="space-y-2">
              {course.modules.map((mod, modIndex) => {
                const modCompleted = mod.lessons.filter((l) => completedLessons.has(l.id)).length
                const allDone = modCompleted === mod.lessons.length

                return (
                  <Collapsible key={mod.id} defaultOpen={modIndex === currentModuleIndex || modIndex === 0}>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg p-2.5 text-left transition-colors hover:bg-muted">
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        allDone
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {allDone ? <CheckCircle2 className="h-4 w-4" /> : modIndex + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{mod.title}</p>
                        <p className="text-[10px] text-muted-foreground">{modCompleted}/{mod.lessons.length} complete</p>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 space-y-0.5 border-l border-border pl-4 pt-1">
                        {mod.lessons.map((lesson) => {
                          const isSelected = selectedLesson?.id === lesson.id
                          const isCompleted = completedLessons.has(lesson.id)
                          const LessonIcon = lessonIcons[lesson.type]

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                              ) : (
                                <LessonIcon className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className="flex-1 line-clamp-1">{lesson.title}</span>
                              {lesson.duration && (
                                <span className="shrink-0 text-[10px] text-muted-foreground">{lesson.duration}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile toggle for course content */}
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-border bg-card p-2 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {sidebarOpen ? "Hide" : "Show"} Course Content ({completedCount}/{totalLessons})
        </Button>
      </div>
    </div>
  )
}
