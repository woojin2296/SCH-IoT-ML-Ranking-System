import { projects } from "@/lib/projects";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { RankingSummary } from "./RankingSummary";
import { RankingTable, type RankingTableRow } from "./RankingTable";
import { findRankingRowForUser, listRankingRows } from "@/lib/repositories/scoreRepository";

type RankingsBoardProps = {
  sessionUserId: number;
  activeProject: number;
};

export function RankingsBoard({ sessionUserId, activeProject }: RankingsBoardProps) {
  const rankingRecords = listRankingRows(activeProject);
  const rankings: RankingTableRow[] = rankingRecords.map((row) => ({
    id: row.id,
    userId: row.userId,
    publicId: row.publicId,
    position: row.position,
    score: row.score,
    createdAt: row.createdAt,
  }));

  const mySummary = findRankingRowForUser(activeProject, sessionUserId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">
          점수 랭킹 보드
        </h2>
        <ProjectSwitcher projects={projects} activeProject={activeProject} />
      </div>
      <RankingSummary myBestScore={mySummary} />
      <RankingTable rankings={rankings} sessionUserId={sessionUserId} />
    </div>
  );
}
