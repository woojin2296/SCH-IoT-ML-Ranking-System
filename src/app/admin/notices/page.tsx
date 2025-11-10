import { AppSidebar } from "@/app/admin/components/app-sidebar";
import { SiteHeader } from "@/app/admin/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import AdminNoticesPage from "./AdminNoticesPage";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="공지 관리" />
        <AdminNoticesPage />
      </SidebarInset>
    </SidebarProvider>
  );
}

