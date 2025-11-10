import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/app/admin/components/app-sidebar";
import { SiteHeader } from "@/app/admin/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AdminScoresPage from "./AdminScoresPage";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { countScoreSubmissionsForAdmin, getScoreSubmissionsForAdmin } from "@/lib/services/scoreService";

const PAGE_SIZE = 20;

type SearchParams = {
  studentNumber?: string;
  page?: string;
};

export default async function Page({ searchParams }: { searchParams?: SearchParams }) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (!sessionToken) redirect("/login");
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  if (!sessionUser) redirect("/login");
  if (sessionUser.role !== "admin") redirect("/");

  const studentNumberFilter = normalizeStudentNumber(searchParams?.studentNumber);
  const requestedPage = parsePage(searchParams?.page);

  const totalCount = countScoreSubmissionsForAdmin(studentNumberFilter);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const submissions = getScoreSubmissionsForAdmin({
    studentNumber: studentNumberFilter,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="제출 점수 관리" />
        <AdminScoresPage
          records={submissions}
          studentNumber={studentNumberFilter}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

function normalizeStudentNumber(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePage(pageParam?: string): number {
  const parsed = pageParam ? Number.parseInt(pageParam, 10) : 1;
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}
