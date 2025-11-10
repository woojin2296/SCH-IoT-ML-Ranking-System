import { AppSidebar } from "@/app/admin/components/app-sidebar"
import { SiteHeader } from "@/app/admin/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AdminUserPage } from "./AdminUserPage"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="유저 관리"/>
        <AdminUserPage />
      </SidebarInset>
    </SidebarProvider>
  )
}
