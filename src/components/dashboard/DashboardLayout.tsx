import type { ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import DashboardSidebar from "@/components/dashboard/Sidebar"
import DashboardNavbar from "@/components/dashboard/Navbar"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardSidebar />

        <SidebarInset className="min-w-0">
          <DashboardNavbar />

          <main className="flex flex-1 flex-col gap-4 p-4">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}