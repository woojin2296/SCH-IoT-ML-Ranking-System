import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/app/admin/components/app-sidebar";
import { SiteHeader } from "@/app/admin/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AdminRankingsPage from "./AdminRankingsPage";
import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { getAdminRankingRecords, getDistinctUserYears } from "@/lib/services/scoreService";

type SearchParams = {
  project?: string;
  year?: string;
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

  const projectNumber = resolveProjectNumber(resolvedParams?.project);
  const distinctYears = getDistinctUserYears();
  let selectedYear = resolveYear(resolvedParams?.year, distinctYears[0]);
  if (typeof selectedYear !== "number") {
    selectedYear = new Date().getFullYear();
  }

  const yearSet = new Set(distinctYears);
  yearSet.add(selectedYear);
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  const rankings = getAdminRankingRecords(projectNumber, selectedYear);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="랭킹 관리" />
        <AdminRankingsPage
          projectNumber={projectNumber}
          selectedYear={selectedYear}
          availableYears={availableYears}
          records={rankings}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

function resolveProjectNumber(projectParam?: string): number {
  const parsed = projectParam ? Number.parseInt(projectParam, 10) : Number.NaN;
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 4) {
    return parsed;
  }
  return 1;
}

function resolveYear(yearParam: string | undefined, fallback?: number): number | undefined {
  if (yearParam && /^\d{4}$/.test(yearParam)) {
    const parsed = Number.parseInt(yearParam, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
