import Link from "next/link";

import type { ProjectSwitcherProject } from "./ProjectSwitcher";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { RankingSummary } from "./RankingSummary";
import { RankingTable, type RankingTableRow } from "./RankingTable";
import { YearSwitcher } from "./YearSwitcher";

type RankingsBoardProps = {
  rankings: RankingTableRow[];
  sessionUserId: number;
  projects: ProjectSwitcherProject[];
  activeProject: number;
  selectedYear: number;
  availableYears: number[];
  myBestScore: { score: number; evaluatedAt: string } | null;
  myRank: number | null;
};

export function RankingsBoard({
  rankings,
  sessionUserId,
  projects,
  activeProject,
  selectedYear,
  availableYears,
  myBestScore,
  myRank,
}: RankingsBoardProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">
          전체 등수 랭킹 보드 <span className="text-sm font-normal text-neutral-500">({selectedYear}년)</span>
        </h2>
        <ProjectSwitcher projects={projects} activeProject={activeProject} selectedYear={selectedYear} />
        <Link
          href="/my-results"
          className="inline-flex items-center justify-center rounded-md bg-[#265392] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#1f4275]"
        >
          내 결과 관리하기
        </Link>
      </div>
      <RankingSummary selectedYear={selectedYear} myBestScore={myBestScore} myRank={myRank} />
      <YearSwitcher availableYears={availableYears} activeProject={activeProject} selectedYear={selectedYear} />
      <RankingTable rankings={rankings} sessionUserId={sessionUserId} />
    </div>
  );
}
