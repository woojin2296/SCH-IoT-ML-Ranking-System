import Link from "next/link";

import type { ProjectSwitcherProject } from "./components/ProjectSwitcher";
import { ProjectSwitcher } from "./components/ProjectSwitcher";
import { RankingSummary } from "./components/RankingSummary";
import { RankingTable, type RankingTableRow } from "./components/RankingTable";
import { YearSwitcher } from "./components/YearSwitcher";
import { getDistinctUserYears, getRankingRecords, getRankingSummaryForUser } from "@/lib/services/scoreService";

type RankingsBoardProps = {
  sessionUserId: number;
  projects: ProjectSwitcherProject[];
  activeProject: number;
  requestedYear?: number;
  excludeCurrentYear?: boolean;
  showMySummary?: boolean;
};

export function RankingsBoard({ sessionUserId, projects, activeProject, requestedYear, excludeCurrentYear, showMySummary = true }: RankingsBoardProps) {
  const availableYearsAll = getDistinctUserYears();
  const fallbackYearAll = availableYearsAll[0] ?? new Date().getFullYear();
  const yearsForView = excludeCurrentYear ? availableYearsAll.slice(1) : availableYearsAll;
  const normalizedYears = (yearsForView.length ? yearsForView : [fallbackYearAll - (excludeCurrentYear ? 1 : 0)]);
  const selectedYear =
    Number.isInteger(requestedYear) && normalizedYears.includes(requestedYear as number)
      ? (requestedYear as number)
      : normalizedYears[0];

  const rankingRecords = getRankingRecords(activeProject, selectedYear);
  const rankings: RankingTableRow[] = rankingRecords.map((row) => ({
    id: row.id,
    userId: row.userId,
    publicId: row.publicId,
    position: row.position,
    score: row.score,
  }));

  const mySummary = showMySummary ? getRankingSummaryForUser(activeProject, selectedYear, sessionUserId) : null;
  const myBestScore = showMySummary && mySummary ? { score: mySummary.score, evaluatedAt: mySummary.evaluatedAt } : null;
  const myRank = showMySummary ? mySummary?.rank ?? null : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">
          전체 등수 랭킹 보드{" "}
          <span className="text-sm font-normal text-neutral-500">
            ({selectedYear}년)
          </span>
        </h2>
        <ProjectSwitcher
          projects={projects}
          activeProject={activeProject}
          selectedYear={selectedYear}
        />
        <Link
          href="/my-results"
          className="inline-flex items-center justify-center rounded-md bg-[#265392] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#1f4275]"
        >
          내 결과 관리하기
        </Link>
      </div>
      {showMySummary ? (
        <RankingSummary selectedYear={selectedYear} myBestScore={myBestScore} myRank={myRank} />
      ) : null}
      <YearSwitcher
        availableYears={normalizedYears}
        activeProject={activeProject}
        selectedYear={selectedYear}
      />
      <RankingTable rankings={rankings} sessionUserId={sessionUserId} />
    </div>
  );
}
