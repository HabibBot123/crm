import { CoachedSidebar } from "@/components/coached/coached-sidebar"
import { CoachedHeader } from "@/components/coached/coached-header"
import { CoachedBottomTabs } from "@/components/coached/coached-bottom-tabs"
import { CoachedAuthGate } from "@/components/coached/coached-auth-gate"

export default function CoachedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CoachedAuthGate>
      <div className="flex min-h-dvh bg-background">
        <CoachedSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <CoachedHeader />
          <main className="min-w-0 flex-1 overflow-x-hidden p-6 pb-24 lg:p-8">
            {children}
          </main>
          <CoachedBottomTabs />
        </div>
      </div>
    </CoachedAuthGate>
  )
}
