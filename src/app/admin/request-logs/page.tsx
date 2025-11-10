import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/app/admin/components/app-sidebar";
import { SiteHeader } from "@/app/admin/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AdminRequestLogsPage from "./AdminRequestLogsPage";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { countRequestLogsForAdmin, getRequestLogsForAdmin } from "@/lib/services/requestLogService";

const PAGE_SIZE = 25;

type SearchParams = {
  query?: string;
  page?: string;
};

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "admin") redirect("/");

  const resolvedParams = await searchParams;

  const query = normalizeQuery(resolvedParams?.query);
  const requestedPage = parsePage(resolvedParams?.page);

  const totalCount = countRequestLogsForAdmin(query);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const logs = getRequestLogsForAdmin({
    limit: PAGE_SIZE,
    offset,
    search: query,
  });

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="요청 로그" />
        <AdminRequestLogsPage
          logs={logs}
          query={query}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

function normalizeQuery(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePage(value?: string): number {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}
