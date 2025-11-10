import { AppSidebar } from "@/app/admin/components/app-sidebar"
import { SiteHeader } from "@/app/admin/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AdminUserPage } from "./AdminUserPage"
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "admin") redirect("/");
  
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="유저 관리" />
        <AdminUserPage />
      </SidebarInset>
    </SidebarProvider>
  )
}
