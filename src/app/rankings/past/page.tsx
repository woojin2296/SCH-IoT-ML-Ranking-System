import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { getDistinctUserYears } from "@/lib/services/scoreService";
import { projects } from "@/lib/projects";
import AppHero from "@/app/components/AppHero";
import { AppNoticesList } from "@/app/components/AppNoticesList";
import { RankingsBoard } from "@/app/RankingsBoard";
import AppNavigationClient from "@/app/components/AppNavigationClient";

type PastSearchParams = {
  project?: string | string[];
  year?: string | string[];
};

function pickSingle(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function PastRankingsPage({ searchParams }: { searchParams: Promise<PastSearchParams> }) {
  cleanupExpiredSessions();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const sessionUser = sessionToken ? getUserBySessionToken(sessionToken) : null;
  if (!sessionUser) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;

  const years = getDistinctUserYears();
  const currentYear = years[0] ?? new Date().getFullYear();
  const defaultPastYear = years[1] ?? currentYear - 1;

  const projectParam = pickSingle(resolvedParams.project);
  const projectFromParams = Number(projectParam);
  const activeProject =
    Number.isInteger(projectFromParams) && projectFromParams >= 1 && projectFromParams <= projects.length
      ? projectFromParams
      : 1;

  const yearParam = pickSingle(resolvedParams.year);
  const requestedYear = Number(yearParam);
  const pastYear = Number.isInteger(requestedYear) ? requestedYear : defaultPastYear;

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNavigationClient isAdmin={sessionUser.role === "admin"} pastYear={pastYear} />
      <AppNoticesList />
      <RankingsBoard
        sessionUserId={sessionUser.id}
        projects={projects.map((project) => ({ number: project.number, label: project.label }))}
        activeProject={activeProject}
        requestedYear={pastYear}
        excludeCurrentYear
        showMySummary={false}
      />
    </div>
  );
}
