import { CoachedSidebar } from "@/components/coached/coached-sidebar"
import { CoachedHeader } from "@/components/coached/coached-header"
import { CoachedBottomTabs } from "@/components/coached/coached-bottom-tabs"
import { CoachedAuthGate } from "@/components/coached/coached-auth-gate"

export default function CoachedLayout({ children }: { children: React.ReactNode }) {
  return (
    <CoachedAuthGate>
      <div className="flex min-h-dvh bg-background">
        <CoachedSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <CoachedHeader />
          <main className="flex-1 min-w-0 overflow-x-hidden px-4 pb-24 pt-6 md:pb-8 lg:px-8 lg:pt-8 xl:px-10">
            {children}
          </main>
          <CoachedBottomTabs />
        </div>
      </div>
    </CoachedAuthGate>
  )
}
