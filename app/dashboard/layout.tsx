import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { OrganizationProvider } from "@/components/providers/organization-provider"
import { DashboardAccessGate } from "@/components/dashboard/dashboard-access-gate"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <DashboardAccessGate>
        <div className="flex min-h-screen overflow-x-hidden bg-background">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <main className="min-w-0 flex-1 overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </DashboardAccessGate>
    </OrganizationProvider>
  )
}
