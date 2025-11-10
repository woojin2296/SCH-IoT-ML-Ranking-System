import AppHero from "@/app/components/AppHero";
import { AppNoticesList } from "@/app/components/AppNoticesList";
import { projects } from "@/lib/projects";
import type { RankingRecord } from "@/lib/services/scoreService";
import { RankingsBoard } from "@/app/components/RankingsBoard";
import type { RankingTableRow } from "@/app/components/RankingTable";

export type HomeNoticesProps = {
  notices: string[];
};

export type HomeRankingProps = {
  rankings: RankingRecord[];
  projectNumber: number;
  selectedYear: number;
  availableYears: number[];
  myBestScore: { score: number; evaluatedAt: string } | null;
  myRank: number | null;
};

export type HomeViewProps = {
  notices: string[];
  ranking: HomeRankingProps;
  sessionUserId: number;
};

export function HomeView({ notices, ranking, sessionUserId }: HomeViewProps) {
  const rankingTableRows: RankingTableRow[] = ranking.rankings.map(
    ({ id, userId, publicId, position, score }) => ({
      id,
      userId,
      publicId,
      position,
      score,
    }),
  );

  return (
    <div className="min-h-svh flex flex-col items-center gap-4 p-6 md:p-10">
      <AppHero />
      <AppNoticesList
        items={
          notices.length
            ? notices
            : ["현 시스템은 SCH 머신러닝 미니 프로젝트의 랭킹 확인을 위한 플랫폼입니다."]
        }
      />
      <RankingsBoard
        rankings={rankingTableRows}
        sessionUserId={sessionUserId}
        projects={projects}
        activeProject={ranking.projectNumber}
        selectedYear={ranking.selectedYear}
        availableYears={ranking.availableYears}
        myBestScore={ranking.myBestScore}
        myRank={ranking.myRank}
      />
    </div>
  );
}
