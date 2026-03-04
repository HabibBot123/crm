import { CoachingHeader } from "@/components/coaching/coaching-header"
import { CoachingBottomTabs } from "@/components/coaching/coaching-bottom-tabs"

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <CoachingHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6 md:pb-8">
        {children}
      </main>
      <CoachingBottomTabs />
    </div>
  )
}
