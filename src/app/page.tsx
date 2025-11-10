import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cleanupExpiredSessions, getUserBySessionToken } from "@/lib/services/sessionService";
import { getDistinctUserYears, getRankingRecords, getRankingSummaryForUser } from "@/lib/services/scoreService";
import type { RankingTableRow } from "./components/RankingTable";
import AppHero from "./components/AppHero";
import { AppNoticesList } from "./components/AppNoticesList";
import { RankingsBoard } from "./RankingsBoard";

const PROJECTS = [
  { number: 1, label: "프로젝트 1" },
  { number: 2, label: "프로젝트 2" },
  { number: 3, label: "프로젝트 3" },
  { number: 4, label: "프로젝트 4" },
] as const;

type HomeSearchParams = {
  project?: string | string[];
  year?: string | string[];
};

function pickSingle(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams = {},
}: {
  searchParams?: HomeSearchParams;
}) {
  cleanupExpiredSessions();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const sessionUser = sessionToken
    ? getUserBySessionToken(sessionToken)
    : null;

  if (!sessionUser) {
    redirect("/login");
  }

  const availableYears = getDistinctUserYears();
  const fallbackYear = availableYears[0] ?? new Date().getFullYear();
  const normalizedYears = availableYears.length ? availableYears : [fallbackYear];

  const projectParam = pickSingle(searchParams.project);
  const projectFromParams = Number(projectParam);
  const activeProject =
    Number.isInteger(projectFromParams) && projectFromParams >= 1 && projectFromParams <= PROJECTS.length
      ? projectFromParams
      : 1;

  const yearParam = pickSingle(searchParams.year);
  const requestedYear = Number(yearParam);
  const selectedYear =
    Number.isInteger(requestedYear) && normalizedYears.includes(requestedYear) ? requestedYear : normalizedYears[0];

  const rankingRecords = getRankingRecords(activeProject, selectedYear);
  const rankings: RankingTableRow[] = rankingRecords.map((row) => ({
    id: row.id,
    userId: row.userId,
    publicId: row.publicId,
    position: row.position,
    score: row.score,
  }));

  const mySummary = getRankingSummaryForUser(activeProject, selectedYear, sessionUser.id);
  const myBestScore = mySummary ? { score: mySummary.score, evaluatedAt: mySummary.evaluatedAt } : null;
  const myRank = mySummary?.rank ?? null;

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList />
      <RankingsBoard
        rankings={rankings}
        sessionUserId={sessionUser.id}
        projects={PROJECTS.map((project) => ({ number: project.number, label: project.label }))}
        activeProject={activeProject}
        selectedYear={selectedYear}
        availableYears={normalizedYears}
        myBestScore={myBestScore}
        myRank={myRank}
      />
    </div>
  );
}
